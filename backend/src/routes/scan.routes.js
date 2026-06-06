import prisma from '../config/database.js';

/**
 * Scan QR: trả thông tin tracking BN (công khai, không cần auth)
 * Chỉ trả dữ liệu cần thiết cho khách hàng tra cứu
 *
 * Fix 3.0: Route giờ xử lý 2 trường hợp:
 *   - token là số nguyên  → lookup by id (QR code mới in từ PDF)
 *   - token là chuỗi     → fallback findFirst by ma_so (nhập tay từ ScanHomeView)
 *
 * Lý do: ma_so không unique độc lập; @@unique([ma_so, ngay_bien_nhan]) nên cùng
 * ma_so có thể tồn tại nhiều ngày. Chỉ id (PK) mới định danh duy nhất tuyệt đối.
 */
export default async function scanRoutes(fastify) {
  // GET /api/scan/:token — Public endpoint cho QR scan và nhập tay
  fastify.get('/:token', {
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
    schema: {
      params: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', maxLength: 30, minLength: 1 },
        },
      },
    },
    handler: async (request, reply) => {
      const token = request.params.token;
      const isNumericId = /^\d+$/.test(token);

      let bn;
      if (isNumericId) {
        // QR code mới: token là id (primary key) — tra cứu chính xác tuyệt đối
        bn = await prisma.bienNhan.findUnique({
          where: { id: Number(token) },
          select: {
            id: true,
            ma_so: true,
            ngay_bien_nhan: true,
            ten_hang_hoa: true,
            trang_thai: true,
            hinh_thuc_giao: true,
            chanh_id: true,
            van_phong_gui: { select: { ma_vp: true, ten: true } },
            van_phong_nhan: { select: { ma_vp: true, ten: true } },
            chanh: { select: { id: true, ten: true, dien_thoai: true, dia_chi: true, nguoi_lien_he: true } },
            lich_su_trang_thai: {
              orderBy: { created_at: 'desc' },
              take: 10,
              select: {
                trang_thai_moi: true,
                created_at: true,
                ghi_chu: true,
                // Không trả nhan_vien.ten — thông tin nội bộ
              },
            },
          },
        });
      } else {
        // Nhập tay từ ScanHomeView: token là ma_so — fallback findFirst lấy BN mới nhất
        // (Chấp nhận ambiguity khi có trùng mã, đây là best-effort cho trường hợp nhập tay)
        bn = await prisma.bienNhan.findFirst({
          where: { ma_so: token },
          orderBy: { ngay_bien_nhan: 'desc' },
          select: {
            id: true,
            ma_so: true,
            ngay_bien_nhan: true,
            ten_hang_hoa: true,
            trang_thai: true,
            hinh_thuc_giao: true,
            chanh_id: true,
            van_phong_gui: { select: { ma_vp: true, ten: true } },
            van_phong_nhan: { select: { ma_vp: true, ten: true } },
            chanh: { select: { id: true, ten: true, dien_thoai: true, dia_chi: true, nguoi_lien_he: true } },
            lich_su_trang_thai: {
              orderBy: { created_at: 'desc' },
              take: 10,
              select: {
                trang_thai_moi: true,
                created_at: true,
                ghi_chu: true,
              },
            },
          },
        });
      }

      if (!bn) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Không tìm thấy biên nhận' },
        });
      }

      // Tính trạng thái tiếp theo — dựa trên context (chanh / hinh_thuc_giao)
      const isTerminal = ['khach_da_nhan', 'da_giao_chanh'].includes(bn.trang_thai);
      let nextTrangThai = null;

      if (!isTerminal) {
        if (bn.trang_thai === 'da_den_kho') {
          // Phân nhánh tại da_den_kho
          if (bn.chanh_id) {
            nextTrangThai = 'da_giao_chanh';
          } else if (bn.hinh_thuc_giao === 'tu_toi') {
            nextTrangThai = 'khach_da_nhan';
          } else if (bn.hinh_thuc_giao === 'tan_noi') {
            nextTrangThai = 'dang_giao';
          } else {
            nextTrangThai = 'da_bao_khach'; // goi_dien (default)
          }
        } else {
          // Các bước khác: tuyến tính
          const linearOrder = {
            cho_vc: 'dang_vc',
            dang_vc: 'da_den_kho',
            da_bao_khach: 'khach_da_nhan',
            dang_giao: 'khach_da_nhan',
          };
          nextTrangThai = linearOrder[bn.trang_thai] || null;
        }
      }

      return {
        success: true,
        data: {
          id: bn.id,
          ma_so: bn.ma_so,
          ngay_bien_nhan: bn.ngay_bien_nhan,
          van_phong_gui: bn.van_phong_gui,
          van_phong_nhan: bn.van_phong_nhan,
          ten_hang_hoa: bn.ten_hang_hoa,
          trang_thai: bn.trang_thai,
          hinh_thuc_giao: bn.hinh_thuc_giao,
          chanh: bn.chanh || null,   // Thông tin chành để khách liên hệ
          next_trang_thai: nextTrangThai,
          lich_su: bn.lich_su_trang_thai,
        },
      };
    },
  });
}
