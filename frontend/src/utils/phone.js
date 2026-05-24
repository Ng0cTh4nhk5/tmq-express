/**
 * Utility định dạng và xử lý số điện thoại Việt Nam.
 *
 * Quy tắc hiển thị:
 *  - 10 chữ số → XXXX XXX XXX  (4-3-3)  VD: 0909 123 456
 *  - 11 chữ số → XXXX XXX XXXX (4-3-4)  VD: 0909 123 4567
 *  - Khác       → trả nguyên giá trị
 *
 * Import:
 *   import { formatPhone, applyPhoneFormat, stripPhone, PHONE_REGEX } from '@/utils/phone';
 */

// ─── Regex ────────────────────────────────────────────────────────────────────

/**
 * Regex chuẩn SĐT Việt Nam 10 số.
 * Khớp: 03x, 05x, 07x, 08x, 09x, 02x (tổng đài cố định đầu 02).
 */
export const PHONE_REGEX = /^0[3-9]\d{8}$|^02\d{9}$/;

// ─── Format hiển thị ──────────────────────────────────────────────────────────

/**
 * Format SĐT hoàn chỉnh để hiển thị (chỉ dùng khi đã có số đầy đủ).
 * @param {string|number|null} value
 * @returns {string}  VD: "0909 123 456" | "—" nếu rỗng
 */
export function formatPhone(value) {
  if (!value) return '—';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return String(value); // Fallback
}

/**
 * Áp dụng format 4-3-3 theo kiểu partial (đang nhập dở).
 * Khác formatPhone: xử lý partial input khi user đang gõ từng chữ số.
 *
 * Ví dụ:
 *   ""         → ""
 *   "0909"     → "0909"
 *   "09091"    → "0909 1"
 *   "090912"   → "0909 12"
 *   "0909123"  → "0909 123"
 *   "09091234" → "0909 123 4"
 *   "0909123456" → "0909 123 456"
 *
 * @param {string|null} value
 * @returns {string}
 */
export function applyPhoneFormat(value) {
  if (!value) return '';
  const raw = String(value).replace(/\D/g, '').slice(0, 10);
  if (raw.length > 7) return `${raw.slice(0, 4)} ${raw.slice(4, 7)} ${raw.slice(7)}`;
  if (raw.length > 4) return `${raw.slice(0, 4)} ${raw.slice(4)}`;
  return raw;
}

// ─── Strip / normalize ───────────────────────────────────────────────────────

/**
 * Strip tất cả ký tự không phải số — dùng khi lưu vào DB / validate.
 * @param {string|null} value
 * @returns {string}  VD: "0909 123 456" → "0909123456"
 */
export function stripPhone(value) {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}
