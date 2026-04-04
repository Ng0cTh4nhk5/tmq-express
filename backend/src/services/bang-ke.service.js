import prisma from '../config/database.js';
import ExcelJS from 'exceljs';
import { generateCode } from '../utils/ma-so-generator.js';

/**
 * DS biên nhận đánh dấu HĐĐT & chưa vào bảng kê
 */
export async function getBienNhanCho({ ngay }) {
  const where = {
    can_xuat_hddt: true,
    da_vao_bang_ke: false,
  };
  if (ngay) {
    const start = new Date(ngay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ngay);
    end.setHours(23, 59, 59, 999);
    where.ngay_nhan = { gte: start, lte: end };
  }
  return prisma.bienNhan.findMany({
    where,
    orderBy: { ngay_nhan: 'desc' },
    include: {
      van_phong_gui: { select: { ma_vp: true, ten: true } },
      van_phong_nhan: { select: { ma_vp: true, ten: true } },
    },
  });
}

/**
 * Xuất bảng kê từ danh sách BN ids
 */
export async function createBangKe(bienNhanIds) {
  if (!bienNhanIds?.length) {
    throw Object.assign(new Error('Chọn ít nhất 1 biên nhận'), { statusCode: 400 });
  }

  // Lấy BN data
  const bienNhans = await prisma.bienNhan.findMany({
    where: { id: { in: bienNhanIds }, can_xuat_hddt: true, da_vao_bang_ke: false },
    include: {
      van_phong_gui: { select: { ma_vp: true, ten: true } },
      van_phong_nhan: { select: { ma_vp: true, ten: true } },
    },
    orderBy: { ngay_nhan: 'asc' },
  });

  if (!bienNhans.length) {
    throw Object.assign(new Error('Không có biên nhận hợp lệ'), { statusCode: 400 });
  }

  // Sinh mã bảng kê (safe - dùng findFirst orderBy desc thay vì count)
  const ma_bang_ke = await generateCode('bangKe', 'ma_bang_ke', 'BK');
  const tong_cuoc = bienNhans.reduce((sum, bn) => sum + Number(bn.gia_cuoc), 0);

  // Tạo Excel
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Bảng kê HĐĐT');

  // Header
  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'BẢNG KÊ HÓA ĐƠN ĐIỆN TỬ';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `Mã: ${ma_bang_ke} — Ngày: ${new Date().toLocaleDateString('vi-VN')}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };
  ws.getCell('A2').font = { size: 10, color: { argb: '666666' } };

  // Table headers
  const headers = ['STT', 'Mã BN', 'Ngày', 'Tuyến', 'Người gửi', 'Người nhận', 'Hàng hóa', 'Giá cước'];
  ws.addRow([]);
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.border = { bottom: { style: 'thin' } };
    cell.alignment = { horizontal: 'center' };
  });

  // Data
  bienNhans.forEach((bn, i) => {
    ws.addRow([
      i + 1,
      bn.ma_so,
      new Date(bn.ngay_nhan).toLocaleDateString('vi-VN'),
      `${bn.van_phong_gui.ma_vp}→${bn.van_phong_nhan.ma_vp}`,
      bn.don_vi_gui || '',
      bn.don_vi_nhan || '',
      bn.ten_hang_hoa,
      Number(bn.gia_cuoc),
    ]);
  });

  // Total
  const totalRow = ws.addRow(['', '', '', '', '', '', 'TỔNG CỘNG', tong_cuoc]);
  totalRow.font = { bold: true };
  totalRow.getCell(8).numFmt = '#,##0';

  // Column widths
  ws.columns = [
    { width: 5 }, { width: 14 }, { width: 12 }, { width: 10 },
    { width: 25 }, { width: 25 }, { width: 30 }, { width: 15 },
  ];
  ws.getColumn(8).numFmt = '#,##0';

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const ten_file = `${ma_bang_ke}_${Date.now()}.xlsx`;

  // Save to DB
  const bangKe = await prisma.$transaction(async (tx) => {
    const bk = await tx.bangKe.create({
      data: {
        ma_bang_ke,
        so_bien_nhan: bienNhans.length,
        tong_cuoc,
        ten_file,
        chi_tiet: {
          create: bienNhanIds.map((id) => ({ bien_nhan_id: id })),
        },
      },
    });

    await tx.bienNhan.updateMany({
      where: { id: { in: bienNhanIds } },
      data: { da_vao_bang_ke: true },
    });

    return bk;
  });

  return { bangKe, buffer, ten_file };
}

/**
 * Lịch sử bảng kê
 */
export async function listBangKe({ page = 1, limit = 20 }) {
  const [data, total] = await Promise.all([
    prisma.bangKe.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { ngay_xuat: 'desc' },
    }),
    prisma.bangKe.count(),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

/**
 * Tải lại file Excel (tạo lại từ data)
 */
export async function downloadBangKe(bangKeId) {
  const bk = await prisma.bangKe.findUnique({
    where: { id: bangKeId },
    include: {
      chi_tiet: {
        include: {
          bien_nhan: {
            include: {
              van_phong_gui: { select: { ma_vp: true } },
              van_phong_nhan: { select: { ma_vp: true } },
            },
          },
        },
      },
    },
  });

  if (!bk) throw Object.assign(new Error('Không tìm thấy bảng kê'), { statusCode: 404 });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Bảng kê HĐĐT');

  ws.mergeCells('A1:H1');
  ws.getCell('A1').value = 'BẢNG KÊ HÓA ĐƠN ĐIỆN TỬ';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `Mã: ${bk.ma_bang_ke} — Ngày: ${new Date(bk.ngay_xuat).toLocaleDateString('vi-VN')}`;
  ws.getCell('A2').alignment = { horizontal: 'center' };

  const headers = ['STT', 'Mã BN', 'Ngày', 'Tuyến', 'Người gửi', 'Người nhận', 'Hàng hóa', 'Giá cước'];
  ws.addRow([]);
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
  });

  bk.chi_tiet.forEach((ct, i) => {
    const bn = ct.bien_nhan;
    ws.addRow([
      i + 1, bn.ma_so,
      new Date(bn.ngay_nhan).toLocaleDateString('vi-VN'),
      `${bn.van_phong_gui.ma_vp}→${bn.van_phong_nhan.ma_vp}`,
      bn.don_vi_gui || '', bn.don_vi_nhan || '',
      bn.ten_hang_hoa, Number(bn.gia_cuoc),
    ]);
  });

  const totalRow = ws.addRow(['', '', '', '', '', '', 'TỔNG CỘNG', Number(bk.tong_cuoc)]);
  totalRow.font = { bold: true };

  ws.columns = [
    { width: 5 }, { width: 14 }, { width: 12 }, { width: 10 },
    { width: 25 }, { width: 25 }, { width: 30 }, { width: 15 },
  ];
  ws.getColumn(8).numFmt = '#,##0';

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, ten_file: bk.ten_file };
}
