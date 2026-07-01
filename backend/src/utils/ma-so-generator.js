import prisma from '../config/database.js';

const MAX_RETRIES = 10;

/**
 * Sinh mã tự động theo format: PREFIX-XXXX (tăng dần)
 * Không dùng trong flow create record — hãy dùng createWithCode thay thế để retry on collision.
 *
 * @param {string} model - Tên model Prisma (ví dụ: 'khachHang', 'bangKe')
 * @param {string} field - Tên cột chứa mã (ví dụ: 'ma_kh')
 * @param {string} prefix - Tiền tố (VD: 'KH', 'BK')
 * @param {number} padLength - Số chữ số (mặc định 4)
 * @param {object} [client] - Prisma client hoặc transaction client (mặc định: prisma gốc)
 */
export async function generateCode(model, field, prefix, padLength = 4, client = prisma) {
  const db = client || prisma;
  const last = await db[model].findFirst({
    where: { [field]: { startsWith: `${prefix}-` } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  });

  let nextNum = 1;
  if (last) {
    const parts = last[field].split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  return `${prefix}-${String(nextNum).padStart(padLength, '0')}`;
}

/**
 * Sinh mã phiếu thu/chi/bảng kê an toàn (atomic create with retry)
 * Wrap create operation để catch unique violation và retry
 * 
 * @param {Function} createFn - Async function(ma_phieu) => created record
 * @param {string} model - Prisma model name
 * @param {string} field - Code field name
 * @param {string} prefix - Code prefix
 * @param {number} [padLength=4] - Số chữ số
 * @param {object} [client] - Prisma client hoặc transaction client (mặc định: prisma gốc)
 */
export async function createWithCode(createFn, model, field, prefix, padLength = 4, client) {
  const db = client || prisma;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Re-query bên trong mỗi attempt — lấy số mới nhất để tránh stale count
    // khi có concurrent request cùng tạo code với prefix giống nhau
    const last = await db[model].findFirst({
      where: { [field]: { startsWith: `${prefix}-` } },
      orderBy: { [field]: 'desc' },
      select: { [field]: true },
    });

    let nextNum = 1;
    if (last) {
      const parts = last[field].split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) nextNum = num + 1;
    }

    // Dùng nextNum trực tiếp (không cộng attempt) vì đã re-query mỗi lần
    const code = `${prefix}-${String(nextNum).padStart(padLength, '0')}`;

    try {
      return await createFn(code);
    } catch (err) {
      // P2002 = Unique constraint violation (Prisma error code)
      if (err.code === 'P2002' && attempt < MAX_RETRIES - 1) {
        continue; // Retry — re-query sẽ lấy nextNum mới
      }
      throw err;
    }
  }
  throw new Error(`Không thể tạo mã ${prefix} sau ${MAX_RETRIES} lần thử`);
}
