import prisma from '../config/database.js';

/**
 * Tính ISO week number cho một ngày
 */
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return `${d.getFullYear()}-T${String(weekNum).padStart(2, '0')}`;
}

/**
 * Tạo key group theo khoảng thời gian
 */
function getGroupKey(dateRaw, nhom) {
  const d = new Date(dateRaw);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  switch (nhom) {
    case 'ngay':  return `${yyyy}-${mm}-${dd}`;
    case 'tuan':  return getISOWeek(d);
    case 'thang': return `${yyyy}-${mm}`;
    case 'nam':   return `${yyyy}`;
    default:      return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Báo cáo doanh thu nhóm theo ngày / tuần / tháng / năm
 */
export async function baoCaoDoanhThu({ from, to, van_phong_id, nhom = 'ngay' }) {
  const where = {};
  if (van_phong_id) where.van_phong_gui_id = Number(van_phong_id);
  if (from || to) {
    where.ngay_bien_nhan = {};
    if (from) where.ngay_bien_nhan.gte = new Date(from);
    if (to)   where.ngay_bien_nhan.lte = new Date(to + 'T23:59:59');
  }

  const bienNhans = await prisma.bienNhan.findMany({
    where,
    select: {
      ngay_bien_nhan: true,
      gia_cuoc:       true,
      thu_ho:         true,
      trang_thai_thu: true,
    },
    orderBy: { ngay_bien_nhan: 'asc' },
  });

  // Group trong JS
  const groupMap = new Map();

  for (const bn of bienNhans) {
    const key = getGroupKey(bn.ngay_bien_nhan, nhom);

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        so_bn:    0,
        tong_cuoc: 0,
        thu_ho:   0,
        da_thu:   0,
        chua_thu: 0,
        cong_no:  0,
        khac:     0,  // bắt BN có trang_thai_thu ngoài 3 giá trị chuẩn
      });
    }

    const g = groupMap.get(key);
    const cuoc  = Number(bn.gia_cuoc || 0);
    const ho    = Number(bn.thu_ho || 0);

    g.so_bn++;
    g.tong_cuoc += cuoc;
    g.thu_ho    += ho;

    if      (bn.trang_thai_thu === 'da_thu')    g.da_thu   += cuoc;
    else if (bn.trang_thai_thu === 'chua_thu')  g.chua_thu += cuoc;
    else if (bn.trang_thai_thu === 'cong_no')   g.cong_no  += cuoc;
    else                                         g.khac     += cuoc;  // dữ liệu bất thường
  }

  const chi_tiet = Array.from(groupMap.values());

  const tong_hop = chi_tiet.reduce(
    (acc, g) => ({
      so_bn:     acc.so_bn     + g.so_bn,
      tong_cuoc: acc.tong_cuoc + g.tong_cuoc,
      thu_ho:    acc.thu_ho    + g.thu_ho,
      da_thu:    acc.da_thu    + g.da_thu,
      chua_thu:  acc.chua_thu  + g.chua_thu,
      cong_no:   acc.cong_no   + g.cong_no,
      khac:      acc.khac      + (g.khac || 0),
    }),
    { so_bn: 0, tong_cuoc: 0, thu_ho: 0, da_thu: 0, chua_thu: 0, cong_no: 0, khac: 0 },
  );

  // Tỷ lệ thu hồi = đã thu / tổng cước (0–100)
  tong_hop.ty_le_thu_hoi = tong_hop.tong_cuoc > 0
    ? Math.round((tong_hop.da_thu / tong_hop.tong_cuoc) * 100)
    : 0;

  return { chi_tiet, tong_hop };
}
