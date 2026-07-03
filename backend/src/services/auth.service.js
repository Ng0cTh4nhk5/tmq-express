import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';

const LOCK_THRESHOLD = 5;       // S-03: Lock after N failed attempts
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Xác thực user + trả thông tin profile
 * S-02: Login log
 * S-03: Account lock
 * S-05: Single session (increment token_version on success)
 */
export async function login(username, password, { ip, userAgent } = {}) {
  const user = await prisma.nhanVien.findUnique({
    where: { username },
    include: { van_phong: true },
  });

  // User not found or inactive
  if (!user || !user.active) {
    // S-02: Log failed attempt (unknown user or inactive)
    await prisma.loginLog.create({
      data: {
        nhan_vien_id: user?.id || null,
        username,
        action: 'login_failed',
        ip_address: ip || null,
        user_agent: userAgent || null,
      },
    }).catch(err => console.error('[LoginLog]', err.message));

    return null;
  }

  // S-03: Check account lock
  if (user.locked_until && user.locked_until > new Date()) {
    await prisma.loginLog.create({
      data: {
        nhan_vien_id: user.id,
        username,
        action: 'login_failed',
        ip_address: ip || null,
        user_agent: userAgent || null,
      },
    }).catch(err => console.error('[LoginLog]', err.message));

    return { error: 'ACCOUNT_LOCKED', locked_until: user.locked_until };
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    // S-03: Increment failed count, lock if threshold reached
    const newCount = (user.failed_login_count || 0) + 1;
    const lockData = { failed_login_count: newCount };
    if (newCount >= LOCK_THRESHOLD) {
      lockData.locked_until = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await prisma.nhanVien.update({ where: { id: user.id }, data: lockData });

    // S-02: Log failed attempt
    await prisma.loginLog.create({
      data: {
        nhan_vien_id: user.id,
        username,
        action: 'login_failed',
        ip_address: ip || null,
        user_agent: userAgent || null,
      },
    }).catch(err => console.error('[LoginLog]', err.message));

    return null;
  }

  // S-03: Reset failed count + S-05: Increment token_version for single session
  const updated = await prisma.nhanVien.update({
    where: { id: user.id },
    data: {
      failed_login_count: 0,
      locked_until: null,
      token_version: { increment: 1 },
    },
  });

  // S-02: Log successful login
  await prisma.loginLog.create({
    data: {
      nhan_vien_id: user.id,
      username,
      action: 'login_success',
      ip_address: ip || null,
      user_agent: userAgent || null,
    },
  }).catch(err => console.error('[LoginLog]', err.message));

  return formatUser({ ...user, token_version: updated.token_version });
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
 * Đổi mật khẩu — S-04: increment token_version to invalidate old tokens
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
    data: {
      password_hash,
      require_password_change: false,
      token_version: { increment: 1 }, // S-04: Force re-login
    },
  });
}

/**
 * [M-SEC-06] Đăng xuất — increment token_version để invalidate tất cả token cũ
 */
export async function logout(userId) {
  await prisma.nhanVien.update({
    where: { id: userId },
    data: { token_version: { increment: 1 } },
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
    token_version: user.token_version, // S-04: For JWT signing
  };
}
