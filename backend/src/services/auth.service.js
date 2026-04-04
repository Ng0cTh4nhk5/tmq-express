import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

/**
 * Xác thực user + trả thông tin profile
 */
export async function login(username, password) {
  const user = await prisma.nhanVien.findUnique({
    where: { username },
    include: { van_phong: true },
  });

  if (!user || !user.active) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  return formatUser(user);
}

/**
 * Lấy thông tin user hiện tại từ ID
 */
export async function getProfile(userId) {
  const user = await prisma.nhanVien.findUnique({
    where: { id: userId },
    include: { van_phong: true },
  });

  if (!user) return null;
  return formatUser(user);
}

/**
 * Đổi mật khẩu
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.nhanVien.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('Không tìm thấy người dùng'), { statusCode: 404 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw Object.assign(new Error('Mật khẩu hiện tại không đúng'), { statusCode: 400 });
  }

  const password_hash = await bcrypt.hash(newPassword, 10);
  await prisma.nhanVien.update({
    where: { id: userId },
    data: { password_hash, require_password_change: false },
  });
}

function formatUser(user) {
  return {
    id: user.id,
    ma_nv: user.ma_nv,
    ten: user.ten,
    role: user.role,
    van_phong: {
      id: user.van_phong.id,
      ma_vp: user.van_phong.ma_vp,
      ten: user.van_phong.ten,
    },
    require_password_change: user.require_password_change,
  };
}
