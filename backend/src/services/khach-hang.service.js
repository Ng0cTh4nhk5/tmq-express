import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';

export async function listKhachHang({ search, active, loai_kh, page = 1, limit = 20 }) {
  const p = parseInt(page, 10) || 1;
  // [M-01 FIX] Cap limit tối đa 500 để tránh dump toàn bộ KH
  const l = Math.min(parseInt(limit, 10) || 20, 500);
  const where = {};
  if (active !== undefined) where.active = active;
  if (loai_kh) where.loai_kh = loai_kh;
  if (search) {
    where.OR = [
      { ten_don_vi: { contains: search, mode: 'insensitive' } },
      { nguoi_lien_he: { contains: search, mode: 'insensitive' } },
      { dien_thoai: { contains: search } },
      { ma_kh: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.khachHang.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { created_at: 'desc' },
    }),
    prisma.khachHang.count({ where }),
  ]);

  return { data, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

export async function autocompleteKhachHang(q) {
  if (!q || q.length < 2) return [];
  return prisma.khachHang.findMany({
    where: {
      active: true,
      OR: [
        { ten_don_vi: { contains: q, mode: 'insensitive' } },
        { nguoi_lien_he: { contains: q, mode: 'insensitive' } },
        { dien_thoai: { contains: q } },
      ],
    },
    select: {
      id: true,
      ten_don_vi: true,
      nguoi_lien_he: true,
      dien_thoai: true,
      so_cccd: true,
      dia_chi: true,
    },
    take: 5,
  });
}

export async function getKhachHang(id) {
  return prisma.khachHang.findUnique({ where: { id } });
}

export async function createKhachHang(data) {
  // [H-01 FIX] Dùng createWithCode thay vì generateCode để đảm bảo atomic:
  // generateCode() là read-then-write không có transaction → race condition khi 2 request cùng lúc.
  // createWithCode() retry on P2002 unique violation → an toàn khi concurrent.
  const created = await createWithCode(
    (ma_kh) => prisma.khachHang.create({ data: { ...data, ma_kh } }),
    'khachHang', 'ma_kh', 'KH',
  );
  // M-01: Audit log
  void writeAuditLog({ action: 'CREATE', entity: 'khach_hang', entityId: created.id, newData: { ma_kh: created.ma_kh, ten_don_vi: data.ten_don_vi } });
  return created;
}

export async function updateKhachHang(id, data) {
  const { ma_kh, ...updateData } = data;
  const updated = await prisma.khachHang.update({ where: { id }, data: updateData });
  // M-01: Audit log
  void writeAuditLog({ action: 'UPDATE', entity: 'khach_hang', entityId: id, newData: updateData });
  return updated;
}

export async function toggleKhachHangActive(id, active) {
  const updated = await prisma.khachHang.update({ where: { id }, data: { active } });
  // M-01: Audit log
  void writeAuditLog({ action: 'UPDATE', entity: 'khach_hang', entityId: id, newData: { active } });
  return updated;
}
