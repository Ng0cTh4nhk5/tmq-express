import prisma from '../config/database.js';
import { writeAuditLog } from '../plugins/audit-log.js';

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────
export async function listDoanhNghiep({ search, active, page = 1, limit = 20 } = {}) {
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const where = {};
  if (active !== undefined) where.active = active === 'true' || active === true;
  if (search) {
    where.OR = [
      { ten: { contains: search, mode: 'insensitive' } },
      { ma_so_thue: { contains: search, mode: 'insensitive' } },
      { dien_thoai: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.doanhNghiep.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { ten: 'asc' },
      include: {
        _count: { select: { thanh_vien: true } },
      },
    }),
    prisma.doanhNghiep.count({ where }),
  ]);

  return { data, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCOMPLETE — dùng cho dropdown tìm kiếm nhanh
// ─────────────────────────────────────────────────────────────────────────────
export async function autocompleteDoanhNghiep(q) {
  if (!q || q.length < 1) return [];
  return prisma.doanhNghiep.findMany({
    where: {
      active: true,
      OR: [
        { ten: { contains: q, mode: 'insensitive' } },
        { ma_so_thue: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, ten: true, ma_so_thue: true, dien_thoai: true },
    take: 8,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET DETAIL — kèm danh sách thành viên
// ─────────────────────────────────────────────────────────────────────────────
export async function getDoanhNghiep(id) {
  const dn = await prisma.doanhNghiep.findUnique({
    where: { id },
    include: {
      thanh_vien: {
        select: {
          id: true, ma_kh: true, ten_don_vi: true, nguoi_lien_he: true,
          dien_thoai: true, loai_kh: true, active: true,
        },
        orderBy: { ten_don_vi: 'asc' },
      },
    },
  });
  if (!dn) throw Object.assign(new Error('Không tìm thấy doanh nghiệp'), { statusCode: 404 });
  return dn;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
export async function createDoanhNghiep(data) {
  const created = await prisma.doanhNghiep.create({
    data: {
      ten:        data.ten,
      ma_so_thue: data.ma_so_thue  || null,
      dia_chi:    data.dia_chi     || null,
      dien_thoai: data.dien_thoai  || null,
      ghi_chu:    data.ghi_chu     || null,
    },
  });
  writeAuditLog({ action: 'CREATE', entity: 'doanh_nghiep', entityId: created.id, newData: { ten: created.ten } });
  return created;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────
export async function updateDoanhNghiep(id, data) {
  const allowed = ['ten', 'ma_so_thue', 'dia_chi', 'dien_thoai', 'ghi_chu'];
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  );
  const updated = await prisma.doanhNghiep.update({ where: { id }, data: updateData });
  writeAuditLog({ action: 'UPDATE', entity: 'doanh_nghiep', entityId: id, newData: updateData });
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE ACTIVE
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleDoanhNghiepActive(id, active) {
  const updated = await prisma.doanhNghiep.update({ where: { id }, data: { active } });
  writeAuditLog({ action: 'UPDATE', entity: 'doanh_nghiep', entityId: id, newData: { active } });
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// THÊM THÀNH VIÊN — gán KhachHang vào DoanhNghiep
// ─────────────────────────────────────────────────────────────────────────────
export async function addThanhVien(doanhNghiepId, khachHangId) {
  // Validate tồn tại
  const [dn, kh] = await Promise.all([
    prisma.doanhNghiep.findUnique({ where: { id: doanhNghiepId } }),
    prisma.khachHang.findUnique({ where: { id: khachHangId } }),
  ]);
  if (!dn) throw Object.assign(new Error('Không tìm thấy doanh nghiệp'), { statusCode: 404 });
  if (!kh) throw Object.assign(new Error('Không tìm thấy khách hàng'), { statusCode: 404 });
  if (kh.doanh_nghiep_id && kh.doanh_nghiep_id !== doanhNghiepId) {
    throw Object.assign(
      new Error(`Khách hàng đã thuộc doanh nghiệp khác (ID: ${kh.doanh_nghiep_id})`),
      { statusCode: 409 }
    );
  }

  const updated = await prisma.khachHang.update({
    where: { id: khachHangId },
    data: { doanh_nghiep_id: doanhNghiepId },
  });
  writeAuditLog({ action: 'UPDATE', entity: 'khach_hang', entityId: khachHangId, newData: { doanh_nghiep_id: doanhNghiepId } });
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// XÓA THÀNH VIÊN — gỡ KhachHang khỏi DoanhNghiep
// ─────────────────────────────────────────────────────────────────────────────
export async function removeThanhVien(doanhNghiepId, khachHangId) {
  const kh = await prisma.khachHang.findUnique({ where: { id: khachHangId } });
  if (!kh) throw Object.assign(new Error('Không tìm thấy khách hàng'), { statusCode: 404 });
  if (kh.doanh_nghiep_id !== doanhNghiepId) {
    throw Object.assign(new Error('Khách hàng không thuộc doanh nghiệp này'), { statusCode: 400 });
  }

  const updated = await prisma.khachHang.update({
    where: { id: khachHangId },
    data: { doanh_nghiep_id: null },
  });
  writeAuditLog({ action: 'UPDATE', entity: 'khach_hang', entityId: khachHangId, newData: { doanh_nghiep_id: null } });
  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// TÓM TẮT CÔNG NỢ THEO DOANH NGHIỆP — dùng cho dashboard
// ─────────────────────────────────────────────────────────────────────────────
export async function tongHopCongNoDoanhNghiep(doanhNghiepId) {
  const [tong, chuaThu] = await Promise.all([
    prisma.congNo.aggregate({
      where: { doanh_nghiep_id: doanhNghiepId },
      _sum: { so_tien_no: true },
      _count: true,
    }),
    prisma.congNo.aggregate({
      where: { doanh_nghiep_id: doanhNghiepId, trang_thai: { in: ['chua_thu', 'qua_han'] } },
      _sum: { so_tien_no: true },
    }),
  ]);

  return {
    tong_no:    Number(tong._sum.so_tien_no || 0),
    so_phieu:   tong._count,
    con_no:     Number(chuaThu._sum.so_tien_no || 0),
  };
}
