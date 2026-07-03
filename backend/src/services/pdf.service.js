import PdfPrinter from 'pdfmake/src/printer.js';
import QRCode from 'qrcode';
import ExcelJS from 'exceljs';
import prisma from '../config/database.js';
import env from '../config/env.js';
import { parseStartOfDayVN, parseEndOfDayVN } from '../utils/date.js';
import { renderPDFInWorker } from '../utils/worker-pool.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fontsDir = join(__dirname, '../../fonts');
const logoPath = join(__dirname, '../assets/logo.jpg');

// ── Timezone helpers (UTC+7 Vietnam) ────────────────────────────────────────
// Sử dụng parseStartOfDayVN / parseEndOfDayVN từ utils/date.js
// Format YYYY-MM-DD → dd/mm/yyyy
function fmtDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Fonts for pdfmake
const fonts = {
  Roboto: {
    normal: join(fontsDir, 'Roboto-Regular.ttf'),
    bold: join(fontsDir, 'Roboto-Medium.ttf'),
    italics: join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
};

const printer = new PdfPrinter(fonts);

// Fix 2.4: Cache logo — đọc file một lần duy nhất khi module load, tránh blocking I/O mỗi lần in
let _logoDataUrl;
function getLogoDataUrl() {
  if (_logoDataUrl !== undefined) return _logoDataUrl;
  try {
    const buf = fs.readFileSync(logoPath);
    _logoDataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (_) {
    _logoDataUrl = null; // Logo không bắt buộc
  }
  return _logoDataUrl;
}



function fmtCurrency(val) {
  if (!val || Number(val) === 0) return '0';
  return Number(val).toLocaleString('vi-VN');
}

// Checkbox helper: X hoặc rỗng
function chk(condition) {
  return condition ? 'X' : ' ';
}

/**
 * S-08: Tạo watermark object cho PDF
 */
function makeWatermark(nhanVienTen) {
  if (!nhanVienTen) return undefined;
  return {
    text: `${nhanVienTen} — ${new Date().toLocaleString('vi-VN')}`,
    color: '#999999',
    opacity: 0.08,
    bold: true,
    italics: false,
    fontSize: 14,
    angle: -45,
  };
}

/**
 * Tạo PDF biên nhận — khổ A5 ngang, giống mẫu giấy thực tế TMQ Express
 * Layout: Logo + Header | Người gửi / Người nhận | Hàng hóa + Checkbox | Chữ ký
 */
export async function generateBienNhanPDF(bienNhanId, { nhan_vien_ten } = {}) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: {
      van_phong_gui: true,
      van_phong_nhan: true,
      nhan_vien_nhap: { select: { ten: true } },
      chanh: { select: { ten: true } },
    },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });

  // Fix 2.5: Dùng APP_PUBLIC_URL riêng cho QR — không dùng CORS_ORIGIN vốn là biến CORS config
  // Fix 3.0: Dùng bn.id thay vì bn.ma_so — ma_so không unique độc lập (@@unique([ma_so, ngay_bien_nhan]))
  // → cùng ma_so có thể xuất hiện nhiều ngày khác nhau, chỉ id mới đảm bảo định danh duy nhất tuyệt đối
  const qrUrl = `${env.APP_PUBLIC_URL}/scan/${bn.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 100, margin: 1 });

  // Fix 2.4: Dùng cached logo thay vì readFileSync mỗi lần
  const logoDataUrl = getLogoDataUrl();

  // Format date ngắn gọn để không bị rớt chữ
  const ngay = new Date(bn.ngay_bien_nhan);
  const ngayStr = `${String(ngay.getDate()).padStart(2, '0')}/${String(ngay.getMonth() + 1).padStart(2, '0')}/${ngay.getFullYear()}`;
  const gioStr = bn.gio_tao || ngay.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Hàng hóa
  const hangItems = Array.isArray(bn.hang_hoa_json)
    ? bn.hang_hoa_json.filter(i => Number(i.so_luong) > 0)
    : [];
  const hangStr = hangItems.length > 0
    ? hangItems.map(i => `${i.so_luong} ${i.don_vi}${i.ghi_chu ? ` (${i.ghi_chu})` : ''}`).join(', ')
    : (bn.ten_hang_hoa || '—');

  // Helper: label + value inline
  const row = (label, value, opts = {}) => ({
    text: [
      { text: label, fontSize: 8, color: '#444' },
      { text: value || '—', fontSize: 8.5, bold: true, color: '#111', ...opts },
    ],
    margin: [0, 0, 0, 2],
  });

  // Helper: hàng checkbox
  const chkRow = (label, checked, mb = 3) => ({
    columns: [
      {
        table: { widths: [12], body: [[{ text: chk(checked), fontSize: 8, alignment: 'center', margin: [0, 0, 0, 0] }]] },
        layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
        width: 16,
      },
      { text: label, fontSize: 9, margin: [3, 0, 0, 0] },
    ],
    margin: [0, 0, 0, mb],
  });

  const docDefinition = {
    pageSize: 'A5',
    pageOrientation: 'landscape',
    pageMargins: [14, 10, 14, 10],

    content: [
      // ══ HEADER: [Logo+Tên+Địa chỉ (trái)] | [QR code (phải)] ══
      {
        columns: [
          {
            // Cột trái: Logo căn giữa dọc với tên công ty, địa chỉ bên dưới
            width: '*',
            stack: [
              {
                // Dùng table 1 hàng để verticalAlignment: middle căn giữa logo và text
                table: {
                  widths: ['auto', '*'],
                  body: [[
                    logoDataUrl
                      ? { image: logoDataUrl, width: 104, height: 18.66, border: [false, false, false, false], margin: [0, 0, 3, 0] }
                      : { text: '', border: [false, false, false, false] },
                    {
                      border: [false, false, false, false],
                      verticalAlignment: 'middle',
                      text: 'CÔNG TY VẬN TẢI THIÊN MINH QUANG',
                      bold: true, fontSize: 14, color: '#1e40af',
                    },
                  ]],
                },
                layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 4 },
              },
              { text: 'ĐỊA CHỈ GỬI VÀ NHẬN HÀNG:', bold: true, decoration: 'underline', fontSize: 9, margin: [0, 0, 0, 1] },
              { text: '491 Lê Hồng Phong - P.Vườn Lài - TP.HCM - ĐT: (028) 383.338.79', fontSize: 8, color: '#222' },
              { text: '33 Hùng Vương - P. Ninh Kiều - TP.Cần Thơ - ĐT: (0292) 37.687.39', fontSize: 8, color: '#222' },
              { text: '39 Nguyễn Văn Trỗi - P.Rạch Giá - An Giang - ĐT: (0297) 39.622.26', fontSize: 8, color: '#222' },
            ],
          },
          {
            // Cột phải: QR code + dòng chữ mờ
            width: 60,
            stack: [
              { image: qrDataUrl, width: 55, alignment: 'center' },
              { text: 'Quét mã để xem\ntrạng thái đơn hàng', fontSize: 5.5, alignment: 'center', color: '#aaa', margin: [0, 2, 0, 0] },
            ],
            margin: [4, 0, 0, 0],
          },
        ],
      },

      // ══ DIVIDER (đường đỏ tưởng tượng) ══
      { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 580, y2: 3, lineWidth: 1 }], margin: [0, 4, 0, 4] },

      // ══ BIÊN NHẬN INFO ROW — nằm giữa đường đỏ và đường đen ══
      {
        columns: [
          {
            width: '28%',
            stack: [
              { text: 'BIÊN NHẬN HÀNG HÓA', bold: true, fontSize: 13, alignment: 'center' },
              { text: `${bn.van_phong_gui?.ten || ''} - ${bn.van_phong_nhan?.ten || ''}`, italics: true, bold: true, fontSize: 9, alignment: 'center', color: '#1e40af', margin: [0, 1, 0, 0] },
            ],
          },
          {
            width: '*',
            stack: [
              {
                table: {
                  widths: [40, '*'], body: [[
                    { text: 'Mã số:', fontSize: 9, border: [false, false, false, false], margin: [0, 1, 0, 0] },
                    { text: bn.ma_so, bold: true, fontSize: 11, alignment: 'right', border: [true, true, true, true] },
                  ]]
                },
                layout: { paddingLeft: () => 2, paddingRight: () => 4, paddingTop: () => 1, paddingBottom: () => 1 },
                margin: [0, 0, 0, 2],
              },
              {
                table: {
                  widths: [40, '*'], body: [[
                    { text: 'Giá cước:', fontSize: 9, border: [false, false, false, false], margin: [0, 1, 0, 0] },
                    { text: `${fmtCurrency(bn.gia_cuoc)} đ`, bold: true, fontSize: 11, alignment: 'right', border: [true, true, true, true] },
                  ]]
                },
                layout: { paddingLeft: () => 2, paddingRight: () => 4, paddingTop: () => 1, paddingBottom: () => 1 },
                margin: [0, 0, 0, 2],
              },
              { text: `Gởi lúc: ${gioStr} - ${ngayStr}`, fontSize: 8, color: '#444' },
            ],
            margin: [8, 0, 8, 0],
          },
          {
            width: 72,
            stack: [
              {
                table: {
                  widths: ['*', 13],
                  body: [
                    [{ text: 'Đã thu:', fontSize: 8.5, alignment: 'right', border: [false, false, false, false] }, { text: chk(bn.trang_thai_thu === 'da_thu'), fontSize: 8.5, alignment: 'center', border: [true, true, true, true] }],
                    [{ text: 'Chưa thu:', fontSize: 8.5, alignment: 'right', border: [false, false, false, false] }, { text: chk(bn.trang_thai_thu === 'chua_thu'), fontSize: 8.5, alignment: 'center', border: [true, true, true, true] }],
                    [{ text: 'Công nợ:', fontSize: 8.5, alignment: 'right', border: [false, false, false, false] }, { text: chk(bn.trang_thai_thu === 'cong_no'), fontSize: 8.5, alignment: 'center', border: [true, true, true, true] }],
                  ],
                },
                layout: { paddingLeft: () => 1, paddingRight: () => 1, paddingTop: () => 1, paddingBottom: () => 1 },
              },
              // [CuocNhan] Nhắc nhở thu cước từ người nhận khi chua_thu
              ...(bn.trang_thai_thu === 'chua_thu' ? [{
                text: 'Người nhận trả cước',
                fontSize: 7, bold: true, color: '#b45309',
                background: '#fef3c7',
                margin: [0, 3, 0, 0],
                alignment: 'center',
              }] : []),
            ],
          },
        ],
      },

      // ══ DIVIDER (đường đen tưởng tượng) ══
      { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 580, y2: 3, lineWidth: 0.8 }], margin: [0, 4, 0, 4] },

      // ══ NGƯỜI GỬI | NGƯỜI NHẬN ══
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'NGƯỜI GỬI', bold: true, fontSize: 9.5, color: '#1e40af', decoration: 'underline', margin: [0, 0, 0, 2] },
              row('Đơn vị gửi: ', bn.don_vi_gui),
              row('Họ tên người gửi: ', bn.nguoi_gui),
              row('Điện thoại: ', bn.dien_thoai_gui),
              row('Địa chỉ: ', bn.dia_chi_gui),
              row('Số CCCD: ', bn.so_cccd_gui),
            ],
          },
          {
            width: '50%',
            stack: [
              { text: 'NGƯỜI NHẬN', bold: true, fontSize: 9.5, color: '#1e40af', decoration: 'underline', margin: [0, 0, 0, 2] },
              row('Đơn vị nhận: ', bn.don_vi_nhan),
              row('Họ tên người nhận: ', bn.nguoi_nhan),
              row('Điện thoại: ', bn.dien_thoai_nhan),
              row('Địa chỉ/Giao hàng: ', bn.dia_chi_nhan || bn.dia_chi_giao),
              row('Số CCCD: ', bn.so_cccd_nhan),
              ...(bn.chanh?.ten ? [row('Gửi đến chành: ', bn.chanh.ten)] : []),
            ],
            margin: [10, 0, 0, 0],
          },
        ],
      },

      // DIVIDER NHẸ
      { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 580, y2: 2, lineWidth: 0.5, lineColor: '#ccc' }], margin: [0, 3, 0, 4] },

      // ══ HÀNG HÓA (trái) + CHECKBOX GIAO HÀNG (phải) ══
      {
        columns: [
          {
            width: '60%',
            stack: [
              { text: [{ text: 'Tên hàng / Số lượng: ', fontSize: 8, bold: true, color: '#111' }, { text: hangStr, fontSize: 8.5, bold: true }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Thu hộ (COD): ', fontSize: 8, bold: true, color: '#111' }, { text: `${fmtCurrency(bn.thu_ho)} đ`, fontSize: 8.5, bold: true }], margin: [0, 0, 0, 2] },
              {
                columns: [
                  { text: [{ text: 'Trọng lượng: ', fontSize: 8, bold: true, color: '#111' }, { text: bn.trong_luong ? `${bn.trong_luong} kg` : '—', fontSize: 8.5, bold: true }], width: '*' },
                  { text: [{ text: 'Giá trị hàng: ', fontSize: 8, bold: true, color: '#111' }, { text: bn.gia_tri_hang ? `${fmtCurrency(bn.gia_tri_hang)} đ` : '—', fontSize: 8.5, bold: true }], width: '*' },
                ],
                margin: [0, 0, 0, 2],
              },
              bn.ghi_chu
                ? { text: [{ text: 'Ghi chú: ', fontSize: 8, color: '#444' }, { text: bn.ghi_chu, fontSize: 8, italics: true }], margin: [0, 0, 0, 2] }
                : { text: '', fontSize: 1 },
            ],
          },
          {
            width: '40%',
            margin: [8, 0, 0, 0],
            table: {
              widths: [13, '*'],
              body: [
                [
                  { text: chk(bn.hang_hu_khong_den), fontSize: 8.5, alignment: 'center', border: [true, true, true, true] },
                  { text: 'Hàng hư/hỏng/bể không đền', fontSize: 8, border: [false, false, false, false], margin: [3, 0, 0, 0] },
                ],
                [
                  { text: chk(bn.hinh_thuc_giao === 'tan_noi'), fontSize: 8.5, alignment: 'center', border: [true, false, true, true] },
                  { text: 'Giao tận nơi', fontSize: 8, border: [false, false, false, false], margin: [3, 0, 0, 0] },
                ],
                [
                  { text: chk(bn.hinh_thuc_giao === 'goi_dien'), fontSize: 8.5, alignment: 'center', border: [true, false, true, true] },
                  { text: 'Điện thoại đến nhận', fontSize: 8, border: [false, false, false, false], margin: [3, 0, 0, 0] },
                ],
                [
                  { text: chk(bn.hinh_thuc_giao === 'tu_toi'), fontSize: 8.5, alignment: 'center', border: [true, false, true, true] },
                  { text: 'Tự đến lấy', fontSize: 8, border: [false, false, false, false], margin: [3, 0, 0, 0] },
                ],
              ],
            },
            layout: { paddingLeft: () => 1, paddingRight: () => 1, paddingTop: () => 1, paddingBottom: () => 1 },
          },
        ],
      },

      // ══ CHỮ KÝ ══
      {
        columns: [
          { width: '*', stack: [{ text: 'NGƯỜI GỬI', bold: true, fontSize: 9, alignment: 'center' }] },
          { width: '*', stack: [{ text: 'NGƯỜI NHẬN', bold: true, fontSize: 9, alignment: 'center' }] },
          {
            width: '*',
            stack: [
              { text: 'NV. PHỤC VỤ', bold: true, fontSize: 9, alignment: 'center' },
              { text: bn.nhan_vien_nhap?.ten || '', fontSize: 8, color: '#555', alignment: 'right', margin: [0, 8, 0, 0] },
            ],
          },
        ],
        margin: [0, 4, 0, 4],
      },

      // ══ CHÚ Ý — dùng dấu + thay bullet ══
      {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 580, y2: 0, lineWidth: 0.5, lineColor: '#aaa' }], margin: [0, 0, 0, 2] },
          { text: 'Chú ý:', fontSize: 8, bold: true, margin: [0, 0, 0, 1] },
          { text: '+ Phiếu này chỉ có giá trị trong vòng 10 NGÀY. Quá thời hạn mọi khiếu nại sẽ không được giải quyết.', fontSize: 7.5, margin: [0, 0, 0, 1] },
          { text: '+ KHI ĐẾN NHẬN HÀNG, QUÝ KHÁCH PHẢI MANG THEO GIẤY CMND / GIẤY GIỚI THIỆU.', fontSize: 7.5, bold: true, margin: [0, 0, 0, 1] },
          { text: '+ Yêu cầu quý khách phải khai báo trị giá. Nếu có rủi ro DN bồi thường 100% trị giá khai báo.', fontSize: 7.5, margin: [0, 0, 0, 1] },
          { text: '+ Hàng không khai báo trị giá. Nếu có rủi ro DN bồi thường 10 lần giá cước đã thu.', fontSize: 7.5, margin: [0, 0, 0, 1] },
          { text: '+ Doanh nghiệp không chịu trách nhiệm với mặt hàng dễ cháy nổ, tiền, kim loại quý và hàng Quốc cấm, hàng lậu trong kiện hàng đã niêm phong.', fontSize: 7.5 },
        ],
      },
    ],

    defaultStyle: { font: 'Roboto' },
    watermark: makeWatermark(nhan_vien_ten),
  };

  // [H-04] Render trong Worker Thread để tránh block event loop
  try {
    return await renderPDFInWorker(docDefinition);
  } catch {
    // Fallback: render trên main thread nếu worker gặp lỗi
    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}

// ---- Phiếu Thu PDF (nâng cấp: layout A5 landscape 2 cột, giống BNTH) ----
export async function generatePhieuThuPDF(phieuThuId, { nhan_vien_ten } = {}) {
  const pt = await prisma.phieuThu.findUnique({
    where: { id: phieuThuId },
    include: {
      nhan_vien: { select: { ten: true } },
      van_phong:  { select: { ten: true, dia_chi: true } },
      bien_nhan:  {
        select: {
          ma_so: true, gia_cuoc: true,
          nguoi_gui: true, don_vi_gui: true, dien_thoai_gui: true,
          nguoi_nhan: true, don_vi_nhan: true, dien_thoai_nhan: true,
          dia_chi_nhan: true, dia_chi_giao: true,
          hang_hoa_json: true, ten_hang_hoa: true,
          van_phong_gui:  { select: { ma_vp: true, ten: true } },
          van_phong_nhan: { select: { ma_vp: true, ten: true } },
        },
      },
    },
  });
  if (!pt) throw Object.assign(new Error('Không tìm thấy phiếu thu'), { statusCode: 404 });

  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
  const ngayThu = new Date(pt.ngay_thu);
  const ngayStr = ngayThu.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const gioStr  = ngayThu.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  const htLabel = pt.hinh_thuc === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản';
  const logoDataUrl = getLogoDataUrl();

  const bn = pt.bien_nhan;

  // Hàng hóa (nếu có BN liên kết)
  let hangStr = '—';
  if (bn) {
    const hangItems = Array.isArray(bn.hang_hoa_json)
      ? bn.hang_hoa_json.filter(i => Number(i.so_luong) > 0)
      : [];
    hangStr = hangItems.length > 0
      ? hangItems.map(i => `${i.so_luong} ${i.don_vi}${i.ghi_chu ? ` (${i.ghi_chu})` : ''}`).join(', ')
      : (bn.ten_hang_hoa || '—');
  }

  const tuyen     = bn ? `${bn.van_phong_gui?.ma_vp || '?'} - ${bn.van_phong_nhan?.ma_vp || '?'}` : '—';
  const nguoiGui  = bn ? (bn.don_vi_gui  || bn.nguoi_gui  || '—') : '—';
  const nguoiNhan = bn ? (bn.don_vi_nhan || bn.nguoi_nhan || '—') : pt.doi_tuong;

  // Helper: dòng label + value
  const infoRow = (label, value, labelWidth = 80) => ({
    columns: [
      { text: label, fontSize: 8, color: '#64748b', width: labelWidth },
      { text: value || '—', fontSize: 8.5, bold: true, color: '#0f172a', width: '*' },
    ],
    margin: [0, 0, 0, 3],
  });

  // A5 landscape usable width
  const PAGE_W = 563;
  const LEFT_W  = Math.round(PAGE_W * 0.57);
  const RIGHT_W = PAGE_W - LEFT_W - 12;

  const docDefinition = {
    pageSize: 'A5',
    pageOrientation: 'landscape',
    pageMargins: [16, 12, 16, 12],

    content: [
      // ══ HEADER ══
      {
        table: {
          widths: ['auto', '*'],
          body: [[
            logoDataUrl
              ? { image: logoDataUrl, width: 104, height: 18.66, border: [false, false, false, false], margin: [0, 0, 3, 0] }
              : { text: '', border: [false, false, false, false] },
            {
              border: [false, false, false, false],
              verticalAlignment: 'middle',
              text: 'CÔNG TY VẬN TẢI THIÊN MINH QUANG',
              bold: true, fontSize: 14, color: '#1e40af',
            },
          ]],
        },
        layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 4 },
        margin: [0, 0, 0, 0],
      },
      { text: pt.van_phong?.ten || '', fontSize: 7.5, color: '#475569', margin: [0, 0, 0, 1] },
      { text: pt.van_phong?.dia_chi || '', fontSize: 7, color: '#94a3b8', margin: [0, 0, 0, 3] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: PAGE_W, y2: 0, lineWidth: 0.8, lineColor: '#1e40af' }], margin: [0, 0, 0, 6] },

      // ══ NỘI DUNG 2 CỘT ══
      {
        columns: [
          // ── CỘT TRÁI ──
          {
            width: LEFT_W,
            stack: [
              { text: 'PHIẾU THU CÔNG NỢ', fontSize: 12, bold: true, color: '#1e40af', margin: [0, 0, 0, 1] },
              {
                columns: [
                  { text: `Số: ${pt.ma_phieu}`, fontSize: 9, bold: true, color: '#334155' },
                  { text: `${gioStr} — ${ngayStr}`, fontSize: 8.5, color: '#64748b', alignment: 'right' },
                ],
                margin: [0, 0, 0, 6],
              },

              // Block thông tin biên nhận gốc (chỉ khi có BN liên kết)
              ...(bn ? [{
                table: {
                  widths: ['*'],
                  body: [[{
                    stack: [
                      { text: 'THÔNG TIN BIÊN NHẬN', fontSize: 7, bold: true, color: '#64748b', letterSpacing: 0.5, margin: [0, 0, 0, 4] },
                      infoRow('Mã biên nhận:', bn.ma_so),
                      infoRow('Tuyến:', tuyen),
                      infoRow('Giá cước BN:', `${fmt(bn.gia_cuoc)} đ`),
                    ],
                    border: [false, false, false, false],
                    fillColor: '#f1f5f9',
                    margin: [6, 4, 6, 4],
                  }]],
                },
                layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                margin: [0, 0, 0, 5],
              }] : []),

              { text: 'ĐỐI TƯỢNG NỘP TIỀN', fontSize: 7.5, bold: true, color: '#475569', decoration: 'underline', margin: [0, 0, 0, 2] },
              infoRow('Tên:', pt.doi_tuong),
              ...(bn ? [
                infoRow('Người gửi:', nguoiGui),
                infoRow('Người nhận:', nguoiNhan),
                infoRow('ĐT người gửi:', bn.dien_thoai_gui),
              ] : []),

              ...(bn ? [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LEFT_W, y2: 0, lineWidth: 0.4, lineColor: '#e2e8f0' }], margin: [0, 4, 0, 4] },
                infoRow('Hàng hóa:', hangStr),
              ] : []),

              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LEFT_W, y2: 0, lineWidth: 0.4, lineColor: '#e2e8f0' }], margin: [0, 4, 0, 4] },
              infoRow('Lý do thu:', pt.ly_do),
            ],
          },

          // ── GAP ──
          { width: 12, text: '' },

          // ── CỘT PHẢI ──
          {
            width: RIGHT_W,
            stack: [
              // Box số tiền nổi bật
              {
                table: {
                  widths: ['*'],
                  body: [[{
                    stack: [
                      { text: 'SỐ TIỀN THU', fontSize: 7.5, bold: true, color: '#92400e', alignment: 'center', margin: [0, 0, 0, 4] },
                      { text: `${fmt(pt.so_tien)} đ`, fontSize: 22, bold: true, color: '#dc2626', alignment: 'center', margin: [0, 0, 0, 4] },
                      {
                        table: {
                          widths: ['*'],
                          body: [[{ text: htLabel, fontSize: 8, bold: true, alignment: 'center', border: [false, false, false, false], color: '#374151' }]],
                        },
                        layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                      },
                    ],
                    border: [true, true, true, true],
                    fillColor: '#fff7ed',
                    margin: [6, 8, 6, 8],
                  }]],
                },
                layout: {
                  hLineColor: () => '#f97316',
                  vLineColor: () => '#f97316',
                  hLineWidth: () => 1.5,
                  vLineWidth: () => 1.5,
                  paddingLeft: () => 0,
                  paddingRight: () => 0,
                  paddingTop: () => 0,
                  paddingBottom: () => 0,
                },
                margin: [0, 0, 0, 8],
              },

              infoRow('Người lập:', pt.nhan_vien?.ten, 65),

              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: RIGHT_W, y2: 0, lineWidth: 0.4, lineColor: '#e2e8f0' }], margin: [0, 6, 0, 8] },

              // Chữ ký 2 cột
              {
                columns: [
                  {
                    stack: [
                      { text: 'NGƯỜI NỘP TIỀN', fontSize: 7.5, bold: true, alignment: 'center', color: '#374151' },
                      { text: '(Ký, ghi rõ họ tên)', fontSize: 6.5, color: '#94a3b8', alignment: 'center', margin: [0, 1, 0, 0] },
                      { text: '\n\n\n', fontSize: 8 },
                      { text: '________________', alignment: 'center', color: '#94a3b8', fontSize: 9 },
                    ],
                    width: '*',
                  },
                  {
                    stack: [
                      { text: 'NHÂN VIÊN THU', fontSize: 7.5, bold: true, alignment: 'center', color: '#374151' },
                      { text: '(Ký, ghi rõ họ tên)', fontSize: 6.5, color: '#94a3b8', alignment: 'center', margin: [0, 1, 0, 0] },
                      { text: '\n\n\n', fontSize: 8 },
                      { text: pt.nhan_vien?.ten || '', fontSize: 7.5, alignment: 'center', color: '#1e40af', bold: true },
                      { text: '________________', alignment: 'center', color: '#94a3b8', fontSize: 9 },
                    ],
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 0],
              },
            ],
          },
        ],
      },
    ],

    defaultStyle: { font: 'Roboto' },
    watermark: makeWatermark(nhan_vien_ten),
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

// ---- Phiếu Chi PDF ----
export async function generatePhieuChiPDF(phieuChiId, { nhan_vien_ten } = {}) {
  const pc = await prisma.phieuChi.findUnique({
    where: { id: phieuChiId },
    include: { nhan_vien: { select: { ten: true } } },
  });
  if (!pc) throw Object.assign(new Error('Không tìm thấy phiếu chi'), { statusCode: 404 });

  const fmt = (n) => Number(n).toLocaleString('vi-VN');

  const docDefinition = {
    pageSize: 'A5',
    pageMargins: [25, 20, 25, 20],
    content: [
      { text: 'TMQ EXPRESS', fontSize: 12, bold: true, color: '#1E40AF', alignment: 'center' },
      { text: 'PHIẾU CHI', fontSize: 16, bold: true, alignment: 'center', margin: [0, 8, 0, 4] },
      { text: `Số: ${pc.ma_phieu}`, alignment: 'center', fontSize: 10, color: '#666' },
      { text: `Ngày: ${new Date(pc.ngay_chi).toLocaleDateString('vi-VN')}`, alignment: 'center', fontSize: 9, color: '#888', margin: [0, 2, 0, 12] },
      { text: `Người nhận: ${pc.nguoi_nhan}`, fontSize: 10, margin: [0, 0, 0, 4] },
      { text: `Lý do: ${pc.ly_do}`, fontSize: 10, margin: [0, 0, 0, 4] },
      { text: `Số tiền: ${fmt(pc.so_tien)} đ`, fontSize: 12, bold: true, margin: [0, 0, 0, 4] },
      { text: `Hình thức: ${pc.hinh_thuc === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}`, fontSize: 10, margin: [0, 0, 0, 4] },
      { text: `Người lập: ${pc.nhan_vien.ten}`, fontSize: 9, color: '#666', margin: [0, 8, 0, 0] },
      {
        columns: [
          { text: 'Người nhận\n\n\n\n_______________', alignment: 'center', fontSize: 9, margin: [0, 20, 0, 0] },
          { text: 'Người lập phiếu\n\n\n\n_______________', alignment: 'center', fontSize: 9, margin: [0, 20, 0, 0] },
        ],
      },
    ],
    watermark: makeWatermark(nhan_vien_ten),
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

// ---- Phiếu Thu Hộ COD (BienNhanThuHo) PDF ----
/**
 * In phiếu thu hộ COD — A5 ngang (landscape), 1 liên duy nhất
 * Layout 2 cột: Trái = header + thông tin BN gốc | Phải = số tiền + chữ ký
 * @param {number} bienNhanId — ID của biên nhận gốc (không phải BNTH id)
 */
export async function generateBienNhanThuHoPDF(bienNhanId) {
  const bnth = await prisma.bienNhanThuHo.findUnique({
    where: { bien_nhan_id: bienNhanId },
    include: {
      bien_nhan: {
        select: {
          ma_so: true, thu_ho: true,
          nguoi_gui: true, don_vi_gui: true, dien_thoai_gui: true,
          nguoi_nhan: true, don_vi_nhan: true, dien_thoai_nhan: true,
          dia_chi_nhan: true, dia_chi_giao: true,
          hang_hoa_json: true, ten_hang_hoa: true,
          van_phong_gui: { select: { ma_vp: true, ten: true } },
          van_phong_nhan: { select: { ma_vp: true, ten: true } },
        },
      },
      van_phong: { select: { ten: true, dia_chi: true } },
      nhan_vien: { select: { ten: true } },
    },
  });

  if (!bnth) throw Object.assign(new Error('Chưa có biên nhận thu hộ cho biên nhận này'), { statusCode: 404 });

  const bn = bnth.bien_nhan;
  const fmt = (n) => Number(n).toLocaleString('vi-VN');
  const ngayThu = new Date(bnth.ngay_thu);
  const ngayStr = ngayThu.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const gioStr  = ngayThu.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  const htLabel = bnth.hinh_thuc === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản';
  const logoDataUrl = getLogoDataUrl();

  // Helper: dòng label + value hai cột
  const infoRow = (label, value, labelWidth = 80) => ({
    columns: [
      { text: label, fontSize: 8, color: '#64748b', width: labelWidth },
      { text: value || '—', fontSize: 8.5, bold: true, color: '#0f172a', width: '*' },
    ],
    margin: [0, 0, 0, 3],
  });

  // Hàng hóa
  const hangItems = Array.isArray(bn.hang_hoa_json)
    ? bn.hang_hoa_json.filter(i => Number(i.so_luong) > 0)
    : [];
  const hangStr = hangItems.length > 0
    ? hangItems.map(i => `${i.so_luong} ${i.don_vi}${i.ghi_chu ? ` (${i.ghi_chu})` : ''}`).join(', ')
    : (bn.ten_hang_hoa || '—');

  const tuyen = `${bn.van_phong_gui?.ma_vp || '?'} - ${bn.van_phong_nhan?.ma_vp || '?'}`;
  const nguoiGui = bn.don_vi_gui || bn.nguoi_gui || '—';
  const nguoiNhan = bn.don_vi_nhan || bn.nguoi_nhan || '—';
  const diaChiNhan = bn.dia_chi_nhan || bn.dia_chi_giao || '—';

  // A5 landscape: width ~595pt, height ~421pt (pdfmake points at 72dpi)
  // Usable width after margins [16,12,16,12]: ~563pt
  const PAGE_W = 563;
  const LEFT_W = Math.round(PAGE_W * 0.57);  // ~321
  const RIGHT_W = PAGE_W - LEFT_W - 12;       // ~230 (gap 12)

  const docDefinition = {
    pageSize: 'A5',
    pageOrientation: 'landscape',
    pageMargins: [16, 12, 16, 12],

    content: [
      // ══ HEADER FULL-WIDTH: Logo + Tên công ty + VP + Divider ══
      {
        table: {
          widths: ['auto', '*'],
          body: [[
            logoDataUrl
              ? { image: logoDataUrl, width: 104, height: 18.66, border: [false, false, false, false], margin: [0, 0, 3, 0] }
              : { text: '', border: [false, false, false, false] },
            {
              border: [false, false, false, false],
              verticalAlignment: 'middle',
              text: 'CÔNG TY VẬN TẢI THIÊN MINH QUANG',
              bold: true, fontSize: 14, color: '#1e40af',
            },
          ]],
        },
        layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 4 },
        margin: [0, 0, 0, 0],
      },
      { text: bnth.van_phong?.ten || '', fontSize: 7.5, color: '#475569', margin: [0, 0, 0, 1] },
      { text: bnth.van_phong?.dia_chi || '', fontSize: 7, color: '#94a3b8', margin: [0, 0, 0, 3] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: PAGE_W, y2: 0, lineWidth: 0.8, lineColor: '#1e40af' }], margin: [0, 0, 0, 6] },

      // ══ NỘI DUNG 2 CỘT ══
      {
        columns: [
          // ══ CỘT TRÁI ══
          {
            width: LEFT_W,
            stack: [
              // -- Tiêu đề + Số phiếu + Ngày --
              { text: 'BIÊN NHẬN THU HỘ', fontSize: 12, bold: true, color: '#1e40af', margin: [0, 0, 0, 1] },
              {
                columns: [
                  { text: `Số: ${bnth.ma_bnth}`, fontSize: 9, bold: true, color: '#334155' },
                  { text: `${gioStr} — ${ngayStr}`, fontSize: 8.5, color: '#64748b', alignment: 'right' },
                ],
                margin: [0, 0, 0, 6],
              },

              // -- Thông tin biên nhận gốc --
              {
                table: {
                  widths: ['*'],
                  body: [[{
                    stack: [
                      { text: 'THÔNG TIN BIÊN NHẬN', fontSize: 7, bold: true, color: '#64748b', letterSpacing: 0.5, margin: [0, 0, 0, 4] },
                      infoRow('Mã biên nhận:', bn.ma_so),
                      infoRow('Tuyến:', tuyen),
                    ],
                    border: [false, false, false, false],
                    fillColor: '#f1f5f9',
                    margin: [6, 4, 6, 4],
                  }]],
                },
                layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                margin: [0, 0, 0, 5],
              },

              // -- Người gửi --
              { text: 'NGƯỜI GỬI', fontSize: 7.5, bold: true, color: '#475569', decoration: 'underline', margin: [0, 0, 0, 2] },
              infoRow('Họ tên / Đơn vị:', nguoiGui),
              infoRow('Điện thoại:', bn.dien_thoai_gui),

              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LEFT_W, y2: 0, lineWidth: 0.4, lineColor: '#e2e8f0' }], margin: [0, 4, 0, 4] },

              // -- Người nhận --
              { text: 'NGƯỜI NHẬN', fontSize: 7.5, bold: true, color: '#475569', decoration: 'underline', margin: [0, 0, 0, 2] },
              infoRow('Họ tên / Đơn vị:', nguoiNhan),
              infoRow('Điện thoại:', bn.dien_thoai_nhan),
              infoRow('Địa chỉ giao:', diaChiNhan),

              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: LEFT_W, y2: 0, lineWidth: 0.4, lineColor: '#e2e8f0' }], margin: [0, 4, 0, 4] },

              // -- Hàng hóa --
              infoRow('Hàng hóa:', hangStr),
              ...(bnth.ghi_chu ? [infoRow('Ghi chú:', bnth.ghi_chu)] : []),
            ],
          },

          // ══ GAP ══
          { width: 12, text: '' },

          // ══ CỘT PHẢI ══
          {
            width: RIGHT_W,
            stack: [
              // -- Box số tiền nổi bật --
              {
                table: {
                  widths: ['*'],
                  body: [[{
                    stack: [
                      { text: 'SỐ TIỀN THU HỘ', fontSize: 7.5, bold: true, color: '#92400e', alignment: 'center', margin: [0, 0, 0, 4] },
                      { text: `${fmt(bnth.so_tien)} đ`, fontSize: 22, bold: true, color: '#dc2626', alignment: 'center', margin: [0, 0, 0, 4] },
                      {
                        table: {
                          widths: ['*', '*'],
                          body: [[
                            { text: htLabel, fontSize: 8, bold: true, alignment: 'center', border: [false, false, true, false], color: '#374151' },
                            { text: bnth.la_qua_chanh ? 'Qua chành' : 'Trực tiếp', fontSize: 8, bold: true, alignment: 'center', border: [false, false, false, false], color: '#374151' },
                          ]],
                        },
                        layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                      },
                    ],
                    border: [true, true, true, true],
                    fillColor: '#fff7ed',
                    margin: [6, 8, 6, 8],
                  }]],
                },
                layout: {
                  hLineColor: () => '#f97316',
                  vLineColor: () => '#f97316',
                  hLineWidth: () => 1.5,
                  vLineWidth: () => 1.5,
                  paddingLeft: () => 0,
                  paddingRight: () => 0,
                  paddingTop: () => 0,
                  paddingBottom: () => 0,
                },
                margin: [0, 0, 0, 8],
              },

              // -- Người nộp --
              infoRow('Người nộp:', bnth.nguoi_nop, 65),

              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: RIGHT_W, y2: 0, lineWidth: 0.4, lineColor: '#e2e8f0' }], margin: [0, 6, 0, 8] },

              // -- Chữ ký 2 cột --
              {
                columns: [
                  {
                    stack: [
                      { text: 'NGƯỜI GIAO / NỘP', fontSize: 7.5, bold: true, alignment: 'center', color: '#374151' },
                      { text: '(Ký, ghi rõ họ tên)', fontSize: 6.5, color: '#94a3b8', alignment: 'center', margin: [0, 1, 0, 0] },
                      { text: '\n\n\n', fontSize: 8 },
                      { text: '________________', alignment: 'center', color: '#94a3b8', fontSize: 9 },
                    ],
                    width: '*',
                  },
                  {
                    stack: [
                      { text: 'NHÂN VIÊN THU', fontSize: 7.5, bold: true, alignment: 'center', color: '#374151' },
                      { text: '(Ký, ghi rõ họ tên)', fontSize: 6.5, color: '#94a3b8', alignment: 'center', margin: [0, 1, 0, 0] },
                      { text: '\n\n\n', fontSize: 8 },
                      { text: bnth.nhan_vien?.ten || '', fontSize: 7.5, alignment: 'center', color: '#1e40af', bold: true },
                      { text: '________________', alignment: 'center', color: '#94a3b8', fontSize: 9 },
                    ],
                    width: '*',
                  },
                ],
                margin: [0, 0, 0, 0],
              },
            ],
          },
        ],
      },
    ],

    defaultStyle: { font: 'Roboto' },
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

// ---- Sổ Biên Nhận Hàng Gửi PDF ----
/**
 * Xuất PDF Sổ Biên Nhận Hàng Gửi
 * @param {string} ngayTu  - Ngày bắt đầu (YYYY-MM-DD, local VN time)
 * @param {string} ngayDen - Ngày kết thúc (YYYY-MM-DD, local VN time)
 * @param {number} vpGuiId
 * @param {number} vpNhanId
 */
export async function generateSoBienNhan(ngayTu, ngayDen, vpGuiId, vpNhanId) {
  const vpGui = await prisma.vanPhong.findUnique({ where: { id: vpGuiId } });
  const vpNhan = await prisma.vanPhong.findUnique({ where: { id: vpNhanId } });
  if (!vpGui || !vpNhan) throw Object.assign(new Error('Không tìm thấy văn phòng'), { statusCode: 404 });

  const startOfRange = parseStartOfDayVN(ngayTu);
  const endOfRange = parseEndOfDayVN(ngayDen);
  const ngayTuStr = fmtDateStr(ngayTu);
  const ngayDenStr = fmtDateStr(ngayDen);
  const isOneDay = ngayTu === ngayDen;

  const bienNhans = await prisma.bienNhan.findMany({
    where: {
      van_phong_gui_id: vpGuiId,
      van_phong_nhan_id: vpNhanId,
      ngay_bien_nhan: { gte: startOfRange, lte: endOfRange },
    },
    orderBy: [{ ngay_bien_nhan: 'asc' }, { ma_so: 'asc' }],
  });

  // ── 2-Tầng Header (giống mẫu giấy thực tế TMQ Express) ──────────────────
  // Tầng 1: Group headers (merged cells)
  const headerRow1 = [
    { text: 'Thông tin\nbiên nhận', style: 'thGroup', colSpan: 2, alignment: 'center' }, {},
    { text: 'Thông tin\nngười gửi', style: 'thGroup', rowSpan: 2, alignment: 'center' },
    { text: 'Thông tin người nhận', style: 'thGroup', colSpan: 3, alignment: 'center' }, {}, {},
    { text: 'Thông tin hàng gửi', style: 'thGroup', alignment: 'center' },
    { text: 'HT Giao', style: 'thGroup', colSpan: 2, alignment: 'center' }, {},
    { text: 'Cước phí', style: 'thGroup', colSpan: 2, alignment: 'center' }, {},
    { text: 'Xác nhận', style: 'thGroup', alignment: 'center' },
  ];
  // Tầng 2: Column headers
  const headerRow2 = [
    { text: 'T.Gian', style: 'th', alignment: 'center' },
    { text: 'Biên nhận', style: 'th', alignment: 'center' },
    {},  // rowSpan từ 'Thông tin người gửi'
    { text: 'Họ tên', style: 'th', alignment: 'center' },
    { text: 'Địa chỉ/CCCD\n/Thu hộ', style: 'th', alignment: 'center' },
    { text: 'Điện thoại', style: 'th', alignment: 'center' },
    { text: 'Tên hàng', style: 'th', alignment: 'center' },
    { text: 'Tận\nnơi', style: 'th', alignment: 'center' },
    { text: 'ĐT', style: 'th', alignment: 'center' },
    { text: 'Giá cước\nđã thu', style: 'th', alignment: 'center' },
    { text: 'Giá cước\nchưa thu', style: 'th', alignment: 'center' },
    { text: 'Ký, họ tên', style: 'th', alignment: 'center' },
  ];

  // ── Data rows — nhóm theo ngày giống sổ giấy gốc ─────────────────────────
  const dataRows = [];
  const groupedByDate = new Map();
  bienNhans.forEach(bn => {
    const d = new Date(bn.ngay_bien_nhan);
    const dateKey = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    if (!groupedByDate.has(dateKey)) groupedByDate.set(dateKey, []);
    groupedByDate.get(dateKey).push(bn);
  });

  for (const [dateStr, bns] of groupedByDate) {
    // Dòng ngày — spanning full width
    dataRows.push([
      { text: `Ngày:${dateStr}`, colSpan: 12, style: 'td', bold: true, fontSize: 8.5 },
      {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
    ]);

    bns.forEach(bn => {
      // Giờ thực tế lưu trong field gio_tao (String HH:mm), không parse từ ngay_bien_nhan
      // (ngay_bien_nhan lưu là UTC midnight → toLocaleTimeString sẽ cho 07:00 sai)
      const timeStr = bn.gio_tao || '—';
      // Ghép dữ liệu cột "Địa chỉ/CCCD/Thu hộ" — hiện đầy đủ thông tin
      const dcContent = [];
      if (bn.dia_chi_nhan) dcContent.push(bn.dia_chi_nhan + '\n');
      if (bn.so_cccd_nhan) dcContent.push(`CCCD: ${bn.so_cccd_nhan}\n`);
      const thuHoVal = Number(bn.thu_ho) || 0;
      dcContent.push({ text: thuHoVal > 0 ? `Thu hộ: ${fmtCurrency(thuHoVal)}` : 'Thu hộ: 0', bold: true });

      const isTanNoi = bn.hinh_thuc_giao === 'tan_noi';
      const isGoiDien = bn.hinh_thuc_giao === 'goi_dien';
      const daThu = bn.trang_thai_thu === 'da_thu' ? fmtCurrency(bn.gia_cuoc) : '';
      const chuaThu = bn.trang_thai_thu !== 'da_thu' ? fmtCurrency(bn.gia_cuoc) : '';

      // Parse hàng hóa giống biên nhận đơn lẻ
      const hangItems = Array.isArray(bn.hang_hoa_json)
        ? bn.hang_hoa_json.filter(i => Number(i.so_luong) > 0)
        : [];
      const hangStr = hangItems.length > 0
        ? hangItems.map(i => `${i.so_luong} ${i.don_vi}${i.ghi_chu ? ` (${i.ghi_chu})` : ''}`).join(', ')
        : (bn.ten_hang_hoa || '—');

      dataRows.push([
        { text: timeStr, style: 'td' },
        { text: bn.ma_so, style: 'td', bold: true, noWrap: true, alignment: 'center' },
        { text: bn.nguoi_gui || bn.don_vi_gui || '', style: 'td' },
        { text: bn.nguoi_nhan || bn.don_vi_nhan || '', style: 'td', bold: true },
        { text: dcContent, style: 'td', fontSize: 7.5 },
        { text: bn.dien_thoai_nhan || '', style: 'td', bold: true },
        { text: hangStr, style: 'td', fontSize: 7.5 },
        { text: isTanNoi ? 'X' : '', style: 'td', alignment: 'center', bold: true },
        { text: isGoiDien ? 'X' : '', style: 'td', alignment: 'center', bold: true },
        { text: daThu, style: 'td', alignment: 'right' },
        { text: chuaThu, style: 'td', alignment: 'right', bold: true },
        { text: '', style: 'td' },
      ]);
    });
  }

  // Tối thiểu 8 dòng data (không tính dòng nhóm)
  const minRows = 8;
  const padNeeded = Math.max(0, minRows - dataRows.length);
  for (let i = 0; i < padNeeded; i++) {
    dataRows.push(Array(12).fill({ text: '', style: 'td' }));
  }

  // ── Dòng tổng kết ────────────────────────────────────────────────────────
  const tongDaThu = bienNhans.reduce((s, bn) => s + (bn.trang_thai_thu === 'da_thu' ? Number(bn.gia_cuoc) : 0), 0);
  const tongChuaThu = bienNhans.reduce((s, bn) => s + (bn.trang_thai_thu !== 'da_thu' ? Number(bn.gia_cuoc) : 0), 0);
  const summaryRow = [
    { text: `Tổng: ${bienNhans.length} biên nhận`, style: 'tdSum', bold: true, colSpan: 9, alignment: 'right' },
    {}, {}, {}, {}, {}, {}, {}, {},
    { text: fmtCurrency(tongDaThu), style: 'tdSum', bold: true, alignment: 'right' },
    { text: fmtCurrency(tongChuaThu), style: 'tdSum', bold: true, alignment: 'right' },
    { text: '', style: 'tdSum' },
  ];

  // ── Doc definition ────────────────────────────────────────────────────────
  const logoDataUrl = getLogoDataUrl();

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 28, 28, 28],   // 1cm = ~28pt mỗi cạnh

    footer: (currentPage, pageCount) => ({
      text: `Trang ${currentPage} / ${pageCount}`,
      alignment: 'right', fontSize: 9, color: '#888', margin: [0, 4, 28, 0],
    }),

    content: [
      // ══ HEADER: Logo + Tên công ty (tham khảo layout biên nhận đơn lẻ) ══
      {
        table: {
          widths: ['auto', '*'],
          body: [[
            logoDataUrl
              ? { image: logoDataUrl, width: 130, height: 23.3, border: [false, false, false, false], margin: [0, 0, 4, 0] }
              : { text: '', border: [false, false, false, false] },
            {
              border: [false, false, false, false],
              verticalAlignment: 'middle',
              text: 'CÔNG TY VẬN TẢI THIÊN MINH QUANG',
              bold: true, fontSize: 16, color: '#1e40af',
            },
          ]],
        },
        layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      },

      // Divider
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 785, y2: 0, lineWidth: 0.8 }], margin: [0, 4, 0, 6] },

      // ══ Tiêu đề ══
      { text: 'SỔ BIÊN NHẬN HÀNG GỬI', bold: true, fontSize: 12, alignment: 'center', margin: [0, 0, 0, 4] },
      {
        text: isOneDay
          ? `Từ ngày: ${ngayTuStr}  Đến ngày: ${ngayDenStr}`
          : `Từ ngày: ${ngayTuStr}   Đến ngày: ${ngayDenStr}`,
        fontSize: 10, margin: [0, 0, 0, 2],
      },
      { text: `Tại: ${vpGui.ten}    —    Nơi nhận: ${vpNhan.ten}`, fontSize: 10, margin: [0, 0, 0, 4] },

      // ══ Bảng dữ liệu ══
      {
        table: {
          headerRows: 2,
          dontBreakRows: false,
          widths: [34, 46, 82, 74, '*', 58, 85, 20, 20, 50, 50, 44],
          body: [headerRow1, headerRow2, ...dataRows, summaryRow],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 2 || i === node.table.body.length - 1 || i === node.table.body.length) ? 1 : 0.4,
          vLineWidth: () => 0.5,
          hLineColor: (i, node) => (i === 0 || i === 2 || i === node.table.body.length) ? '#333' : '#ccc',
          vLineColor: () => '#bbb',
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
    ],

    styles: {
      thGroup: { fontSize: 10, bold: true, fillColor: '#dbeafe', color: '#1e3a5f' },
      th: { fontSize: 9, bold: true, fillColor: '#f0f4f8' },
      td: { fontSize: 9, margin: [0, 3, 0, 6], lineHeight: 1.3 },
      tdSum: { fontSize: 10, fillColor: '#f9fafb' },
    },
    defaultStyle: { font: 'Roboto' },
  };

  // [H-04] Render trong Worker Thread — Sổ BN PDF là document nặng nhất
  try {
    return await renderPDFInWorker(docDefinition);
  } catch {
    // Fallback: render trên main thread nếu worker gặp lỗi
    return new Promise((resolve, reject) => {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SỔ BIÊN NHẬN — EXCEL
// ══════════════════════════════════════════════════════════════════════════════
export async function generateSoBienNhanExcel(ngayTu, ngayDen, vpGuiId, vpNhanId) {
  const vpGui = await prisma.vanPhong.findUnique({ where: { id: vpGuiId } });
  const vpNhan = await prisma.vanPhong.findUnique({ where: { id: vpNhanId } });
  if (!vpGui || !vpNhan) throw Object.assign(new Error('Không tìm thấy văn phòng'), { statusCode: 404 });

  const startOfRange = parseStartOfDayVN(ngayTu);
  const endOfRange = parseEndOfDayVN(ngayDen);
  const ngayTuStr = fmtDateStr(ngayTu);
  const ngayDenStr = fmtDateStr(ngayDen);

  const bienNhans = await prisma.bienNhan.findMany({
    where: {
      van_phong_gui_id: vpGuiId,
      van_phong_nhan_id: vpNhanId,
      ngay_bien_nhan: { gte: startOfRange, lte: endOfRange },
    },
    orderBy: [{ ngay_bien_nhan: 'asc' }, { ma_so: 'asc' }],
  });

  // ── Tạo workbook ──────────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Sổ biên nhận', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    properties: { defaultRowHeight: 20 },
  });

  // ── Header: Tên công ty ──────────────────────────────────────────────────
  ws.mergeCells('A1:L1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'CÔNG TY VẬN TẢI THIÊN MINH QUANG';
  titleCell.font = { bold: true, size: 14, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

  // ── Tiêu đề sổ ──────────────────────────────────────────────────────────
  ws.mergeCells('A2:L2');
  const subTitle = ws.getCell('A2');
  subTitle.value = 'SỔ BIÊN NHẬN HÀNG GỬI';
  subTitle.font = { bold: true, size: 12 };
  subTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  // ── Thông tin ngày, VP ─────────────────────────────────────────────────
  ws.mergeCells('A3:L3');
  const infoCell = ws.getCell('A3');
  infoCell.value = `Từ ngày: ${ngayTuStr}   Đến ngày: ${ngayDenStr}    —    Tại: ${vpGui.ten}    —    Nơi nhận: ${vpNhan.ten}`;
  infoCell.font = { size: 10 };
  infoCell.alignment = { horizontal: 'left' };

  // ── Cấu hình cột ──────────────────────────────────────────────────────
  ws.columns = [
    { key: 'stt', width: 5 },  // A
    { key: 'tgian', width: 8 },  // B
    { key: 'bien_nhan', width: 18 },  // C
    { key: 'nguoi_gui', width: 16 },  // D
    { key: 'nguoi_nhan', width: 16 },  // E
    { key: 'dc_cccd', width: 22 },  // F
    { key: 'dien_thoai', width: 14 },  // G
    { key: 'ten_hang', width: 24 },  // H
    { key: 'ht_giao', width: 10 },  // I
    { key: 'da_thu', width: 14 },  // J
    { key: 'chua_thu', width: 14 },  // K
    { key: 'ky_ten', width: 12 },  // L
  ];

  // ── Header bảng — Tầng 1 (group) ─────────────────────────────────────
  const hdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
  const hdrFont = { bold: true, size: 10, color: { argb: '1E3A5F' } };
  const hdrAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };
  const thinBorder = {
    top: { style: 'thin' }, bottom: { style: 'thin' },
    left: { style: 'thin' }, right: { style: 'thin' },
  };

  const row5 = ws.getRow(5);
  // Thông tin biên nhận (A-C)
  ws.mergeCells('A5:C5');
  ws.getCell('A5').value = 'Thông tin biên nhận';
  // Thông tin người gửi (D)
  ws.mergeCells('D5:D6');
  ws.getCell('D5').value = 'Thông tin\nngười gửi';
  // Thông tin người nhận (E-G)
  ws.mergeCells('E5:G5');
  ws.getCell('E5').value = 'Thông tin người nhận';
  // Thông tin hàng gửi (H)
  ws.mergeCells('H5:H6');
  ws.getCell('H5').value = 'Thông tin\nhàng gửi';
  // HT Giao (I)
  ws.mergeCells('I5:I6');
  ws.getCell('I5').value = 'HT Giao';
  // Cước phí (J-K)
  ws.mergeCells('J5:K5');
  ws.getCell('J5').value = 'Cước phí';
  // Xác nhận (L)
  ws.mergeCells('L5:L6');
  ws.getCell('L5').value = 'Xác nhận';

  ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5', 'J5', 'K5', 'L5'].forEach(addr => {
    const c = ws.getCell(addr);
    c.fill = hdrFill; c.font = hdrFont; c.alignment = hdrAlign; c.border = thinBorder;
  });
  row5.height = 28;

  // ── Header bảng — Tầng 2 (column) ────────────────────────────────────
  const subHdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F4F8' } };
  const subHdrFont = { bold: true, size: 9 };
  const row6 = ws.getRow(6);
  const subHeaders = ['STT', 'T.Gian', 'Biên nhận', '', 'Họ tên', 'Địa chỉ/CCCD/Thu hộ', 'Điện thoại', '', '', 'Giá cước\nđã thu', 'Giá cước\nchưa thu', ''];
  subHeaders.forEach((text, i) => {
    const c = row6.getCell(i + 1);
    if (text) c.value = text;
    c.fill = subHdrFill; c.font = subHdrFont;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = thinBorder;
  });
  // Đảm bảo merged cells cũng có border
  ['D6', 'H6', 'I6', 'L6'].forEach(addr => {
    const c = ws.getCell(addr);
    c.fill = subHdrFill; c.font = subHdrFont; c.border = thinBorder;
  });
  row6.height = 28;

  // ── Data rows ─────────────────────────────────────────────────────────
  const groupedByDate = new Map();
  bienNhans.forEach(bn => {
    const d = new Date(bn.ngay_bien_nhan);
    const dateKey = d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    if (!groupedByDate.has(dateKey)) groupedByDate.set(dateKey, []);
    groupedByDate.get(dateKey).push(bn);
  });

  const dateGroupFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF9C3' } };
  const dateGroupFont = { bold: true, size: 9 };
  let stt = 0;

  for (const [dateStr, bns] of groupedByDate) {
    // Dòng nhóm ngày
    const dateRowNum = ws.lastRow.number + 1;
    ws.mergeCells(`A${dateRowNum}:L${dateRowNum}`);
    const dateCell = ws.getCell(`A${dateRowNum}`);
    dateCell.value = `Ngày: ${dateStr}`;
    dateCell.fill = dateGroupFill;
    dateCell.font = dateGroupFont;
    dateCell.border = thinBorder;

    bns.forEach(bn => {
      stt++;
      // Giờ thực tế lưu trong field gio_tao (String HH:mm), không parse từ ngay_bien_nhan
      const timeStr = bn.gio_tao || '—';

      // ĐC/CCCD/Thu hộ
      const dcParts = [];
      if (bn.dia_chi_nhan) dcParts.push(bn.dia_chi_nhan);
      if (bn.so_cccd_nhan) dcParts.push(`CCCD: ${bn.so_cccd_nhan}`);
      const thuHoVal = Number(bn.thu_ho) || 0;
      dcParts.push(thuHoVal > 0 ? `Thu hộ: ${fmtCurrency(thuHoVal)}` : 'Thu hộ: 0');

      // Hàng hóa
      const hangItems = Array.isArray(bn.hang_hoa_json)
        ? bn.hang_hoa_json.filter(i => Number(i.so_luong) > 0)
        : [];
      const hangStr = hangItems.length > 0
        ? hangItems.map(i => `${i.so_luong} ${i.don_vi}${i.ghi_chu ? ` (${i.ghi_chu})` : ''}`).join(', ')
        : (bn.ten_hang_hoa || '—');

      const htGiao = bn.hinh_thuc_giao === 'tan_noi' ? 'Tận nơi'
        : bn.hinh_thuc_giao === 'goi_dien' ? 'Gọi điện' : 'Tự tới';

      const daThu = bn.trang_thai_thu === 'da_thu' ? Number(bn.gia_cuoc) : '';
      const chuaThu = bn.trang_thai_thu !== 'da_thu' ? Number(bn.gia_cuoc) : '';

      const dataRow = ws.addRow([
        stt,
        timeStr,
        bn.ma_so,
        bn.nguoi_gui || bn.don_vi_gui || '',
        bn.nguoi_nhan || bn.don_vi_nhan || '',
        dcParts.join('\n'),
        bn.dien_thoai_nhan || '',
        hangStr,
        htGiao,
        daThu,
        chuaThu,
        '',
      ]);

      // Styling cho data row
      dataRow.eachCell((cell) => {
        cell.border = thinBorder;
        cell.font = { size: 9 };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });

      // Bold cho các trường quan trọng
      dataRow.getCell(3).font = { bold: true, size: 9 };   // Mã BN
      dataRow.getCell(5).font = { bold: true, size: 9 };   // Tên người nhận
      dataRow.getCell(7).font = { bold: true, size: 9 };   // ĐT nhận
      if (chuaThu) dataRow.getCell(11).font = { bold: true, size: 9, color: { argb: 'DC2626' } }; // Chưa thu = đỏ

      // Format tiền
      dataRow.getCell(10).numFmt = '#,##0';
      dataRow.getCell(11).numFmt = '#,##0';
      dataRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
      dataRow.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
      dataRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }

  // ── Dòng tổng kết ─────────────────────────────────────────────────────
  const tongDaThu = bienNhans.reduce((s, bn) => s + (bn.trang_thai_thu === 'da_thu' ? Number(bn.gia_cuoc) : 0), 0);
  const tongChuaThu = bienNhans.reduce((s, bn) => s + (bn.trang_thai_thu !== 'da_thu' ? Number(bn.gia_cuoc) : 0), 0);
  const sumRowNum = ws.lastRow.number + 1;
  ws.mergeCells(`A${sumRowNum}:I${sumRowNum}`);
  const sumRow = ws.getRow(sumRowNum);
  ws.getCell(`A${sumRowNum}`).value = `Tổng: ${bienNhans.length} biên nhận`;
  ws.getCell(`A${sumRowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getCell(`J${sumRowNum}`).value = tongDaThu;
  ws.getCell(`J${sumRowNum}`).numFmt = '#,##0';
  ws.getCell(`J${sumRowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getCell(`K${sumRowNum}`).value = tongChuaThu;
  ws.getCell(`K${sumRowNum}`).numFmt = '#,##0';
  ws.getCell(`K${sumRowNum}`).alignment = { horizontal: 'right', vertical: 'middle' };

  const sumFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach(col => {
    const c = ws.getCell(`${col}${sumRowNum}`);
    c.fill = sumFill;
    c.font = { bold: true, size: 10 };
    c.border = thinBorder;
  });

  // ── Generate buffer ───────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

