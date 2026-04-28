import prisma from '../config/database.js';
import ExcelJS from 'exceljs';
import { generateCode } from '../utils/ma-so-generator.js';

/** VAT 8% — gia_cuoc trên BN là SAU thuế */
const VAT_RATE = 1.08;

/** Tính giá trước thuế từ giá sau thuế */
function truocThue(sauThue) {
  return Math.round(Number(sauThue) / VAT_RATE);
}

/** Format ngày dd/mm/yyyy */
function fmtDate(dt) {
  const d = new Date(dt);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * DS biên nhận có HĐĐT & chưa vào bảng kê
 * @param {string} ngay - ISO date string (YYYY-MM-DD), optional
 */
export async function getBienNhanCho({ ngay } = {}) {
  const where = {
    can_xuat_hddt: true,
    da_vao_bang_ke: false,
  };
  if (ngay) {
    const start = new Date(ngay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(ngay);
    end.setHours(23, 59, 59, 999);
    where.ngay_bien_nhan = { gte: start, lte: end };  // Fix: ngay_nhan → ngay_bien_nhan
  }
  return prisma.bienNhan.findMany({
    where,
    orderBy: { ngay_bien_nhan: 'asc' },  // Fix: field name
    include: {
      van_phong_gui:  { select: { ma_vp: true, ten: true } },
      van_phong_nhan: { select: { ma_vp: true, ten: true } },
    },
  });
}

/**
 * Tạo bảng kê — hỗ trợ 2 case:
 *   Case A: items có bien_nhan_id → từ biên nhận thực
 *   Case B: items có bien_nhan_id = null → tự kê thủ công
 *
 * @param {string} bien_so_xe
 * @param {Array} items - [{
 *   bien_nhan_id: number|null,
 *   // Case A only (optional overrides):
 *   hang_hoa: string,
 *   gia_cuoc: number,
 *   // Case B required:
 *   ngay: string (ISO),
 *   tuyen: string,
 *   nguoi_gui: string,
 *   dia_chi_gui: string,
 * }]
 */
export async function createBangKe({ bien_so_xe, items }) {
  if (!items?.length) {
    throw Object.assign(new Error('Cần ít nhất 1 dòng'), { statusCode: 400 });
  }

  // Tách BN items và manual items
  const bnIds = [...new Set(
    items.filter(i => i.bien_nhan_id != null).map(i => Number(i.bien_nhan_id)),
  )];

  // Validate + load BN items
  let bienNhans = [];
  if (bnIds.length) {
    bienNhans = await prisma.bienNhan.findMany({
      where: { id: { in: bnIds }, can_xuat_hddt: true, da_vao_bang_ke: false },
      include: {
        van_phong_gui:  { select: { ma_vp: true } },
        van_phong_nhan: { select: { ma_vp: true } },
      },
    });
    if (bienNhans.length !== bnIds.length) {
      throw Object.assign(
        new Error('Một số biên nhận không hợp lệ hoặc đã vào bảng kê'),
        { statusCode: 400 },
      );
    }
  }

  // Build snapshot chi tiết
  const chiTietData = items.map((item, idx) => {
    if (item.bien_nhan_id != null) {
      // Case A: từ BN
      const bn = bienNhans.find(b => b.id === Number(item.bien_nhan_id));
      return {
        bien_nhan_id: bn.id,
        stt: idx + 1,
        ngay: bn.ngay_bien_nhan,
        tuyen: `${bn.van_phong_gui.ma_vp}→${bn.van_phong_nhan.ma_vp}`,
        nguoi_gui: bn.don_vi_gui || bn.nguoi_gui || '',
        dia_chi_gui: bn.dia_chi_gui || '',
        hang_hoa: item.hang_hoa ?? bn.ten_hang_hoa ?? '',
        gia_cuoc: item.gia_cuoc != null ? Number(item.gia_cuoc) : Number(bn.gia_cuoc),
      };
    } else {
      // Case B: tự kê
      if (!item.nguoi_gui || item.gia_cuoc == null) {
        throw Object.assign(
          new Error(`Dòng tự kê ${idx + 1}: thiếu người gửi hoặc giá cước`),
          { statusCode: 400 },
        );
      }
      return {
        bien_nhan_id: null,
        stt: idx + 1,
        ngay: new Date(item.ngay || new Date()),
        tuyen: item.tuyen || '',
        nguoi_gui: item.nguoi_gui || '',
        dia_chi_gui: item.dia_chi_gui || '',
        hang_hoa: item.hang_hoa || '',
        gia_cuoc: Number(item.gia_cuoc),
      };
    }
  });

  const tong_cuoc = chiTietData.reduce((s, i) => s + Number(i.gia_cuoc), 0);
  const ma_bang_ke = await generateCode('bangKe', 'ma_bang_ke', 'BK');
  const ten_file = `${ma_bang_ke}_${Date.now()}.xlsx`;

  // Transaction: tạo BangKe + chi tiết + đánh dấu BN
  const bangKe = await prisma.$transaction(async (tx) => {
    const bk = await tx.bangKe.create({
      data: {
        ma_bang_ke,
        so_bien_nhan: chiTietData.length,
        tong_cuoc,
        bien_so_xe: bien_so_xe?.trim() || null,
        ten_file,
        chi_tiet: { create: chiTietData },
      },
    });

    if (bnIds.length) {
      await tx.bienNhan.updateMany({
        where: { id: { in: bnIds } },
        data: { da_vao_bang_ke: true },
      });
    }
    return bk;
  });

  const buffer = await buildExcel(ma_bang_ke, bangKe.ngay_xuat, bien_so_xe, chiTietData, tong_cuoc);
  return { bangKe, buffer, ten_file };
}

/**
 * Lịch sử bảng kê
 */
export async function listBangKe({ page = 1, limit = 20 } = {}) {
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const [data, total] = await Promise.all([
    prisma.bangKe.findMany({
      skip: (p - 1) * l,
      take: l,
      orderBy: { ngay_xuat: 'desc' },
    }),
    prisma.bangKe.count(),
  ]);
  return { data, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

/**
 * Download lại file Excel — đọc từ snapshot, không join BN
 */
export async function downloadBangKe(bangKeId) {
  const bk = await prisma.bangKe.findUnique({
    where: { id: bangKeId },
    include: {
      chi_tiet: { orderBy: { stt: 'asc' } },
    },
  });
  if (!bk) throw Object.assign(new Error('Không tìm thấy bảng kê'), { statusCode: 404 });

  const buffer = await buildExcel(
    bk.ma_bang_ke, bk.ngay_xuat, bk.bien_so_xe,
    bk.chi_tiet, bk.tong_cuoc,
  );
  return { buffer, ten_file: bk.ten_file };
}

/**
 * Xây dựng file Excel theo layout chuẩn
 */
async function buildExcel(maBangKe, ngayXuat, bienSoXe, items, tongCuoc) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bảng kê HĐĐT');


  // ── Tiêu đề ──
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BẢNG KÊ HÓA ĐƠN ĐIỆN TỬ';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 24;

  // ── Mã + Ngày ──
  ws.mergeCells('A2:H2');
  const metaCell = ws.getCell('A2');
  metaCell.value = `Mã: ${maBangKe}     Ngày: ${fmtDate(ngayXuat)}`;
  metaCell.font = { size: 10, color: { argb: 'FF555555' } };
  metaCell.alignment = { horizontal: 'center' };

  // ── Biển số xe ──
  ws.mergeCells('A3:H3');
  const bsxCell = ws.getCell('A3');
  bsxCell.value = `Biển số xe: ${bienSoXe || '—'}`;
  bsxCell.font = { bold: true, size: 11 };
  bsxCell.alignment = { horizontal: 'left' };
  ws.getRow(3).height = 18;

  // ── Column widths (set trước addRow để không bị override) ──
  ws.getColumn(1).width = 5;    // STT
  ws.getColumn(2).width = 11;   // Ngày
  ws.getColumn(3).width = 10;   // Tuyến
  ws.getColumn(4).width = 26;   // Người gửi
  ws.getColumn(5).width = 30;   // ĐC gửi
  ws.getColumn(6).width = 22;   // Hàng hoá
  ws.getColumn(7).width = 16;   // Trước thuế
  ws.getColumn(8).width = 16;   // Sau thuế

  // ── Header row ──
  const headerRow = ws.addRow([
    'STT', 'Ngày', 'Tuyến', 'Người gửi', 'Địa chỉ gửi', 'Hàng hoá',
    'Cước trước thuế', 'Cước sau thuế',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  // ── Data rows ──
  let sumTruocThue = 0;
  items.forEach((item, i) => {
    const sauThue = Number(item.gia_cuoc);
    const tt = truocThue(sauThue);
    sumTruocThue += tt;
    const row = ws.addRow([
      i + 1,
      fmtDate(item.ngay),
      item.tuyen || '',
      item.nguoi_gui || '',
      item.dia_chi_gui || '',
      item.hang_hoa || '',
      tt,
      sauThue,
    ]);
    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).numFmt = '#,##0';
    row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(8).alignment = { horizontal: 'right' };
    // Zebra
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
      });
    }
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'hair' },
        left: { style: 'hair' }, right: { style: 'hair' },
      };
    });
  });

  // ── Total row ──
  const totalRow = ws.addRow([
    '', '', '', '', '', 'TỔNG CỘNG', sumTruocThue, Number(tongCuoc),
  ]);
  totalRow.font = { bold: true };
  totalRow.getCell(6).alignment = { horizontal: 'right' };
  totalRow.getCell(7).numFmt = '#,##0';
  totalRow.getCell(8).numFmt = '#,##0';
  totalRow.getCell(7).alignment = { horizontal: 'right' };
  totalRow.getCell(8).alignment = { horizontal: 'right' };
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: 'medium' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  });

  return wb.xlsx.writeBuffer();
}
