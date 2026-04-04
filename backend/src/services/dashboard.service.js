import prisma from '../config/database.js';

export async function getStats(user) {
  const vpFilter = user.role === 'staff' ? { van_phong_gui_id: user.van_phong_id } : {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [bnHomNay, tongBN, doanhThuThang, congNoTon] = await Promise.all([
    prisma.bienNhan.count({ where: { ...vpFilter, ngay_nhan: { gte: today, lt: tomorrow } } }),
    prisma.bienNhan.count({ where: vpFilter }),
    prisma.bienNhan.aggregate({
      where: {
        ...vpFilter,
        ngay_nhan: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
      },
      _sum: { gia_cuoc: true },
    }),
    prisma.congNo.aggregate({
      where: { trang_thai: { in: ['chua_thu', 'qua_han'] } },
      _sum: { so_tien_no: true },
      _count: true,
    }),
  ]);

  return {
    bn_hom_nay: bnHomNay,
    tong_bn: tongBN,
    doanh_thu_thang: Number(doanhThuThang._sum.gia_cuoc || 0),
    cong_no_ton: Number(congNoTon._sum.so_tien_no || 0),
    so_cong_no: congNoTon._count,
  };
}

export async function getDoanhThu7Ngay(user) {
  const vpFilter = user.role === 'staff' ? { van_phong_gui_id: user.van_phong_id } : {};

  // Ngày bắt đầu (6 ngày trước)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  // 1 query thay vì 7
  const bienNhans = await prisma.bienNhan.findMany({
    where: { ...vpFilter, ngay_nhan: { gte: startDate } },
    select: { ngay_nhan: true, gia_cuoc: true },
  });

  // Group by ngày trong JS
  const dayMap = new Map();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, {
      ngay: key,
      label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      doanh_thu: 0,
      so_bn: 0,
    });
  }

  for (const bn of bienNhans) {
    const key = new Date(bn.ngay_nhan).toISOString().slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) {
      entry.doanh_thu += Number(bn.gia_cuoc || 0);
      entry.so_bn++;
    }
  }

  return Array.from(dayMap.values());
}

export async function getTyLeTuyen() {
  const bienNhans = await prisma.bienNhan.findMany({
    select: {
      gia_cuoc: true,
      van_phong_gui: { select: { ma_vp: true } },
      van_phong_nhan: { select: { ma_vp: true } },
    },
  });

  const tuyenMap = new Map();
  for (const bn of bienNhans) {
    const tuyen = `${bn.van_phong_gui.ma_vp}→${bn.van_phong_nhan.ma_vp}`;
    if (!tuyenMap.has(tuyen)) {
      tuyenMap.set(tuyen, { tuyen, so_bn: 0, doanh_thu: 0 });
    }
    const entry = tuyenMap.get(tuyen);
    entry.so_bn++;
    entry.doanh_thu += Number(bn.gia_cuoc || 0);
  }

  return Array.from(tuyenMap.values())
    .sort((a, b) => b.so_bn - a.so_bn)
    .slice(0, 10);
}

export async function getThuChiTheoThang() {
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // 2 queries thay vì 12
  const [allThu, allChi] = await Promise.all([
    prisma.phieuThu.findMany({
      where: { da_huy: false, ngay_thu: { gte: startMonth } },
      select: { ngay_thu: true, so_tien: true },
    }),
    prisma.phieuChi.findMany({
      where: { da_huy: false, ngay_chi: { gte: startMonth } },
      select: { ngay_chi: true, so_tien: true },
    }),
  ]);

  // Tạo map 6 tháng
  const monthMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, {
      thang: d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }),
      thu: 0,
      chi: 0,
    });
  }

  for (const pt of allThu) {
    const d = new Date(pt.ngay_thu);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key);
    if (entry) entry.thu += Number(pt.so_tien || 0);
  }

  for (const pc of allChi) {
    const d = new Date(pc.ngay_chi);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key);
    if (entry) entry.chi += Number(pc.so_tien || 0);
  }

  return Array.from(monthMap.values());
}
