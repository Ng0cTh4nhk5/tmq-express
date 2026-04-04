import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';

// S-02: Whitelist of fields allowed for update
const ALLOWED_UPDATE_FIELDS = [
  'don_vi_gui', 'nguoi_gui', 'dien_thoai_gui', 'dia_chi_gui',
  'don_vi_nhan', 'nguoi_nhan', 'dien_thoai_nhan', 'dia_chi_nhan',
  'so_cccd', 'ten_hang_hoa', 'gia_tri_hang', 'trong_luong',
  'thu_ho', 'gia_cuoc', 'trang_thai_thu', 'can_xuat_hddt',
  'hinh_thuc_giao',
];

/**
 * Danh sách biên nhận (filter, search, pagination)
 */
export async function listBienNhan({ van_phong_id, role, search, trang_thai, vp_gui, vp_nhan, from, to, page = 1, limit = 20 }) {
  const where = {};

  // Staff: chỉ thấy BN liên quan đến VP mình
  if (role === 'staff' && van_phong_id) {
    where.OR = [
      { van_phong_gui_id: van_phong_id },
      { van_phong_nhan_id: van_phong_id },
    ];
  }

  // Filters
  if (trang_thai) where.trang_thai = trang_thai;
  if (vp_gui) where.van_phong_gui_id = Number(vp_gui);
  if (vp_nhan) where.van_phong_nhan_id = Number(vp_nhan);

  if (from || to) {
    where.ngay_nhan = {};
    if (from) where.ngay_nhan.gte = new Date(from);
    if (to) where.ngay_nhan.lte = new Date(to + 'T23:59:59.999Z');
  }

  if (search) {
    const searchOr = [
      { ma_so: { contains: search, mode: 'insensitive' } },
      { don_vi_gui: { contains: search, mode: 'insensitive' } },
      { don_vi_nhan: { contains: search, mode: 'insensitive' } },
      { nguoi_gui: { contains: search, mode: 'insensitive' } },
      { nguoi_nhan: { contains: search, mode: 'insensitive' } },
      { ten_hang_hoa: { contains: search, mode: 'insensitive' } },
    ];

    if (where.OR) {
      const staffFilter = where.OR;
      delete where.OR;
      where.AND = [
        { OR: staffFilter },
        { OR: searchOr },
      ];
    } else {
      where.OR = searchOr;
    }
  }

  const [data, total] = await Promise.all([
    prisma.bienNhan.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        van_phong_gui: { select: { ma_vp: true, ten: true } },
        van_phong_nhan: { select: { ma_vp: true, ten: true } },
        nhan_vien_nhap: { select: { ten: true } },
      },
    }),
    prisma.bienNhan.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/**
 * Chi tiết biên nhận
 */
export async function getBienNhan(id) {
  return prisma.bienNhan.findUnique({
    where: { id },
    include: {
      van_phong_gui: true,
      van_phong_nhan: true,
      nhan_vien_nhap: { select: { ten: true, ma_nv: true } },
      lich_su_trang_thai: {
        orderBy: { created_at: 'desc' },
        include: { nhan_vien: { select: { ten: true } } },
      },
    },
  });
}

/**
 * Lấy mã biên nhận tiếp theo (preview) — chỉ để hiển thị, không đảm bảo unique
 */
