import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';

export async function listPhieuChi({ page = 1, limit = 20, from, to, van_phong_id, search }) {
  const where = { da_huy: false };
  if (van_phong_id) where.van_phong_id = Number(van_phong_id);
  if (from || to) {
    where.ngay_chi = {};
    if (from) where.ngay_chi.gte = new Date(from);
    if (to) where.ngay_chi.lte = new Date(to + 'T23:59:59');
  }
  if (search) {
    where.OR = [
      { ma_phieu: { contains: search, mode: 'insensitive' } },
      { nguoi_nhan: { contains: search, mode: 'insensitive' } },
      { ly_do: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.phieuChi.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { ngay_chi: 'desc' },
      include: { nhan_vien: { select: { ten: true } } },
    }),
    prisma.phieuChi.count({ where }),
  ]);
  return { data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } };
}

export async function createPhieuChi(data, user) {
  // Sử dụng createWithCode để tránh race condition
  return createWithCode(
    (ma_phieu) => prisma.phieuChi.create({
      data: {
        ma_phieu,
        nguoi_nhan: data.nguoi_nhan,
        ly_do: data.ly_do,
        so_tien: data.so_tien,
        hinh_thuc: data.hinh_thuc || 'tien_mat',
        van_phong_id: user.van_phong_id,
        nhan_vien_id: user.id,
      },
    }),
    'phieuChi', 'ma_phieu', 'PC',
  );
}

export async function updatePhieuChi(id, data, user) {
  const pc = await prisma.phieuChi.findUnique({ where: { id } });
  if (!pc) throw Object.assign(new Error('Không tìm thấy phiếu chi'), { statusCode: 404 });
  if (user.role !== 'admin' && pc.nhan_vien_id !== user.id) {
    throw Object.assign(new Error('Chỉ sửa phiếu do mình tạo'), { statusCode: 403 });
  }

  return prisma.phieuChi.update({
    where: { id },
    data: {
      nguoi_nhan: data.nguoi_nhan,
      ly_do: data.ly_do,
      so_tien: data.so_tien,
      hinh_thuc: data.hinh_thuc,
    },
  });
}

export async function huyPhieuChi(id) {
  return prisma.phieuChi.update({ where: { id }, data: { da_huy: true } });
}
