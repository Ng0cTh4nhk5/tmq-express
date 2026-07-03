import prisma from '../config/database.js';
import { monthBoundaryVN } from '../utils/date.js';

/**
 * Báo cáo chi tiết theo Tuyến (VP Gửi → VP Nhận) trong 1 tháng.
 *
 * Tổng hợp (so_bn, tong_cuoc, tong_cod, tong_trong) được tính bằng SQL groupBy —
 * không load toàn bộ BN vào RAM.
 * Mảng `items` chi tiết từng BN vẫn trả về, nhưng mỗi tuyến trả max 500 bản ghi
 * để tránh response quá lớn; frontend nên dùng filter tuyến khi cần chi tiết đầy đủ.
 */
export async function baoCaoTheoTuyen({ thang, nam, van_phong_id, role } = {}) {
  const month = parseInt(thang, 10);
  const year  = parseInt(nam, 10);
  if (!month || month < 1 || month > 12 || !year) {
    throw Object.assign(new Error('Tháng/năm không hợp lệ'), { statusCode: 400 });
  }

  const { start, end } = monthBoundaryVN(year, month);

  // Staff scope: chỉ thấy tuyến liên quan đến VP mình
  const where = { ngay_bien_nhan: { gte: start, lte: end } };
  if (role === 'staff' && van_phong_id) {
    where.OR = [
      { van_phong_gui_id: van_phong_id },
      { van_phong_nhan_id: van_phong_id },
    ];
  }

  // ── 1. Aggregation tại DB (không load tất cả records vào RAM) ────────────
  const summaryGroups = await prisma.bienNhan.groupBy({
    by: ['van_phong_gui_id', 'van_phong_nhan_id'],
    where,
    _count: { id: true },
    _sum:   { gia_cuoc: true, thu_ho: true, trong_luong: true },
  });

  if (summaryGroups.length === 0) return [];

  // ── 2. Load VP info cho các VP xuất hiện trong kết quả ──────────────────
  const vpIds = [...new Set([
    ...summaryGroups.map(g => g.van_phong_gui_id),
    ...summaryGroups.map(g => g.van_phong_nhan_id),
  ])];
  const vanPhongs = await prisma.vanPhong.findMany({
    where: { id: { in: vpIds } },
    select: { id: true, ma_vp: true, ten: true },
  });
  const vpMap = Object.fromEntries(vanPhongs.map(vp => [vp.id, vp]));

  // ── 3. Aggregation trạng thái (cong_no, da_giao) theo tuyến ─────────────
  const statusGroups = await prisma.bienNhan.groupBy({
    by: ['van_phong_gui_id', 'van_phong_nhan_id', 'trang_thai', 'trang_thai_thu'],
    where,
    _count: { id: true },
  });

  // Build map: `${gui_id}-${nhan_id}` → { cong_no_cuoc, da_giao, chua_giao }
  const statusMap = {};
  for (const g of statusGroups) {
    const key = `${g.van_phong_gui_id}-${g.van_phong_nhan_id}`;
    if (!statusMap[key]) statusMap[key] = { cong_no_cuoc: 0, da_giao: 0 };
    if (g.trang_thai_thu === 'cong_no') statusMap[key].cong_no_cuoc += g._count.id;
    if (['khach_da_nhan', 'da_giao_chanh'].includes(g.trang_thai)) statusMap[key].da_giao += g._count.id;
  }

  // ── 4. Lấy items chi tiết (max 500/tuyến) ───────────────────────────────
  // Trả về cùng format cũ để frontend không cần đổi
  const ITEM_LIMIT = 500;
  const records = await prisma.bienNhan.findMany({
    where,
    select: {
      id: true,
      ma_so: true,
      ngay_bien_nhan: true,
      van_phong_gui_id: true,
      van_phong_nhan_id: true,
      gia_cuoc: true,
      thu_ho: true,
      trong_luong: true,
      trang_thai: true,
      trang_thai_thu: true,
    },
    orderBy: [{ van_phong_gui_id: 'asc' }, { van_phong_nhan_id: 'asc' }, { ngay_bien_nhan: 'asc' }],
    take: summaryGroups.length * ITEM_LIMIT, // hard cap toàn bộ query
  });

  // Group items theo tuyến
  const itemsMap = {};
  for (const bn of records) {
    const key = `${bn.van_phong_gui_id}-${bn.van_phong_nhan_id}`;
    if (!itemsMap[key]) itemsMap[key] = [];
    if (itemsMap[key].length < ITEM_LIMIT) itemsMap[key].push(bn);
  }

  // ── 5. Ghép kết quả ─────────────────────────────────────────────────────
  return summaryGroups
    .map((g) => {
      const key     = `${g.van_phong_gui_id}-${g.van_phong_nhan_id}`;
      const vp_gui  = vpMap[g.van_phong_gui_id]  || { ma_vp: '?', ten: 'N/A' };
      const vp_nhan = vpMap[g.van_phong_nhan_id] || { ma_vp: '?', ten: 'N/A' };
      const st      = statusMap[key] || { cong_no_cuoc: 0, da_giao: 0 };
      const so_bn   = g._count.id;

      return {
        tuyen_label:      `${vp_gui.ten} → ${vp_nhan.ten}`,
        vp_gui,
        vp_nhan,
        so_bien_nhan:     so_bn,
        tong_cuoc:        Number(g._sum.gia_cuoc    || 0),
        tong_cod:         Number(g._sum.thu_ho       || 0),
        tong_trong_luong: Math.round(Number(g._sum.trong_luong || 0) * 100) / 100,
        da_giao:          st.da_giao,
        chua_giao:        so_bn - st.da_giao,
        cong_no_cuoc:     st.cong_no_cuoc,
        items:            itemsMap[key] || [],
        items_truncated:  so_bn > ITEM_LIMIT, // cho frontend biết đã bị cắt
      };
    })
    .sort((a, b) => a.tuyen_label.localeCompare(b.tuyen_label, 'vi'));
}

