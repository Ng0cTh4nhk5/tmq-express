import prisma from '../config/database.js';
import { generateCode } from '../utils/ma-so-generator.js';

export async function listKhachHang({ search, active, page = 1, limit = 20 }) {
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 20;
  const where = {};
  if (active !== undefined) where.active = active;
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
  const ma_kh = await generateCode('khachHang', 'ma_kh', 'KH');
  return prisma.khachHang.create({ data: { ...data, ma_kh } });
}

export async function updateKhachHang(id, data) {
  const { ma_kh, ...updateData } = data;
  return prisma.khachHang.update({ where: { id }, data: updateData });
}

export async function toggleKhachHangActive(id, active) {
  return prisma.khachHang.update({ where: { id }, data: { active } });
}
