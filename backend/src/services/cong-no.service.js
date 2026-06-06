import prisma from '../config/database.js';
import ExcelJS from 'exceljs';
import PdfPrinter from 'pdfmake/src/printer.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const fontsDir   = join(__dirname, '../../fonts');
const logoPath   = join(__dirname, '../assets/logo.jpg');

const _fonts = {
  Roboto: {
    normal:      join(fontsDir, 'Roboto-Regular.ttf'),
    bold:        join(fontsDir, 'Roboto-Medium.ttf'),
    italics:     join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
};
const _printer = new PdfPrinter(_fonts);
let _logo;
function getLogo() {
  if (_logo !== undefined) return _logo;
  try { _logo = `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString('base64')}`; }
  catch { _logo = null; }
  return _logo;
}

export async function listCongNo({ trang_thai, page = 1, limit = 20, search }) {
  const where = {};
  const _page = Number(page) || 1;
  const _limit = Math.min(Number(limit) || 20, 100);
  if (trang_thai) {
    where.trang_thai = { in: trang_thai.split(',') };
  }
  if (search) {
    where.OR = [
      { doi_tuong: { contains: search, mode: 'insensitive' } },
      { bien_nhan: { ma_so: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.congNo.findMany({
      where,
      skip: (_page - 1) * _limit,
      take: _limit,
      orderBy: { ngay_phat_sinh: 'desc' },
      include: {
        bien_nhan: { select: { ma_so: true, don_vi_gui: true, don_vi_nhan: true, gia_cuoc: true } },
        phieu_thu: { select: { ma_phieu: true } },
      },
    }),
    prisma.congNo.count({ where }),
    prisma.congNo.aggregate({
      where: { trang_thai: { in: ['chua_thu', 'qua_han'] } },
      _sum: { so_tien_no: true },
      _count: true,
    }),
  ]);

  // Check quá hạn (>30 ngày)
  const now = new Date();
  const enriched = data.map((cn) => {
    const ngayPhatSinh = new Date(cn.ngay_phat_sinh);
    const daysDiff = Math.floor((now - ngayPhatSinh) / (1000 * 60 * 60 * 24));
    return { ...cn, qua_han: daysDiff > 30 && cn.trang_thai === 'chua_thu', so_ngay: daysDiff };
  });

  return {
    data: enriched,
    summary: {
      tong_no: Number(summary._sum.so_tien_no || 0),
      so_cong_no: summary._count,
    },
    pagination: { page: _page, limit: _limit, total, totalPages: Math.ceil(total / _limit) },
  };
}

export async function xacNhanThanhToan(congNoId, { hinh_thuc, ghi_chu }, user) {
  const cn = await prisma.congNo.findUnique({
    where: { id: congNoId },
    include: { bien_nhan: true },
  });
  if (!cn) throw Object.assign(new Error('Không tìm thấy công nợ'), { statusCode: 404 });
  if (cn.trang_thai === 'da_thu') {
    throw Object.assign(new Error('Công nợ đã được thu'), { statusCode: 400 });
  }

  // Tạo phiếu thu an toàn (retry on unique violation) + cập nhật công nợ
  const phieuThu = await createWithCode(
    (ma_phieu) => prisma.$transaction(async (tx) => {
      const pt = await tx.phieuThu.create({
        data: {
          ma_phieu,
          doi_tuong: cn.doi_tuong,
          ly_do: `Thu công nợ BN ${cn.bien_nhan.ma_so}${ghi_chu ? ` - ${ghi_chu}` : ''}`,
          so_tien: cn.so_tien_no,
          hinh_thuc: hinh_thuc || 'tien_mat',
          van_phong_id: user.van_phong_id,
          nhan_vien_id: user.id,
          bien_nhan_id: cn.bien_nhan_id,
        },
      });

      await tx.congNo.update({
        where: { id: congNoId },
        data: {
          trang_thai: 'da_thu',
          ngay_thu: new Date(),
          phieu_thu_id: pt.id,
        },
      });

      // [Fix #5] Cập nhật trang_thai_thu của BienNhan → 'da_thu'
      // Để doanh thu tính đúng: công nợ đã thu = đã thu cước
      await tx.bienNhan.update({
        where: { id: cn.bien_nhan_id },
        data: { trang_thai_thu: 'da_thu' },
      });

      return pt;
    }),
    'phieuThu', 'ma_phieu', 'PT',
  );

  // M-01: Ghi audit log sau khi thu công nợ thành công
  writeAuditLog({
    action: 'UPDATE', entity: 'cong_no', entityId: congNoId,
    oldData: { trang_thai: cn.trang_thai },
    newData: { trang_thai: 'da_thu', phieu_thu: phieuThu.ma_phieu },
  });

  return { phieu_thu: { id: phieuThu.id, ma_phieu: phieuThu.ma_phieu } };
}

/**
 * Báo cáo công nợ chi tiết theo đối tượng + khoảng thời gian
 */
export async function reportCongNo(doiTuong, fromDate, toDate) {
  const where = {};
  if (doiTuong) {
    where.doi_tuong = { contains: doiTuong, mode: 'insensitive' };
  }
  if (fromDate || toDate) {
    where.ngay_phat_sinh = {};
    if (fromDate) where.ngay_phat_sinh.gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      where.ngay_phat_sinh.lte = end;
    }
  }

  const data = await prisma.congNo.findMany({
    where,
    orderBy: { ngay_phat_sinh: 'asc' },
    include: {
      bien_nhan: {
        select: {
          ma_so: true, ten_hang_hoa: true, gia_cuoc: true,
          don_vi_gui: true, nguoi_gui: true, ngay_bien_nhan: true,
        },
      },
      phieu_thu: { select: { id: true, ma_phieu: true } },
    },
  });

  const tongNo = data.filter(cn => cn.trang_thai !== 'da_thu').reduce((sum, cn) => sum + Number(cn.so_tien_no), 0);
  const tongDaThu = data.filter(cn => cn.trang_thai === 'da_thu').reduce((sum, cn) => sum + Number(cn.so_tien_no), 0);
  const tongTatCa = data.reduce((sum, cn) => sum + Number(cn.so_tien_no), 0);

  return {
    data,
    summary: {
      tong_tat_ca: tongTatCa,
      tong_da_thu: tongDaThu,
      tong_con_no: tongNo,
      so_cong_no: data.length,
    },
  };
}

/**
 * Đối soát cước: tổng cước BN trong tháng theo đối tượng (khách hàng)
 * Phục vụ cân đối HĐĐT
 */
export async function doiSoatCuoc(doiTuong, thang, nam) {
  const month = parseInt(thang, 10);
  const year = parseInt(nam, 10);
  if (!month || !year) throw Object.assign(new Error('Thiếu tháng/năm'), { statusCode: 400 });

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Tìm tất cả BN của đối tượng trong tháng
  const whereBase = {
    ngay_bien_nhan: { gte: startDate, lte: endDate },
  };
  if (doiTuong) {
    whereBase.OR = [
      { don_vi_gui: { contains: doiTuong, mode: 'insensitive' } },
      { nguoi_gui: { contains: doiTuong, mode: 'insensitive' } },
    ];
  }

  const bienNhans = await prisma.bienNhan.findMany({
    where: whereBase,
    select: { id: true, gia_cuoc: true, can_xuat_hddt: true, da_vao_bang_ke: true },
  });

  // Cộng thêm dòng tự kê (Case B — bien_nhan_id = null) trong bảng kê tháng này
  // Lọc theo nguoi_gui nếu có chỉ định doi_tuong
  const manualWhereBase = {
    bien_nhan_id: null,
    bang_ke: { ngay_xuat: { gte: startDate, lte: endDate } },
  };
  if (doiTuong) {
    manualWhereBase.nguoi_gui = { contains: doiTuong, mode: 'insensitive' };
  }
  const manualRows = await prisma.bangKeChiTiet.findMany({
    where: manualWhereBase,
    select: { gia_cuoc: true },
  });
  const tongCuocTuKe = manualRows.reduce((s, r) => s + Number(r.gia_cuoc), 0);

  const tongBN = bienNhans.length;
  const tongCuocThucTe = bienNhans.reduce((s, bn) => s + Number(bn.gia_cuoc), 0);
  const tongCuocHddtDaXuat = bienNhans.filter(bn => bn.da_vao_bang_ke).reduce((s, bn) => s + Number(bn.gia_cuoc), 0);
  const tongCuocHddtChoXuat = bienNhans.filter(bn => bn.can_xuat_hddt && !bn.da_vao_bang_ke).reduce((s, bn) => s + Number(bn.gia_cuoc), 0);

  return {
    doi_tuong: doiTuong || 'Tất cả',
    thang: `${String(month).padStart(2, '0')}/${year}`,
    tong_bien_nhan: tongBN,
    tong_cuoc_thuc_te: tongCuocThucTe,
    // HĐDT đã xuất = từ BN thực + dòng tự kê trong bảng kê tháng này
    tong_cuoc_hddt_da_xuat: tongCuocHddtDaXuat + tongCuocTuKe,
    tong_cuoc_hddt_cho_xuat: tongCuocHddtChoXuat,
    // Chi tiết
    tong_cuoc_hddt_bn_thuc: tongCuocHddtDaXuat,
    tong_cuoc_hddt_tu_ke: tongCuocTuKe,
  };
}

/**
 * Group công nợ theo đối tượng trong 1 tháng
 * @param {number} thang - 1..12
 * @param {number} nam
 */
export async function bangKeCongNoTheoThang(thang, nam) {
  const month = parseInt(thang, 10);
  const year  = parseInt(nam, 10);
  if (!month || month < 1 || month > 12 || !year) {
    throw Object.assign(new Error('Tháng/năm không hợp lệ'), { statusCode: 400 });
  }

  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);

  const data = await prisma.congNo.findMany({
    where: { ngay_phat_sinh: { gte: start, lte: end } },
    orderBy: [{ doi_tuong: 'asc' }, { ngay_phat_sinh: 'asc' }],
    include: {
      bien_nhan: {
        select: {
          ma_so: true,
          ten_hang_hoa: true,
          gia_cuoc: true,
          ngay_bien_nhan: true,
        },
      },
      phieu_thu: { select: { ma_phieu: true } },
    },
  });

  // Group theo doi_tuong
  const grouped = {};
  for (const cn of data) {
    const key = cn.doi_tuong || 'Không rõ';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cn);
  }

  return Object.entries(grouped).map(([doi_tuong, items]) => {
    const tong   = items.reduce((s, i) => s + Number(i.so_tien_no), 0);
    const da_thu = items
      .filter(i => i.trang_thai === 'da_thu')
      .reduce((s, i) => s + Number(i.so_tien_no), 0);
    return {
      doi_tuong,
      so_cong_no: items.length,
      tong,
      da_thu,
      con_no: tong - da_thu,
      items,
    };
  });
}

