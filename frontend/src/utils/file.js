/**
 * Utility tải file — dùng chung toàn app.
 *
 * Import:
 *   import { downloadBase64File, downloadBlob } from '@/utils/file';
 */

// ─── MIME types hay dùng ──────────────────────────────────────────────────────
const MIME = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf:  'application/pdf',
  csv:  'text/csv',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Tạo và kích hoạt download một Blob, sau đó giải phóng object URL.
 * @param {Blob} blob
 * @param {string} filename  — tên file lưu về máy
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Giải phóng bộ nhớ sau 5 giây
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Download file từ chuỗi base64.
 *
 * Dùng cho các response API trả về file dạng { base64, name }.
 *
 * @param {string} base64     — nội dung file dạng base64
 * @param {string} filename   — tên file lưu về máy (VD: "bang-ke-2026-05.xlsx")
 * @param {string} [mimeType] — MIME type (tự detect theo extension nếu bỏ qua)
 *
 * @example
 * const { file } = res.data.data;
 * downloadBase64File(file.base64, file.name);
 */
export function downloadBase64File(base64, filename, mimeType) {
  // Tự detect MIME theo extension nếu không truyền
  if (!mimeType) {
    const ext = filename.split('.').pop()?.toLowerCase();
    mimeType = MIME[ext] || 'application/octet-stream';
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Tạo một object URL từ base64 để preview (VD: PDF trong tab mới).
 * Caller chịu trách nhiệm gọi URL.revokeObjectURL(url) khi xong.
 *
 * @param {string} base64
 * @param {string} mimeType — VD: 'application/pdf'
 * @returns {string} blobUrl
 *
 * @example
 * const url = createBlobUrl(res.data.base64, 'application/pdf');
 * window.open(url, '_blank');
 * setTimeout(() => URL.revokeObjectURL(url), 60000);
 */
export function createBlobUrl(base64, mimeType) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}
