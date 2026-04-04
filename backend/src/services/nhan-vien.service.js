import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function listNhanVien({ van_phong_id, active, page = 1, limit = 20 }) {
  const where = {};
  if (van_phong_id) where.van_phong_id = Number(van_phong_id);
  if (active !== undefined) where.active = active === 'true';

  const [data, total] = await Promise.all([
    prisma.nhanVien.findMany({
      where,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
      select: {
        id: true, ma_nv: true, ten: true, username: true,
        role: true, active: true, created_at: true,
        van_phong: { select: { id: true, ma_vp: true, ten: true } },
      },
    }),
    prisma.nhanVien.count({ where }),
  ]);
  return { data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } };
}

export async function createNhanVien(data) {
  const exists = await prisma.nhanVien.findFirst({
    where: { OR: [{ username: data.username }, { ma_nv: data.ma_nv }] },
  });
  if (exists) {
    throw Object.assign(new Error('Mã NV hoặc Username đã tồn tại'), { statusCode: 409 });
  }
  const password_hash = await bcrypt.hash(data.password, 10);
  return prisma.nhanVien.create({
    data: {
      ma_nv: data.ma_nv,
      ten: data.ten,
      username: data.username,
      password_hash,
      role: data.role || 'staff',
      van_phong_id: data.van_phong_id,
      require_password_change: true,
    },
    select: { id: true, ma_nv: true, ten: true, username: true, role: true },
  });
}

export async function updateNhanVien(id, data) {
  return prisma.nhanVien.update({
    where: { id },
    data: {
      ten: data.ten,
      role: data.role,
      van_phong_id: data.van_phong_id,
    },
    select: { id: true, ma_nv: true, ten: true, username: true, role: true },
  });
}

export async function toggleActive(id, active) {
  return prisma.nhanVien.update({
    where: { id },
    data: { active },
  });
}

export async function resetPassword(id) {
  // Sinh mật khẩu tạm ngẫu nhiên thay vì hardcoded
  const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars hex
  const password_hash = await bcrypt.hash(tempPassword, 10);
  await prisma.nhanVien.update({
    where: { id },
    data: { password_hash, require_password_change: true },
  });
  return { tempPassword };
}

