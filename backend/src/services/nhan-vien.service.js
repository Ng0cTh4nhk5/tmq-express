import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { requestContext } from '../plugins/request-context.js';

// ── Audit Log helper ────────────────────────────────────────────────────────
async function writeAuditLog({ action, entityId, oldData, newData }) {
  const ctx = requestContext.getStore();
  if (!ctx?.userId) return; // Không log nếu không có context (e.g. seed)
  await prisma.auditLog.create({
    data: {
      nhan_vien_id: ctx.userId,
      action,
      entity: 'nhan_vien',
      entity_id: entityId ?? null,
      old_data: oldData ?? null,
      new_data: newData ?? null,
      ip_address: ctx.ip ?? null,
      user_agent: ctx.userAgent ?? null,
    },
  }).catch(() => {}); // Không block main flow nếu audit lỗi
}

// ── List ────────────────────────────────────────────────────────────────────
export async function listNhanVien({ van_phong_id, active, page = 1, limit = 20 }) {
  const p = parseInt(page, 10) || 1;
  // [SVC-03] Cap limit để tránh load quá nhiều record
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const where = {};
  if (van_phong_id) where.van_phong_id = Number(van_phong_id);
  if (active !== undefined) where.active = active === 'true';

  const [data, total] = await Promise.all([
    prisma.nhanVien.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { created_at: 'desc' },
      select: {
        id: true, ma_nv: true, ten: true, username: true,
        role: true, active: true, created_at: true, updated_at: true,
        van_phong: { select: { id: true, ma_vp: true, ten: true } },
      },
    }),
    prisma.nhanVien.count({ where }),
  ]);
  return { data, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

// ── Create ──────────────────────────────────────────────────────────────────
export async function createNhanVien(data) {
  const exists = await prisma.nhanVien.findFirst({
    where: { OR: [{ username: data.username }, { ma_nv: data.ma_nv }] },
  });
  if (exists) {
    throw Object.assign(new Error('Mã NV hoặc Username đã tồn tại'), { statusCode: 409 });
  }

  const password_hash = await bcrypt.hash(data.password, 10);
  const created = await prisma.nhanVien.create({
    data: {
      ma_nv: data.ma_nv,
      ten: data.ten,
      username: data.username,
      password_hash,
      role: data.role || 'staff',
      van_phong_id: data.van_phong_id,
      // [SVC-01] Đọc giá trị từ client, fallback true nếu không truyền
      require_password_change: data.require_password_change ?? true,
    },
    select: { id: true, ma_nv: true, ten: true, username: true, role: true },
  });

  // [Security] Ghi audit log
  await writeAuditLog({
    action: 'CREATE',
    entityId: created.id,
    newData: { ma_nv: created.ma_nv, ten: created.ten, username: created.username, role: created.role },
  });

  return created;
}

// ── Update ──────────────────────────────────────────────────────────────────
export async function updateNhanVien(id, data) {
  // [SVC-02] Lấy trước để audit oldData và bắt not-found sớm
  const existing = await prisma.nhanVien.findUnique({
    where: { id },
    select: { id: true, ten: true, role: true, van_phong_id: true },
  });
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy nhân viên'), { statusCode: 404 });
  }

  try {
    const updated = await prisma.nhanVien.update({
      where: { id },
      data: {
        ten: data.ten,
        role: data.role,
        van_phong_id: data.van_phong_id,
      },
      select: { id: true, ma_nv: true, ten: true, username: true, role: true },
    });

    // [Security] Ghi audit log
    await writeAuditLog({
      action: 'UPDATE',
      entityId: id,
      oldData: { ten: existing.ten, role: existing.role, van_phong_id: existing.van_phong_id },
      newData: { ten: data.ten, role: data.role, van_phong_id: data.van_phong_id },
    });

    return updated;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw Object.assign(new Error('Không tìm thấy nhân viên'), { statusCode: 404 });
    }
    throw e;
  }
}

// ── Toggle Active ────────────────────────────────────────────────────────────
// S-04: Increment token_version to force logout when deactivating
export async function toggleActive(id, active) {
  const existing = await prisma.nhanVien.findUnique({
    where: { id },
    select: { id: true, ten: true, active: true },
  });
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy nhân viên'), { statusCode: 404 });
  }

  const updateData = { active };
  if (!active) {
    updateData.token_version = { increment: 1 }; // Force logout
  }
  await prisma.nhanVien.update({ where: { id }, data: updateData });

  // [Security] Ghi audit log
  await writeAuditLog({
    action: 'UPDATE',
    entityId: id,
    oldData: { active: existing.active },
    newData: { active },
  });
}

// ── Reset Password ───────────────────────────────────────────────────────────
// S-04: Increment token_version on password reset to force re-login
export async function resetPassword(id) {
  const existing = await prisma.nhanVien.findUnique({
    where: { id },
    select: { id: true, ten: true },
  });
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy nhân viên'), { statusCode: 404 });
  }

  const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 chars hex
  const password_hash = await bcrypt.hash(tempPassword, 10);
  await prisma.nhanVien.update({
    where: { id },
    data: {
      password_hash,
      require_password_change: true,
      token_version: { increment: 1 }, // Force logout
    },
  });

  // [Security] Ghi audit log — KHÔNG log tempPassword vào audit
  await writeAuditLog({
    action: 'UPDATE',
    entityId: id,
    newData: { action: 'reset_password', require_password_change: true },
  });

  return { tempPassword };
}

// ── Unlock Account ───────────────────────────────────────────────────────────
// L-07: Mở khóa tài khoản bị lock do brute force — không reset token_version (user không cần login lại)
export async function unlockAccount(id) {
  const existing = await prisma.nhanVien.findUnique({
    where: { id },
    select: { id: true, ten: true, locked_until: true, failed_login_count: true },
  });
  if (!existing) {
    throw Object.assign(new Error('Không tìm thấy nhân viên'), { statusCode: 404 });
  }

  await prisma.nhanVien.update({
    where: { id },
    data: {
      failed_login_count: 0,
      locked_until: null,
    },
  });

  // [Security] Ghi audit log
  await writeAuditLog({
    action: 'UPDATE',
    entityId: id,
    oldData: { locked_until: existing.locked_until, failed_login_count: existing.failed_login_count },
    newData: { action: 'unlock_account', locked_until: null, failed_login_count: 0 },
  });
}
