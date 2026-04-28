import prisma from '../config/database.js';

/**
 * Scan QR: trả thông tin tracking BN (công khai, không cần auth)
 * Chỉ trả dữ liệu cần thiết cho khách hàng tra cứu
 */
export default async function scanRoutes(fastify) {
  // GET /api/scan/:ma_so — Public endpoint cho QR scan
  fastify.get('/:ma_so', {
    config: {
      rateLimit: { max: 30, timeWindow: '1 minute' },
    },
    schema: {
      params: {
        type: 'object',
        required: ['ma_so'],
        properties: {
          ma_so: { type: 'string', maxLength: 30, minLength: 3 },
        },
      },
    },
    handler: async (request, reply) => {
      const bn = await prisma.bienNhan.findUnique({
        where: { ma_so: request.params.ma_so },
        select: {
          id: true,
          ma_so: true,
          ngay_bien_nhan: true,
          ten_hang_hoa: true,
          trang_thai: true,
          van_phong_gui: { select: { ma_vp: true, ten: true } },
          van_phong_nhan: { select: { ma_vp: true, ten: true } },
          lich_su_trang_thai: {
            orderBy: { created_at: 'desc' },
            take: 5,
            select: {
              trang_thai_moi: true,
              created_at: true,
              ghi_chu: true,
              // Không trả nhan_vien.ten — thông tin nội bộ
            },
          },
        },
      });

      if (!bn) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Không tìm thấy biên nhận' },
        });
      }

      // Tính trạng thái tiếp theo (tuần tự)
      const trangThaiOrder = ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'];
      const currentIdx = trangThaiOrder.indexOf(bn.trang_thai);
      const nextTrangThai = currentIdx < trangThaiOrder.length - 1 ? trangThaiOrder[currentIdx + 1] : null;

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
          next_trang_thai: nextTrangThai,
          lich_su: bn.lich_su_trang_thai,
        },
      };
    },
  });
}