/**
 * Xuất Excel bảng kê công nợ
 * @param {number} thang
 * @param {number} nam
 * @param {string|null} doiTuong - null = xuất tất cả (đối tượng 1 sheet)
 */
export async function exportBangKeCongNo(thang, nam, doiTuong) {
  const groups  = await bangKeCongNoTheoThang(thang, nam);
  const targets = doiTuong
    ? groups.filter(g => g.doi_tuong === doiTuong)
    : groups;

  if (!targets.length) {
    throw Object.assign(
      new Error('Không có công nợ trong tháng này' + (doiTuong ? ` cho “${doiTuong}”` : '')),
      { statusCode: 404 },
    );
  }

  const monthStr = `${String(thang).padStart(2, '0')}/${nam}`;
  const wb = new ExcelJS.Workbook();

  for (const group of targets) {
    const sheetName = group.doi_tuong.replace(/[\\/*?[\]]/g, '').slice(0, 31);
    const ws = wb.addWorksheet(sheetName);

    // Column widths
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 11;
    ws.getColumn(3).width = 14;
    ws.getColumn(4).width = 24;
    ws.getColumn(5).width = 14;
    ws.getColumn(6).width = 22;

    // Title
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'BẢNG KÊ CÔNG NỢ';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 24;

    ws.mergeCells('A2:F2');
    ws.getCell('A2').value = `Đối tượng: ${group.doi_tuong}`;
    ws.getCell('A2').font = { bold: true, size: 11 };

    ws.mergeCells('A3:F3');
    ws.getCell('A3').value = `Tháng: ${monthStr}`;
    ws.getCell('A3').font = { size: 10, color: { argb: 'FF555555' } };

    // Header
    const headerRow = ws.addRow(['STT', 'Ngày', 'Mã BN', 'Hàng hoá', 'Cước', 'Trạng thái']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    // Data rows
    group.items.forEach((cn, i) => {
      const trangThai = cn.trang_thai === 'da_thu'
        ? `Đã thu${cn.phieu_thu?.ma_phieu ? ' (' + cn.phieu_thu.ma_phieu + ')' : ''}`
        : 'Chưa thu';
      const d = new Date(cn.ngay_phat_sinh);
      const ngayStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

      const row = ws.addRow([
        i + 1,
        ngayStr,
        cn.bien_nhan?.ma_so || '',
        cn.bien_nhan?.ten_hang_hoa || '',
        Number(cn.so_tien_no),
        trangThai,
      ]);
      row.getCell(5).numFmt = '#,##0';
      row.getCell(5).alignment = { horizontal: 'right' };
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
        });
      }
      row.eachCell((cell) => {
        cell.border = { bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
      });
      if (cn.trang_thai !== 'da_thu') {
        row.getCell(6).font = { color: { argb: 'FFDC2626' }, bold: true };
      }
    });

    // Footer rows helper
    const addSumRow = (label, value, argb) => {
      const row = ws.addRow(['', '', '', '', value, label]);
      row.font = { bold: true };
      row.getCell(5).numFmt = '#,##0';
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'left' };
      if (argb) row.getCell(5).font = { bold: true, color: { argb } };
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      });
      return row;
    };

    const t1 = addSumRow('Tổng cộng', group.tong, null);
    t1.eachCell((cell) => { cell.border = { top: { style: 'medium' } }; });
    addSumRow('Đã thu', group.da_thu, 'FF16A34A');
    addSumRow('CÒN NỢ', group.con_no, 'FFDC2626');
  }

  const buffer = await wb.xlsx.writeBuffer();
  const ten_file = doiTuong
    ? `CongNo_${doiTuong.replace(/\s+/g, '_').slice(0, 30)}_T${thang}_${nam}.xlsx`
    : `CongNo_TatCa_T${thang}_${nam}.xlsx`;
  return { buffer, ten_file };
}

// ─────────────────────────────────────────────────────────────────────────────
// Xuất PDF báo cáo công nợ chi tiết cho 1 đối tượng trong 1 tháng
// ─────────────────────────────────────────────────────────────────────────────
export async function exportCongNoPDF(thang, nam, doiTuong) {
  const groups = await bangKeCongNoTheoThang(thang, nam);
  const group  = groups.find(g => g.doi_tuong === doiTuong);
  if (!group) {
    throw Object.assign(
      new Error(`Không có công nợ tháng ${thang}/${nam} cho "${doiTuong}"`),
      { statusCode: 404 },
    );
  }

  const monthStr = `${String(thang).padStart(2, '0')}/${nam}`;
  const logoDataUrl = getLogo();

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString('vi-VN');
  }
  function fmtDate(d) {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
  }

  // Build table body
  const headerRow = [
    { text: 'STT', style: 'th', alignment: 'center' },
    { text: 'Ngày',     style: 'th', alignment: 'center' },
    { text: 'Mã BN',    style: 'th', alignment: 'center' },
    { text: 'Hàng hoá', style: 'th' },
    { text: 'Số tiền nợ', style: 'th', alignment: 'right' },
    { text: 'Trạng thái', style: 'th', alignment: 'center' },
  ];

  const dataRows = group.items.map((cn, i) => {
    const trangThai = cn.trang_thai === 'da_thu'
      ? `Đã thu${cn.phieu_thu?.ma_phieu ? '\n(' + cn.phieu_thu.ma_phieu + ')' : ''}`
      : 'Chưa thu';
    const isUnpaid = cn.trang_thai !== 'da_thu';
    return [
      { text: i + 1, alignment: 'center', fontSize: 9 },
      { text: fmtDate(cn.ngay_phat_sinh), alignment: 'center', fontSize: 9 },
      { text: cn.bien_nhan?.ma_so || '—', alignment: 'center', fontSize: 9 },
      { text: cn.bien_nhan?.ten_hang_hoa || '—', fontSize: 9 },
      { text: fmtMoney(cn.so_tien_no), alignment: 'right', fontSize: 9 },
      { text: trangThai, alignment: 'center', fontSize: 8.5, color: isUnpaid ? '#DC2626' : '#16A34A', bold: isUnpaid },
    ];
  });

  const footerRows = [
    [
      { text: 'Tổng cộng', colSpan: 4, alignment: 'right', bold: true, fontSize: 9, color: '#1E293B' }, {}, {}, {},
      { text: fmtMoney(group.tong) + 'đ', alignment: 'right', bold: true, fontSize: 9 },
      { text: '', fontSize: 9 },
    ],
    [
      { text: 'Đã thu', colSpan: 4, alignment: 'right', bold: true, fontSize: 9, color: '#16A34A' }, {}, {}, {},
      { text: fmtMoney(group.da_thu) + 'đ', alignment: 'right', bold: true, fontSize: 9, color: '#16A34A' },
      { text: '', fontSize: 9 },
    ],
    [
      { text: 'CÒN NỢ', colSpan: 4, alignment: 'right', bold: true, fontSize: 10, color: '#DC2626' }, {}, {}, {},
      { text: fmtMoney(group.con_no) + 'đ', alignment: 'right', bold: true, fontSize: 10, color: '#DC2626' },
      { text: '', fontSize: 9 },
    ],
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [36, 36, 36, 60],

    styles: {
      th: { bold: true, fillColor: '#1E40AF', color: '#FFFFFF', fontSize: 9, margin: [2, 4, 2, 4] },
      header: { fontSize: 16, bold: true, alignment: 'center', color: '#1E293B' },
      subHeader: { fontSize: 10, alignment: 'center', color: '#475569', margin: [0, 2, 0, 0] },
      label: { fontSize: 9.5, bold: true, color: '#374151' },
      value: { fontSize: 9.5, color: '#111827' },
    },

    content: [
      // Header
      {
        columns: [
          logoDataUrl
            ? { image: logoDataUrl, width: 60, margin: [0, 0, 12, 0] }
            : { text: '', width: 60 },
          {
            stack: [
              { text: 'BÁO CÁO CÔNG NỢ CHI TIẾT', style: 'header' },
              { text: `Tháng ${monthStr}`, style: 'subHeader' },
              { text: `Đối tượng: ${doiTuong}`, style: 'subHeader', bold: true, color: '#1E40AF', fontSize: 11 },
            ],
            alignment: 'center',
          },
        ],
        margin: [0, 0, 0, 16],
      },

      // Summary strip
      {
        table: {
          widths: ['*', '*', '*'],
          body: [[
            { text: `Số phiếu: ${group.so_cong_no}`, alignment: 'center', fontSize: 9.5, border: [true,true,true,true] },
            { text: `Tổng nợ: ${fmtMoney(group.tong)}đ`, alignment: 'center', fontSize: 9.5, bold: true, border: [true,true,true,true] },
            { text: `Còn nợ: ${fmtMoney(group.con_no)}đ`, alignment: 'center', fontSize: 9.5, bold: true, color: '#DC2626', border: [true,true,true,true] },
          ]],
        },
        margin: [0, 0, 0, 12],
        layout: { fillColor: () => '#DBEAFE' },
      },

      // Detail table
      {
        table: {
          headerRows: 1,
          widths: [24, 56, 72, '*', 80, 74],
          body: [headerRow, ...dataRows, ...footerRows],
        },
        layout: {
          hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length - 3 ? 1.5 : 0.5),
          vLineWidth: () => 0.5,
          hLineColor: () => '#CBD5E1',
          vLineColor: () => '#CBD5E1',
          fillColor: (rowIndex) => {
            if (rowIndex === 0) return '#1E40AF';
            if (rowIndex > group.items.length) return '#EFF6FF';
            return rowIndex % 2 === 0 ? '#F8FAFC' : null;
          },
        },
      },
    ],

    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `Ngày in: ${new Date().toLocaleDateString('vi-VN')}`, fontSize: 8, color: '#94A3B8', margin: [36, 0, 0, 0] },
        { text: `Trang ${currentPage}/${pageCount}`, fontSize: 8, color: '#94A3B8', alignment: 'center' },
        { text: 'TMQ Express — Hệ thống quản lý vận chuyển', fontSize: 8, color: '#94A3B8', alignment: 'right', margin: [0, 0, 36, 0] },
      ],
    }),
  };

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = _printer.createPdfKitDocument(docDefinition);
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const filename = `CongNo_${doiTuong.replace(/\s+/g, '_').slice(0, 30)}_T${thang}_${nam}.pdf`;
      resolve({ buffer, filename });
    });
    doc.on('error', reject);
    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Đối soát cước chi tiết: so sánh cước thực tế vs HĐĐT cho tất cả đối tượng
// Phát hiện bất thường: gửi ít BN nhưng xuất HĐĐT giá trị cao
// ─────────────────────────────────────────────────────────────────────────────
export async function doiSoatCuocChiTiet(thang, nam) {
  const month = parseInt(thang, 10);
  const year  = parseInt(nam, 10);
  if (!month || month < 1 || month > 12 || !year) {
    throw Object.assign(new Error('Tháng/năm không hợp lệ'), { statusCode: 400 });
  }

  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Lấy tất cả BN trong tháng
  const bienNhans = await prisma.bienNhan.findMany({
    where: { ngay_bien_nhan: { gte: start, lte: end } },
    select: {
      id: true,
      don_vi_gui: true,
      nguoi_gui: true,
      gia_cuoc: true,
      can_xuat_hddt: true,
      da_vao_bang_ke: true,
      trang_thai_thu: true,
    },
  });

  // 2a. Lấy BangKeChiTiet có bien_nhan_id (Case A — HĐDT từ BN thực)
  const bangKeChiTiet = await prisma.bangKeChiTiet.findMany({
    where: {
      bien_nhan_id: { in: bienNhans.map(bn => bn.id) },
    },
    select: { bien_nhan_id: true, gia_cuoc: true },
  });
  const hddtMap = new Map();
  for (const ct of bangKeChiTiet) {
    if (ct.bien_nhan_id == null) continue;
    hddtMap.set(ct.bien_nhan_id, (hddtMap.get(ct.bien_nhan_id) || 0) + Number(ct.gia_cuoc));
  }

  // 2b. Lấy BangKeChiTiet KHÔNG có bien_nhan_id (Case B — dòng tự kê)
  //     Lọc theo bảng kê có ngay_xuat trong tháng để đúng kỳ đối soát
  const manualChiTiet = await prisma.bangKeChiTiet.findMany({
    where: {
      bien_nhan_id: null,
      bang_ke: { ngay_xuat: { gte: start, lte: end } },
    },
    select: { nguoi_gui: true, gia_cuoc: true },
  });

  // Map: tên đối tượng (lowercase) → tổng cước tự kê
  const manualByName = new Map();
  for (const ct of manualChiTiet) {
    const key = (ct.nguoi_gui || '').trim().toLowerCase();
    if (!key) continue;
    manualByName.set(key, (manualByName.get(key) || 0) + Number(ct.gia_cuoc));
  }

  // 3. Group theo đối tượng (don_vi_gui || nguoi_gui)
  const doiTuongMap = new Map();
  for (const bn of bienNhans) {
    const key = bn.don_vi_gui || bn.nguoi_gui || 'Không rõ';
    if (!doiTuongMap.has(key)) {
      doiTuongMap.set(key, { doi_tuong: key, so_bn: 0, cuoc_thuc_te: 0, cuoc_hddt: 0, cuoc_hddt_tu_ke: 0, so_bn_hddt: 0 });
    }
    const g = doiTuongMap.get(key);
    g.so_bn++;
    g.cuoc_thuc_te += Number(bn.gia_cuoc || 0);
    const hddt = hddtMap.get(bn.id) || 0;
    if (hddt > 0) {
      g.cuoc_hddt += hddt;
      g.so_bn_hddt++;
    }
  }

  // 3b. Cộng cước tự kê vào đối tượng tương ứng (khớp tên case-insensitive)
  //     Nếu không khớp với đối tượng nào đã biết → tạo nhóm mới
  for (const [nameKey, cuocTuKe] of manualByName.entries()) {
    // Tìm đối tượng có tên khớp (case-insensitive)
    let matched = null;
    for (const [mapKey, g] of doiTuongMap.entries()) {
      if (mapKey.toLowerCase() === nameKey) {
        matched = g;
        break;
      }
    }
    if (matched) {
      matched.cuoc_hddt     += cuocTuKe;
      matched.cuoc_hddt_tu_ke += cuocTuKe;
    } else {
      // Không khớp BN nào → tạo nhóm riêng (chỉ có HĐDT tự kê, không có BN thực)
      const displayName = manualChiTiet.find(
        ct => (ct.nguoi_gui || '').trim().toLowerCase() === nameKey,
      )?.nguoi_gui || nameKey;
      doiTuongMap.set(`__manual__${nameKey}`, {
        doi_tuong: displayName,
        so_bn: 0,
        cuoc_thuc_te: 0,
        cuoc_hddt: cuocTuKe,
        cuoc_hddt_tu_ke: cuocTuKe,
        so_bn_hddt: 0,
      });
    }
  }

  // 4. Tính chênh lệch + flag bất thường
  const result = Array.from(doiTuongMap.values()).map(g => {
    const chenh_lech = g.cuoc_hddt - g.cuoc_thuc_te;
    // Cờ bất thường: xuất HĐĐT nhiều hơn cước thực tế, HOẶC gửi ≤5 BN nhưng xuất HĐĐT >1 triệu
    const bat_thuong = chenh_lech > 0 || (g.so_bn <= 5 && g.cuoc_hddt > 1_000_000);
    return { ...g, chenh_lech, bat_thuong };
  });

  // Sắp xếp: bất thường lên đầu, sau đó theo cước thực tế giảm dần
  result.sort((a, b) => {
    if (a.bat_thuong !== b.bat_thuong) return a.bat_thuong ? -1 : 1;
    return b.cuoc_thuc_te - a.cuoc_thuc_te;
  });

  const tong_hop = result.reduce((acc, g) => ({
    so_doi_tuong:     acc.so_doi_tuong + 1,
    tong_bn:          acc.tong_bn + g.so_bn,
    cuoc_thuc_te:     acc.cuoc_thuc_te + g.cuoc_thuc_te,
    cuoc_hddt:        acc.cuoc_hddt + g.cuoc_hddt,
    cuoc_hddt_tu_ke:  acc.cuoc_hddt_tu_ke + (g.cuoc_hddt_tu_ke || 0),
    so_bat_thuong:    acc.so_bat_thuong + (g.bat_thuong ? 1 : 0),
  }), { so_doi_tuong: 0, tong_bn: 0, cuoc_thuc_te: 0, cuoc_hddt: 0, cuoc_hddt_tu_ke: 0, so_bat_thuong: 0 });

  return { data: result, tong_hop };
}
