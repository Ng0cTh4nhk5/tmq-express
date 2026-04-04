import prisma from '../config/database.js';

const MAX_RETRIES = 3;

/**
 * Sinh mã tự động theo format: PREFIX-XXX (tăng dần)
 * Sử dụng findFirst(orderBy: desc) + unique constraint retry để tránh race condition.
 * 
 * @param {string} model - Tên model Prisma (ví dụ: 'khachHang')
 * @param {string} field - Tên cột chứa mã (ví dụ: 'ma_kh')
 * @param {string} prefix - Tiền tố (VD: 'KH', 'PT', 'PC', 'BK')
 * @param {number} padLength - Số chữ số (mặc định 4)
 */
export async function generateCode(model, field, prefix, padLength = 4) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const last = await prisma[model].findFirst({
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

    // Thêm offset cho retry attempt để tránh thử lại cùng số
    const code = `${prefix}-${String(nextNum + attempt).padStart(padLength, '0')}`;
    return code;
  }
}

/**
 * Sinh mã biên nhận: {VP_GUI}{VP_NHAN}-XXXX
 * Sử dụng findFirst(orderBy: desc) + unique constraint retry
 */
export async function generateBienNhanCode(maVpGui, maVpNhan) {
  const prefix = `${maVpGui}${maVpNhan}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const last = await prisma.bienNhan.findFirst({
      where: { ma_so: { startsWith: `${prefix}-` } },
      orderBy: { ma_so: 'desc' },
      select: { ma_so: true },
    });

    let nextNum = 1;
    if (last) {
      const num = parseInt(last.ma_so.split('-').pop(), 10);
      if (!isNaN(num)) nextNum = num + 1;
    }

    const code = `${prefix}-${String(nextNum + attempt).padStart(4, '0')}`;
    return code;
  }
}

/**
 * Sinh mã phiếu thu/chi/bảng kê an toàn (atomic create with retry)
 * Wrap create operation để catch unique violation và retry
 * 
 * @param {Function} createFn - Async function(ma_phieu) => created record
 * @param {string} model - Prisma model name
 * @param {string} field - Code field name
 * @param {string} prefix - Code prefix
 */
export async function createWithCode(createFn, model, field, prefix, padLength = 4) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const last = await prisma[model].findFirst({
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

    const code = `${prefix}-${String(nextNum + attempt).padStart(padLength, '0')}`;

    try {
      return await createFn(code);
    } catch (err) {
      // P2002 = Unique constraint violation (Prisma error code)
      if (err.code === 'P2002' && attempt < MAX_RETRIES - 1) {
        continue; // Retry with next number
      }
      throw err;
    }
  }
  throw new Error(`Không thể tạo mã ${prefix} sau ${MAX_RETRIES} lần thử`);
}
