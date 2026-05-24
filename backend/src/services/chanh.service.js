import prisma from '../config/database.js';
import { requestContext } from '../plugins/request-context.js';

// ── Audit Log helper ─────────────────────────────────────────────────────────
async function writeAuditLog({ action, entityId, oldData, newData }) {
  const ctx = requestContext.getStore();
  if (!ctx?.userId) return; // Không log nếu không có context (e.g. seed)
  await prisma.auditLog.create({
    data: {
      nhan_vien_id: ctx.userId,
      action,
      entity: 'chanh',
      entity_id: entityId ?? null,
      old_data: oldData ?? null,
      new_data: newData ?? null,
      ip_address: ctx.ip ?? null,
      user_agent: ctx.userAgent ?? null,
    },
  }).catch(() => {}); // Không block main flow nếu audit lỗi
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Trim các string field, trả null nếu rỗng sau trim */
function trimOrNull(val) {
  if (val === undefined || val === null) return null;
  const t = String(val).trim();
  return t.length > 0 ? t : null;
}

/**
 * Danh sách tất cả chành (không còn lọc theo VP — chành là độc lập)
 */
export async function getAllChanh({ active } = {}) {
  const where = {};
  if (active !== undefined) where.active = active;

  return prisma.chanh.findMany({
    where,
    orderBy: [{ ten: 'asc' }],
  });
}

/**
 * Xem chi tiết 1 chành
 */
export async function getChanhById(id) {
  const chanh = await prisma.chanh.findUnique({ where: { id } });
  if (!chanh) throw Object.assign(new Error('Không tìm thấy chành'), { statusCode: 404 });
  return chanh;
}

/**
 * Tạo chành mới
 */
export async function createChanh(data) {
  try {
    const chanh = await prisma.chanh.create({
      data: {
        ten: data.ten.trim(),
        dia_chi: trimOrNull(data.dia_chi),
        dien_thoai: trimOrNull(data.dien_thoai),
        nguoi_lien_he: trimOrNull(data.nguoi_lien_he),
        ghi_chu: trimOrNull(data.ghi_chu),
      },
    });

    // [Security] Ghi audit log
    await writeAuditLog({
      action: 'CREATE',
      entityId: chanh.id,
      newData: { ten: chanh.ten, dia_chi: chanh.dia_chi, dien_thoai: chanh.dien_thoai },
    });

    return chanh;
  } catch (err) {
    if (err.code === 'P2002') {
      throw Object.assign(
        new Error(`Tên chành "${data.ten.trim()}" đã tồn tại. Vui lòng chọn tên khác.`),
        { statusCode: 409 },
      );
    }
    throw err;
  }
}

/**
 * Cập nhật chành
 */
export async function updateChanh(id, data) {
  const existing = await prisma.chanh.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy chành'), { statusCode: 404 });

  const updateData = {};
  const stringFields = ['dia_chi', 'dien_thoai', 'nguoi_lien_he', 'ghi_chu'];

  if (data.ten !== undefined) updateData.ten = data.ten.trim();
  for (const key of stringFields) {
    if (data[key] !== undefined) updateData[key] = trimOrNull(data[key]);
  }

  try {
    const updated = await prisma.chanh.update({ where: { id }, data: updateData });

    // [Security] Ghi audit log
    await writeAuditLog({
      action: 'UPDATE',
      entityId: id,
      oldData: {
        ten: existing.ten,
        dia_chi: existing.dia_chi,
        dien_thoai: existing.dien_thoai,
        nguoi_lien_he: existing.nguoi_lien_he,
      },
      newData: updateData,
    });

    return updated;
  } catch (err) {
    if (err.code === 'P2002') {
      throw Object.assign(
        new Error(`Tên chành "${data.ten?.trim()}" đã tồn tại. Vui lòng chọn tên khác.`),
        { statusCode: 409 },
      );
    }
    throw err;
  }
}

/**
 * Bật/tắt trạng thái chành
 */
export async function toggleChanhActive(id, active) {
  const existing = await prisma.chanh.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy chành'), { statusCode: 404 });

  await prisma.chanh.update({ where: { id }, data: { active } });

  // [Security] Ghi audit log
  await writeAuditLog({
    action: 'UPDATE',
    entityId: id,
    oldData: { active: existing.active },
    newData: { active },
  });
}
