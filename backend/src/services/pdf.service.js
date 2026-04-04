import PdfPrinter from 'pdfmake/src/printer.js';
import QRCode from 'qrcode';
import prisma from '../config/database.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fontsDir = join(__dirname, '../../fonts');

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

const TRANG_THAI_LABELS = {
  cho_vc: 'Chờ VC', dang_vc: 'Đang VC', da_den_kho: 'Đã đến kho',
  da_bao_khach: 'Đã báo khách', khach_da_nhan: 'Khách đã nhận',
};

const THU_LABELS = {
  da_thu: 'Đã thu', chua_thu: 'Chưa thu', cong_no: 'Công nợ',
};

const GIAO_LABELS = {
  tan_noi: 'Tận nơi', goi_dien: 'Gọi điện', tu_toi: 'Tự tới',
};

function fmtCurrency(val) {
  if (!val || Number(val) === 0) return '0';
  return Number(val).toLocaleString('vi-VN');
}

// Checkbox helper: X hoặc rỗng
function chk(condition) {
  return condition ? 'X' : ' ';
}

/**
 * Tạo PDF biên nhận — khổ A5 ngang, giống mẫu giấy thực tế TMQ Express
 */
export async function generateBienNhanPDF(bienNhanId) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: {
      van_phong_gui: true,
      van_phong_nhan: true,
      nhan_vien_nhap: { select: { ten: true } },
    },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });

  // Generate QR
  const qrUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/scan/${bn.ma_so}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });

  // Format date
  const ngay = new Date(bn.ngay_nhan);
  const ngayStr = `Ngày ${String(ngay.getDate()).padStart(2, '0')} tháng ${String(ngay.getMonth() + 1).padStart(2, '0')} năm ${ngay.getFullYear()}`;
  const gioStr = ngay.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const docDefinition = {
    pageSize: 'A5',
    pageOrientation: 'landscape',
    pageMargins: [18, 14, 18, 35], // chừa 35pt ở cuối trang cho content không bị đè

    // ══════════════ FOOTER — Điều khoản (cố định sát cuối trang) ══════════════
    footer: {
      margin: [0, 15, 0, 0], // đẩy footer xuống sát đáy (15pt từ đỉnh của khu vực bottom margin)
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 560, y2: 0, lineWidth: 0.5, lineColor: '#999' }], margin: [18, 0, 18, 3] },
        {
          text: [
            'Biên nhận chỉ có giá trị trong vòng 10 ngày. Quá thời hạn mọi khiếu nại sẽ không được giải quyết. ',
            'Khi nhận hàng, quý khách phải mang theo giấy CMND / Giấy giới thiệu. ',
            'Hàng hóa quý khách phải khai báo trị giá. Nếu có rủi ro DN bồi thường 100% trị giá khai báo. ',
            'Nếu không khai báo trị giá, nếu có rủi ro DN bồi thường 10 lần giá cước đã thu. ',
            'Doanh nghiệp không chịu trách nhiệm với mặt hàng dễ cháy nổ, tiền, kim loại quý và hàng Quốc cấm, hàng lậu trong kiện hàng đã niêm phong.',
          ],
          fontSize: 5,
          color: '#666',
          italics: true,
          lineHeight: 1.2,
          margin: [18, 0, 18, 0],
        },
      ],
    },

    content: [
      // ══════════════ HEADER ══════════════
      {
        columns: [
          // Cột trái: Tên công ty + địa chỉ
          {
            width: '58%',
            stack: [
              {
                text: [
                  { text: 'TMQ', bold: true, fontSize: 13, color: '#1e40af' },
                  { text: 'EXPRESS', bold: true, fontSize: 10, color: '#1e40af' },
                  { text: '  CÔNG TY VẬN TẢI THIÊN MINH QUANG', bold: true, fontSize: 10 },
                ],
              },
              { text: 'ĐỊA CHỈ GỬI VÀ NHẬN HÀNG:', bold: true, italics: true, fontSize: 7, margin: [0, 2, 0, 1] },
              { text: `491 Lê Hồng Phong - P.Vườn Lài - TP.HCM - ĐT: ${bn.van_phong_gui?.dien_thoai || '(028) 383.338.79'}`, fontSize: 6.5, color: '#333' },
              { text: '33 Hùng Vương - P.Ninh Kiều - TP.Cần Thơ - ĐT: (0292) 37.687.39', fontSize: 6.5, color: '#333' },
              { text: '39 Nguyễn Văn Trỗi - P.Rạch Giá - An Giang - ĐT: (0297) 39.622.26', fontSize: 6.5, color: '#333' },
            ],
          },
          // Cột phải: BIÊN NHẬN HÀNG HÓA + Gửi tới
          {
            width: '42%',
            stack: [
              { text: 'BIÊN NHẬN HÀNG HÓA', bold: true, fontSize: 12, alignment: 'center' },
              { text: `Gửi tới: ${bn.van_phong_nhan.ten}`, italics: true, bold: true, fontSize: 9, alignment: 'center', margin: [0, 1, 0, 0] },
            ],
          },
        ],
      },

      // ══════════════ DÒNG KẺ ══════════════
      { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 560, y2: 3, lineWidth: 1 }], margin: [0, 2, 0, 3] },

      // ══════════════ MÃ SỐ / GIÁ CƯỚC + TT THU + QR ══════════════
      {
        columns: [
          // ── Cột 1: Mã số + Giá cước ──
          {
            width: '38%',
            stack: [
              {
                table: {
                  widths: [45, '*'],
                  body: [
                    [
                      { text: 'Mã số:', fontSize: 8, border: [false, false, false, false] },
                      { text: bn.ma_so, bold: true, fontSize: 10, alignment: 'center', border: [true, true, true, true] },
                    ],
                  ],
                },
                layout: { paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 1, paddingBottom: () => 1 },
                margin: [0, 0, 0, 2],
              },
              {
                table: {
                  widths: [45, '*'],
                  body: [
                    [
                      { text: 'Giá cước:', fontSize: 8, border: [false, false, false, false] },
                      { text: fmtCurrency(bn.gia_cuoc), bold: true, fontSize: 10, alignment: 'center', border: [true, true, true, true] },
                    ],
                  ],
                },
                layout: { paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 1, paddingBottom: () => 1 },
              },
            ],
          },
          // ── Cột 2: TT thu (checkboxes) ──
          {
            width: '32%',
            stack: [
              {
                table: {
                  widths: ['*', 16],
                  body: [
                    [
                      { text: 'Đã thu:', fontSize: 8, alignment: 'right', border: [false, false, false, false] },
                      { text: chk(bn.trang_thai_thu === 'da_thu'), fontSize: 8, alignment: 'center', border: [true, true, true, true] },
                    ],
                    [
                      { text: 'Chưa thu:', fontSize: 8, alignment: 'right', border: [false, false, false, false] },
                      { text: chk(bn.trang_thai_thu === 'chua_thu'), fontSize: 8, alignment: 'center', border: [true, true, true, true] },
                    ],
                    [
                      { text: 'Công nợ:', fontSize: 8, alignment: 'right', border: [false, false, false, false] },
                      { text: chk(bn.trang_thai_thu === 'cong_no'), fontSize: 8, alignment: 'center', border: [true, true, true, true] },
                    ],
                  ],
                },
                layout: { paddingLeft: () => 1, paddingRight: () => 1, paddingTop: () => 0, paddingBottom: () => 0 },
              },
            ],
            margin: [6, 0, 0, 0],
          },
          // ── Cột 3: QR code ──
          {
            width: '30%',
            stack: [
              { image: qrDataUrl, width: 55, height: 55, alignment: 'center', margin: [0, 0, 0, 1] },
              { text: 'Quét QR tra cứu', fontSize: 5.5, color: '#888', alignment: 'center' },
            ],
            margin: [6, 0, 0, 0],
          },
        ],
      },

      // ══════════════ DÒNG KẺ ══════════════
      { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 560, y2: 2, lineWidth: 0.5 }], margin: [0, 4, 0, 4] },

      // ══════════════ NGƯỜI GỬI + NGƯỜI NHẬN (nằm ngang nhau) ══════════════
      {
        columns: [
          // ── Cột trái: Người gửi ──
          {
            width: '50%',
            stack: [
              { text: 'NGƯỜI GỬI', bold: true, fontSize: 8.5, color: '#1e40af', decoration: 'underline', margin: [0, 0, 0, 3] },
              { text: [{ text: 'Đơn vị gửi: ', fontSize: 8 }, { text: bn.don_vi_gui || '', bold: true, fontSize: 8 }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Họ tên người gửi: ', fontSize: 8 }, { text: bn.nguoi_gui || '', bold: true, fontSize: 8 }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Điện thoại: ', fontSize: 8 }, { text: bn.dien_thoai_gui || '', fontSize: 8 }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Địa chỉ: ', fontSize: 8 }, { text: bn.dia_chi_gui || '', fontSize: 8 }] },
            ],
          },
          // ── Cột phải: Người nhận ──
          {
            width: '50%',
            stack: [
              { text: 'NGƯỜI NHẬN', bold: true, fontSize: 8.5, color: '#1e40af', decoration: 'underline', margin: [0, 0, 0, 3] },
              { text: [{ text: 'Đơn vị nhận: ', fontSize: 8 }, { text: bn.don_vi_nhan || '', bold: true, fontSize: 8 }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Họ tên người nhận: ', fontSize: 8 }, { text: bn.nguoi_nhan || '', bold: true, fontSize: 8 }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Điện thoại: ', fontSize: 8 }, { text: bn.dien_thoai_nhan || '', fontSize: 8 }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Địa chỉ: ', fontSize: 8 }, { text: bn.dia_chi_nhan || '', fontSize: 8 }], margin: [0, 0, 0, 2] },
              { text: [{ text: 'Số CCCD: ', fontSize: 8 }, { text: bn.so_cccd || '', fontSize: 8 }] },
            ],
            margin: [10, 0, 0, 0],
          },
        ],
      },

      // ══════════════ DÒNG KẺ ══════════════
      { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 560, y2: 2, lineWidth: 0.5 }], margin: [0, 4, 0, 4] },

      // ══════════════ THÔNG TIN HÀNG HÓA — 3 cột ══════════════
      {
        columns: [
          // ── Cột 1: Thông tin hàng hóa (60%) ──
          {
            width: '60%',
            stack: [
              { text: [{ text: 'Tên hàng / Số lượng: ', fontSize: 8 }, { text: bn.ten_hang_hoa || '', bold: true, fontSize: 8 }] },
              { text: `Thu hộ: ${fmtCurrency(bn.thu_ho)} (đồng).`, fontSize: 8, margin: [0, 4, 0, 4] },
              bn.trong_luong
                ? { text: `Trọng lượng: ${bn.trong_luong} kg`, fontSize: 8, margin: [0, 0, 0, 4] }
                : { text: '', fontSize: 1 },
              bn.gia_tri_hang
                ? { text: `Giá trị hàng: ${fmtCurrency(bn.gia_tri_hang)} đ`, fontSize: 8, margin: [0, 0, 0, 4] }
                : { text: '', fontSize: 1 },
              { text: `Gởi lúc: ${gioStr} - ${ngayStr}`, fontSize: 8, margin: [0, 3, 0, 0] },
            ],
          },
          // ── Cột 2: Các checkbox tùy chọn (40%) ──
          {
            width: '40%',
            stack: [
              {
                columns: [
                  { text: 'Hàng hư / bể không đền:', fontSize: 8, width: 110 },
                  {
                    table: {
                      widths: [14],
                      body: [[{ text: chk(bn.hang_hu_khong_den), fontSize: 7, alignment: 'center' }]],
                    },
                    width: 20,
                    layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                  },
                ],
                margin: [0, 0, 0, 4],
              },
              {
                columns: [
                  { text: 'Giao tận nơi:', fontSize: 8, width: 110 },
                  {
                    table: {
                      widths: [14],
                      body: [[{ text: chk(bn.hinh_thuc_giao === 'tan_noi'), fontSize: 7, alignment: 'center' }]],
                    },
                    width: 20,
                    layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                  },
                ],
                margin: [0, 0, 0, 4],
              },
              {
                columns: [
                  { text: 'Điện thoại đến nhận:', fontSize: 8, width: 110 },
                  {
                    table: {
                      widths: [14],
                      body: [[{ text: chk(bn.hinh_thuc_giao === 'goi_dien'), fontSize: 7, alignment: 'center' }]],
                    },
                    width: 20,
                    layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                  },
                ],
                margin: [0, 0, 0, 4],
              },
              {
                columns: [
                  { text: 'Tự đến lấy:', fontSize: 8, width: 110 },
                  {
                    table: {
                      widths: [14],
                      body: [[{ text: chk(bn.hinh_thuc_giao === 'tu_toi'), fontSize: 7, alignment: 'center' }]],
                    },
                    width: 20,
                    layout: { paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
                  },
                ],
              },
            ],
            margin: [6, 0, 0, 0],
          },
        ],
      },

      // ══════════════ CHỮ KÝ — 3 cột ══════════════
      {
        columns: [
          {
            width: '33%',
            stack: [
              { text: ' ', fontSize: 18 },
              { text: 'NGƯỜI GỬI', bold: true, fontSize: 8, alignment: 'center' },
            ],
          },
          {
            width: '34%',
            stack: [
              { text: ' ', fontSize: 18 },
              { text: 'NGƯỜI NHẬN', bold: true, fontSize: 8, alignment: 'center' },
            ],
          },
          {
            width: '33%',
            stack: [
              { text: ' ', fontSize: 18 },
              { text: 'NV. PHỤC VỤ', bold: true, fontSize: 8, alignment: 'right' },
              { text: bn.nhan_vien_nhap.ten, fontSize: 7, color: '#666', alignment: 'right' },
            ],
          },
        ],
        margin: [0, 4, 0, 0],
      },
    ],

    defaultStyle: {
      font: 'Roboto',
    },
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

