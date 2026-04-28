import { requestContext } from './request-context.js';
import prisma from '../config/database.js';

/**
 * Fields to exclude from audit log data (sensitive/noise)
 */
const EXCLUDED_FIELDS = ['password_hash', 'token_version', 'failed_login_count', 'locked_until'];

function sanitize(data) {
  if (!data || typeof data !== 'object') return data;
  const clean = { ...data };
  for (const field of EXCLUDED_FIELDS) {
    delete clean[field];
  }
  return clean;
}

/**
 * Write an audit log entry.
 * Safe — never throws, never blocks the main operation.
 */
export async function writeAuditLog({ action, entity, entityId, oldData, newData }) {
  try {
    const ctx = requestContext.getStore();
    const userId = ctx?.userId;
    if (!userId) return; // No authenticated user = no audit (e.g., public endpoints)

    await prisma.auditLog.create({
      data: {
        nhan_vien_id: userId,
        action,
        entity,
        entity_id: entityId || null,
        old_data: oldData ? sanitize(oldData) : undefined,
        new_data: newData ? sanitize(newData) : undefined,
        ip_address: ctx?.ip || null,
        user_agent: ctx?.userAgent || null,
      },
    });
  } catch (err) {
    // Audit log failure must NEVER block business operations
    console.warn('[AuditLog] Failed to write:', err.message);
  }
}