/**
 * Báo cáo chi tiết theo Chành trong 1 tháng.
 * Nhóm "Không qua chành" cho các BN không có chanh_id.
 *
 * Aggregation tổng hợp tính tại DB; items chi tiết max 500/chành.
 */
export async function baoCaoTheoChanh({ thang, nam, van_phong_id, role } = {}) {
  const month = parseInt(thang, 10);
  const year  = parseInt(nam, 10);
  if (!month || month < 1 || month > 12 || !year) {
    throw Object.assign(new Error('Tháng/năm không hợp lệ'), { statusCode: 400 });
  }

  const { start, end } = monthBoundaryVN(year, month);

  const where = { ngay_bien_nhan: { gte: start, lte: end } };
  if (role === 'staff' && van_phong_id) {
    where.OR = [
      { van_phong_gui_id: van_phong_id },
      { van_phong_nhan_id: van_phong_id },
    ];
  }

  // ── 1. Aggregation theo chanh_id ─────────────────────────────────────────
  const summaryGroups = await prisma.bienNhan.groupBy({
    by: ['chanh_id'],
    where,
    _count: { id: true },
    _sum:   { gia_cuoc: true, thu_ho: true, trong_luong: true },
  });

  if (summaryGroups.length === 0) return [];

  // ── 2. Load thông tin Chành ───────────────────────────────────────────────
  const chanhIds = summaryGroups.map(g => g.chanh_id).filter(Boolean);
  const chanhs   = chanhIds.length > 0
    ? await prisma.chanh.findMany({
        where: { id: { in: chanhIds } },
        select: { id: true, ten: true, dia_chi: true, dien_thoai: true, nguoi_lien_he: true },
      })
    : [];
  const chanhMap = Object.fromEntries(chanhs.map(c => [c.id, c]));

  // ── 3. Aggregation trạng thái theo chanh_id ──────────────────────────────
  const statusGroups = await prisma.bienNhan.groupBy({
    by: ['chanh_id', 'trang_thai'],
    where,
    _count: { id: true },
  });
  const statusMap = {};
  for (const g of statusGroups) {
    const key = g.chanh_id ?? '__none__';
    if (!statusMap[key]) statusMap[key] = { da_giao: 0 };
    if (['khach_da_nhan', 'da_giao_chanh'].includes(g.trang_thai)) {
      statusMap[key].da_giao += g._count.id;
    }
  }

  // ── 4. Items chi tiết (max 500/chành) ────────────────────────────────────
  const ITEM_LIMIT = 500;
  const records = await prisma.bienNhan.findMany({
    where,
    select: {
      id: true,
      ma_so: true,
      ngay_bien_nhan: true,
      chanh_id: true,
      van_phong_gui:  { select: { ma_vp: true, ten: true } },
      van_phong_nhan: { select: { ma_vp: true, ten: true } },
      don_vi_gui: true,
      don_vi_nhan: true,
      ten_hang_hoa: true,
      gia_cuoc: true,
      thu_ho: true,
      trong_luong: true,
      trang_thai: true,
      trang_thai_thu: true,
      trang_thai_cod: true,
    },
    orderBy: [{ chanh_id: 'asc' }, { ngay_bien_nhan: 'asc' }],
    take: summaryGroups.length * ITEM_LIMIT,
  });

  const itemsMap = {};
  for (const bn of records) {
    const key = bn.chanh_id != null ? String(bn.chanh_id) : '__none__';
    if (!itemsMap[key]) itemsMap[key] = [];
    if (itemsMap[key].length < ITEM_LIMIT) itemsMap[key].push(bn);
  }

  // ── 5. Ghép kết quả ──────────────────────────────────────────────────────
  const result = summaryGroups.map((g) => {
    const key    = g.chanh_id != null ? String(g.chanh_id) : '__none__';
    const chanh  = g.chanh_id ? (chanhMap[g.chanh_id] || null) : null;
    const st     = statusMap[g.chanh_id ?? '__none__'] || { da_giao: 0 };
    const so_bn  = g._count.id;

    return {
      chanh,
      chanh_label:      chanh?.ten || 'Không qua chành',
      so_bien_nhan:     so_bn,
      tong_cuoc:        Number(g._sum.gia_cuoc    || 0),
      tong_cod:         Number(g._sum.thu_ho       || 0),
      tong_trong_luong: Math.round(Number(g._sum.trong_luong || 0) * 100) / 100,
      da_giao:          st.da_giao,
      chua_giao:        so_bn - st.da_giao,
      items:            itemsMap[key] || [],
      items_truncated:  so_bn > ITEM_LIMIT,
    };
  });

  return result.sort((a, b) => {
    if (!a.chanh && b.chanh) return 1;
    if (a.chanh && !b.chanh) return -1;
    return a.chanh_label.localeCompare(b.chanh_label, 'vi');
  });
}
