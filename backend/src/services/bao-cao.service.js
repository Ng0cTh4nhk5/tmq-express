import prisma from '../config/database.js';

export async function baoCaoDoanhThu({ from, to, van_phong_id }) {
  const where = {};
  if (van_phong_id) where.van_phong_gui_id = Number(van_phong_id);
  if (from || to) {
    where.ngay_nhan = {};
    if (from) where.ngay_nhan.gte = new Date(from);
    if (to) where.ngay_nhan.lte = new Date(to + 'T23:59:59');
  }

  const [bienNhans, agg] = await Promise.all([
    prisma.bienNhan.findMany({
      where,
      orderBy: { ngay_nhan: 'desc' },
      take: 1000,
      select: {
        ma_so: true, ngay_nhan: true, don_vi_gui: true, don_vi_nhan: true,
        ten_hang_hoa: true, gia_cuoc: true, trang_thai_thu: true,
        van_phong_gui: { select: { ma_vp: true } },
        van_phong_nhan: { select: { ma_vp: true } },
      },
    }),
    prisma.bienNhan.aggregate({ where, _sum: { gia_cuoc: true }, _count: true }),
  ]);

  return {
    chi_tiet: bienNhans,
    tong_hop: { so_bn: agg._count, tong_cuoc: Number(agg._sum.gia_cuoc || 0) },
  };
}

export async function baoCaoSoQuy({ from, to, van_phong_id }) {
  const ptWhere = { da_huy: false };
  const pcWhere = { da_huy: false };
  if (van_phong_id) {
    ptWhere.van_phong_id = Number(van_phong_id);
    pcWhere.van_phong_id = Number(van_phong_id);
  }
  if (from || to) {
    if (from) {
      ptWhere.ngay_thu = { ...ptWhere.ngay_thu, gte: new Date(from) };
      pcWhere.ngay_chi = { ...pcWhere.ngay_chi, gte: new Date(from) };
    }
    if (to) {
      ptWhere.ngay_thu = { ...ptWhere.ngay_thu, lte: new Date(to + 'T23:59:59') };
      pcWhere.ngay_chi = { ...pcWhere.ngay_chi, lte: new Date(to + 'T23:59:59') };
    }
  }

  const [phieuThu, phieuChi, aggThu, aggChi] = await Promise.all([
    prisma.phieuThu.findMany({ where: ptWhere, orderBy: { ngay_thu: 'desc' }, take: 1000, include: { nhan_vien: { select: { ten: true } } } }),
    prisma.phieuChi.findMany({ where: pcWhere, orderBy: { ngay_chi: 'desc' }, take: 1000, include: { nhan_vien: { select: { ten: true } } } }),
    prisma.phieuThu.aggregate({ where: ptWhere, _sum: { so_tien: true } }),
    prisma.phieuChi.aggregate({ where: pcWhere, _sum: { so_tien: true } }),
  ]);

  return {
    phieu_thu: phieuThu,
    phieu_chi: phieuChi,
    tong_hop: {
      tong_thu: Number(aggThu._sum.so_tien || 0),
      tong_chi: Number(aggChi._sum.so_tien || 0),
      ton_quy: Number(aggThu._sum.so_tien || 0) - Number(aggChi._sum.so_tien || 0),
    },
  };
}

export async function baoCaoBienNhan({ from, to, van_phong_id }) {
  // Use Prisma findMany instead of raw SQL for safety
  const bienNhans = await prisma.bienNhan.findMany({
    where: {
      ...(van_phong_id ? { van_phong_gui_id: Number(van_phong_id) } : {}),
      ...(from || to ? {
        ngay_nhan: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
        },
      } : {}),
    },
    select: {
      gia_cuoc: true,
      trang_thai: true,
      trang_thai_thu: true,
      van_phong_gui: { select: { ma_vp: true } },
      van_phong_nhan: { select: { ma_vp: true } },
    },
  });

  // Group by tuyến in JS (safe, no raw SQL)
  const tuyenMap = new Map();
  for (const bn of bienNhans) {
    const tuyen = `${bn.van_phong_gui.ma_vp}→${bn.van_phong_nhan.ma_vp}`;
    if (!tuyenMap.has(tuyen)) {
      tuyenMap.set(tuyen, { tuyen, so_bn: 0, tong_cuoc: 0, da_giao: 0, cong_no: 0 });
    }
    const entry = tuyenMap.get(tuyen);
    entry.so_bn++;
    entry.tong_cuoc += Number(bn.gia_cuoc || 0);
    if (bn.trang_thai === 'khach_da_nhan') entry.da_giao++;
    if (bn.trang_thai_thu === 'cong_no') entry.cong_no++;
  }

  return Array.from(tuyenMap.values()).sort((a, b) => b.so_bn - a.so_bn);
}

export async function baoCaoCongNo() {
  const data = await prisma.congNo.findMany({
    where: { trang_thai: { in: ['chua_thu', 'qua_han'] } },
    orderBy: { ngay_phat_sinh: 'asc' },
    include: {
      bien_nhan: { select: { ma_so: true, don_vi_gui: true } },
    },
  });

  const agg = await prisma.congNo.aggregate({
    where: { trang_thai: { in: ['chua_thu', 'qua_han'] } },
    _sum: { so_tien_no: true },
    _count: true,
  });

  return {
    chi_tiet: data,
    tong_hop: { tong_no: Number(agg._sum.so_tien_no || 0), so_cong_no: agg._count },
  };
}
