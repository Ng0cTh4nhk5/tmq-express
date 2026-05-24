/**
 * Shared formatting utilities — dùng chung toàn app.
 *
 * Import:
 *   import { formatCurrency, formatDate, toISODate, parseDateSafe, ... } from '@/utils/format';
 */

// ─── Tiền tệ ─────────────────────────────────────────────────────────────────

/**
 * Format số tiền VND có hậu tố "đ".
 * @param {number|string|null} val
 * @returns {string}  VD: "150,000đ" | "—" nếu null/undefined/NaN
 */
export function formatCurrency(val) {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return '—';
  return num.toLocaleString('vi-VN') + 'đ';
}

/**
 * Format số thuần (không hậu tố), dùng cho cột bảng, trọng lượng, v.v.
 * @param {number|string|null} val
 * @returns {string}  VD: "1,500" | "0"
 */
export function formatNumber(val) {
  if (val == null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
}

/**
 * Tính giá trước thuế từ giá sau thuế.
 * @param {number|string} val  — giá sau thuế
 * @param {number} rate        — thuế suất (mặc định 8% = 0.08)
 * @returns {number}
 */
export function truocThue(val, rate = 0.08) {
  return Math.round(Number(val || 0) / (1 + rate));
}

// ─── Ngày / giờ ──────────────────────────────────────────────────────────────

/**
 * Parse ngày an toàn, tránh UTC timezone shift.
 *
 * Vấn đề gốc: new Date("2026-05-07") parse UTC midnight → tại VN (UTC+7) trả về
 * "2026-05-06T17:00:00" → hiển thị sai ngày.
 *
 * Hàm này:
 *   - Nếu dateStr có phần giờ (ISO 8601 datetime) → dùng new Date() bình thường
 *   - Nếu chỉ là "YYYY-MM-DD" → parse theo local time
 *
 * @param {string|Date|null} dateStr
 * @returns {Date}
 */
export function parseDateSafe(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const s = String(dateStr);
  // Nếu có phần giờ → đã là ISO datetime, parse bình thường
  if (s.includes('T') || s.includes(' ')) return new Date(s);
  // Chỉ là YYYY-MM-DD → parse local để tránh lệch ngày
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Chuyển Date object → chuỗi "YYYY-MM-DD" theo local time.
 * Dùng khi gửi lên server hoặc build query params.
 *
 * @param {Date|string|null} date
 * @returns {string}  VD: "2026-05-21"
 */
export function toISODate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : parseDateSafe(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format ngày theo locale VN: "dd/MM/yyyy".
 * @param {string|Date|null} dt
 * @returns {string}  VD: "21/05/2026" | "—" nếu rỗng
 */
export function formatDate(dt) {
  if (!dt) return '—';
  return parseDateSafe(dt).toLocaleDateString('vi-VN');
}

/**
 * Format ngày và giờ đầy đủ theo locale VN: "dd/MM/yyyy HH:mm".
 * @param {string|Date|null} dt
 * @returns {string}  VD: "21/05/2026 10:30" | "" nếu rỗng
 */
export function formatDateTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('vi-VN');
}

// ─── Số điện thoại ────────────────────────────────────────────────────────────

/**
 * Re-export formatPhone từ utils/phone để có thể import một chỗ duy nhất.
 * @example import { formatPhone } from '@/utils/format';
 */
export { formatPhone } from './phone.js';

// ─── Tiền tệ bổ sung ──────────────────────────────────────────────────────────

/**
 * Format tiền gọn cho stat card / summary footer.
 * Tự động rút gọn số lớn:
 *   ≥ 1.000.000 → "1.5Mđ"
 *   ≥ 1.000     → "250Kđ"
 *   < 1.000     → "900đ"
 *
 * @param {number|string|null} val
 * @returns {string}
 *
 * @example
 * formatMoney(1_500_000) // "1.5Mđ"
 * formatMoney(250_000)   // "250Kđ"
 */
export function formatMoney(val) {
  const n = Number(val || 0);
  if (n >= 1_000_000) {
    return (n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + 'Mđ';
  }
  if (n >= 1_000) {
    return (n / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + 'Kđ';
  }
  return n.toLocaleString('vi-VN') + 'đ';
}

/**
 * Format số tiền VND không có hậu tố "đ".
 * Dùng cho cột bảng khi header đã ghi đơn vị (VD: "Cước (đ)").
 *
 * @param {number|string|null} val
 * @returns {string}  VD: "150,000" | "—" nếu null
 *
 * @example
 * formatCurrencyPlain(150000) // "150.000"
 */
export function formatCurrencyPlain(val) {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return '—';
  return num.toLocaleString('vi-VN');
}