export async function getNextMaSo(vpGuiId, vpNhanId) {
  const vpGui = await prisma.vanPhong.findUnique({ where: { id: vpGuiId }, select: { ma_vp: true } });
  const vpNhan = await prisma.vanPhong.findUnique({ where: { id: vpNhanId }, select: { ma_vp: true } });
  if (!vpGui || !vpNhan) throw Object.assign(new Error('VP không tồn tại'), { statusCode: 400 });

  const prefix = `${vpGui.ma_vp}${vpNhan.ma_vp}`;
  const last = await prisma.bienNhan.findFirst({
    where: { ma_so: { startsWith: `${prefix}-` } },
    orderBy: { ma_so: 'desc' },
    select: { ma_so: true },
  });

  let nextNum = 1;
  if (last) {
    const num = parseInt(last.ma_so.split('-').pop(), 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Tự tạo KH nếu chưa tồn tại.
 */
async function autoCreateKhachHang(tx, tenDonVi, nguoiLienHe, dienThoai, diaChi, generateKHCode) {
  if (!tenDonVi?.trim() || !dienThoai?.trim()) return null;

  const normalizedDT = dienThoai.trim();
  const existing = await tx.khachHang.findFirst({
    where: { dien_thoai: normalizedDT },
  });
  if (existing) return null;

  const ma_kh = await generateKHCode();
  await tx.khachHang.create({
    data: {
      ma_kh,
      loai_kh: 'ca_nhan',
      ten_don_vi: tenDonVi.trim(),
      nguoi_lien_he: nguoiLienHe?.trim() || null,
      dien_thoai: normalizedDT,
      dia_chi: diaChi?.trim() || null,
    },
  });

  return { ma_kh, ten_don_vi: tenDonVi.trim() };
}

/**
 * Tạo biên nhận mới — B-02: dùng createWithCode pattern để tránh race condition
 */
export async function createBienNhan(data, userId) {
  const vpGui = await prisma.vanPhong.findUnique({ where: { id: data.van_phong_gui_id }, select: { ma_vp: true } });
  const vpNhan = await prisma.vanPhong.findUnique({ where: { id: data.van_phong_nhan_id }, select: { ma_vp: true } });
  if (!vpGui || !vpNhan) throw Object.assign(new Error('VP không tồn tại'), { statusCode: 400 });

  const prefix = `${vpGui.ma_vp}${vpNhan.ma_vp}`;

  // B-02: Use createWithCode to handle race condition with retry on unique violation
  const result = await createWithCode(
    async (ma_so) => {
      return prisma.$transaction(async (tx) => {
        const bn = await tx.bienNhan.create({
          data: {
            ma_so,
            van_phong_gui_id: data.van_phong_gui_id,
            van_phong_nhan_id: data.van_phong_nhan_id,
            don_vi_gui: data.don_vi_gui || null,
            nguoi_gui: data.nguoi_gui || null,
            dien_thoai_gui: data.dien_thoai_gui || null,
            dia_chi_gui: data.dia_chi_gui || null,
            don_vi_nhan: data.don_vi_nhan || null,
            nguoi_nhan: data.nguoi_nhan || null,
            dien_thoai_nhan: data.dien_thoai_nhan || null,
            dia_chi_nhan: data.dia_chi_nhan || null,
            so_cccd: data.so_cccd || null,
            ten_hang_hoa: data.ten_hang_hoa,
            nhan_vien_nhap_id: userId,
            gia_tri_hang: data.gia_tri_hang || null,
            trong_luong: data.trong_luong || null,
            thu_ho: data.thu_ho || 0,
            gia_cuoc: data.gia_cuoc || 0,
            trang_thai_thu: data.trang_thai_thu || 'da_thu',
            can_xuat_hddt: data.can_xuat_hddt || false,
            hinh_thuc_giao: data.hinh_thuc_giao || 'goi_dien',
          },
        });

        // Lịch sử trạng thái đầu tiên
        await tx.lichSuTrangThai.create({
          data: {
            bien_nhan_id: bn.id,
            trang_thai_moi: 'cho_vc',
            nhan_vien_id: userId,
            phuong_thuc: 'manual',
            ghi_chu: 'Tạo biên nhận mới',
          },
        });

        // Tự tạo công nợ nếu cần
        if (data.trang_thai_thu === 'cong_no') {
          await tx.congNo.create({
            data: {
              bien_nhan_id: bn.id,
              doi_tuong: data.don_vi_gui || data.nguoi_gui || 'N/A',
              so_tien_no: data.gia_cuoc || 0,
              trang_thai: 'chua_thu',
            },
          });
        }

        // Auto-create KH
        const autoCreated = [];
        try {
          // Simple code generator for KH within transaction
          const generateKHCode = async () => {
            const last = await tx.khachHang.findFirst({
              where: { ma_kh: { startsWith: 'KH-' } },
              orderBy: { ma_kh: 'desc' },
              select: { ma_kh: true },
            });
            let nextNum = 1;
            if (last) {
              const num = parseInt(last.ma_kh.split('-').pop(), 10);
              if (!isNaN(num)) nextNum = num + 1;
            }
            return `KH-${String(nextNum).padStart(4, '0')}`;
          };

          const khGui = await autoCreateKhachHang(
            tx, data.don_vi_gui, data.nguoi_gui, data.dien_thoai_gui, data.dia_chi_gui, generateKHCode,
          );
          if (khGui) autoCreated.push(khGui);

          const khNhan = await autoCreateKhachHang(
            tx, data.don_vi_nhan, data.nguoi_nhan, data.dien_thoai_nhan, data.dia_chi_nhan, generateKHCode,
          );
          if (khNhan) autoCreated.push(khNhan);
        } catch (err) {
          console.warn('[Auto-create KH]', err.message);
        }

        return { bn, autoCreated };
      });
    },
    'bienNhan', 'ma_so', prefix,
  );

  // Audit log: CREATE
  writeAuditLog({
    action: 'CREATE',
    entity: 'bien_nhan',
    entityId: result.bn.id,
    newData: result.bn,
  });

  return result;
}

/**
 * Cập nhật biên nhận
 * S-02: Whitelist fields (no blacklist spread)
 * S-07: Staff chỉ sửa trong 24h
 * Staff: chỉ sửa BN do mình tạo
 */
export async function updateBienNhan(id, data, userId, userRole) {
  const existing = await prisma.bienNhan.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });

  // Staff chỉ sửa BN mình tạo
  if (userRole === 'staff' && existing.nhan_vien_nhap_id !== userId) {
    throw Object.assign(new Error('Bạn chỉ được sửa biên nhận do mình tạo'), { statusCode: 403 });
  }

  // S-07: Staff chỉ sửa trong 24h
  if (userRole === 'staff') {
    const hoursSinceCreated = (Date.now() - new Date(existing.created_at).getTime()) / 3600000;
    if (hoursSinceCreated > 24) {
      throw Object.assign(
        new Error('Biên nhận đã quá 24 giờ. Liên hệ Admin để sửa.'),
        { statusCode: 403 },
      );
    }
  }

  // S-02: Whitelist — only pick allowed fields from request body
  const updateData = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  const updated = await prisma.bienNhan.update({ where: { id }, data: updateData });

  // Audit log: UPDATE
  writeAuditLog({
    action: 'UPDATE',
    entity: 'bien_nhan',
    entityId: id,
    oldData: existing,
    newData: updateData,
  });

  return updated;
}