// ---- Phiếu Thu PDF ----
export async function generatePhieuThuPDF(phieuThuId) {
  const pt = await prisma.phieuThu.findUnique({
    where: { id: phieuThuId },
    include: { nhan_vien: { select: { ten: true } } },
  });
  if (!pt) throw Object.assign(new Error('Không tìm thấy phiếu thu'), { statusCode: 404 });

  const printer = new PdfPrinter(fonts);
  const fmt = (n) => Number(n).toLocaleString('vi-VN');

  const docDefinition = {
    pageSize: 'A5',
    pageMargins: [25, 20, 25, 20],
    content: [
      { text: 'TMQ EXPRESS', fontSize: 12, bold: true, color: '#1E40AF', alignment: 'center' },
      { text: 'PHIẾU THU', fontSize: 16, bold: true, alignment: 'center', margin: [0, 8, 0, 4] },
      { text: `Số: ${pt.ma_phieu}`, alignment: 'center', fontSize: 10, color: '#666' },
      { text: `Ngày: ${new Date(pt.ngay_thu).toLocaleDateString('vi-VN')}`, alignment: 'center', fontSize: 9, color: '#888', margin: [0, 2, 0, 12] },
      { text: `Đối tượng: ${pt.doi_tuong}`, fontSize: 10, margin: [0, 0, 0, 4] },
      { text: `Lý do: ${pt.ly_do}`, fontSize: 10, margin: [0, 0, 0, 4] },
      { text: `Số tiền: ${fmt(pt.so_tien)} đ`, fontSize: 12, bold: true, margin: [0, 0, 0, 4] },
      { text: `Hình thức: ${pt.hinh_thuc === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'}`, fontSize: 10, margin: [0, 0, 0, 4] },
      { text: `Người lập: ${pt.nhan_vien.ten}`, fontSize: 9, color: '#666', margin: [0, 8, 0, 0] },
      {
        columns: [
          { text: 'Người nộp\n\n\n\n_______________', alignment: 'center', fontSize: 9, margin: [0, 20, 0, 0] },
          { text: 'Người lập phiếu\n\n\n\n_______________', alignment: 'center', fontSize: 9, margin: [0, 20, 0, 0] },
        ],
      },
    ],
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
export async function generatePhieuChiPDF(phieuChiId) {
  const pc = await prisma.phieuChi.findUnique({
    where: { id: phieuChiId },
    include: { nhan_vien: { select: { ten: true } } },
  });
  if (!pc) throw Object.assign(new Error('Không tìm thấy phiếu chi'), { statusCode: 404 });

  const printer = new PdfPrinter(fonts);
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
