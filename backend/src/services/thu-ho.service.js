import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';
import { parseStartOfDayVN, parseEndOfDayVN } from '../utils/date.js';

/**
 * Danh sách BN có COD (thu_ho > 0)
 */
export async function listThuHo({ trang_thai_cod, vp_gui, vp_nhan, from, to, page = 1, limit = 20, search }) {
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const where = { thu_ho: { gt: 0 } };

  if (trang_thai_cod) where.trang_thai_cod = trang_thai_cod;
  if (vp_gui) where.van_phong_gui_id = Number(vp_gui);
  if (vp_nhan) where.van_phong_nhan_id = Number(vp_nhan);

  if (from || to) {
    where.ngay_bien_nhan = {};
    if (from) where.ngay_bien_nhan.gte = parseStartOfDayVN(from);
    if (to)   where.ngay_bien_nhan.lte = parseEndOfDayVN(to);
  }

  if (search) {
    where.OR = [
      { ma_so: { contains: search, mode: 'insensitive' } },
      { don_vi_gui: { contains: search, mode: 'insensitive' } },
      { don_vi_nhan: { contains: search, mode: 'insensitive' } },
      { nguoi_gui: { contains: search, mode: 'insensitive' } },
      { nguoi_nhan: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, agg] = await Promise.all([
    prisma.bienNhan.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { created_at: 'desc' },
      include: {
        van_phong_gui: { select: { ma_vp: true, ten: true } },
        van_phong_nhan: { select: { ma_vp: true, ten: true } },
        nhan_vien_nhap: { select: { ten: true } },
        bien_nhan_thu_ho: { select: { id: true, ma_bnth: true, ngay_thu: true, nguoi_nop: true } },
        chanh: { select: { ten: true } },
      },
    }),
    prisma.bienNhan.aggregate({ where, _sum: { thu_ho: true }, _count: true }),
  ]);

  const total = agg._count;
  return {
    data,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    summary: { count: total, total_thu_ho: agg._sum.thu_ho || 0 },
  };
}

/**
 * Tổng hợp COD theo 6 trạng thái
 */
export async function tongHopThuHo({ vp_gui, vp_nhan, from, to } = {}) {
  const baseWhere = { thu_ho: { gt: 0 } };
  if (vp_gui) baseWhere.van_phong_gui_id = Number(vp_gui);
  if (vp_nhan) baseWhere.van_phong_nhan_id = Number(vp_nhan);
  if (from || to) {
    baseWhere.ngay_bien_nhan = {};
    if (from) baseWhere.ngay_bien_nhan.gte = parseStartOfDayVN(from);
    if (to)   baseWhere.ngay_bien_nhan.lte = parseEndOfDayVN(to);
  }

  const groups = await prisma.bienNhan.groupBy({
    by: ['trang_thai_cod'],
    where: baseWhere,
    _count: true,
    _sum: { thu_ho: true },
  });

  const results = {
    cho_thu:            { count: 0, total: 0 },
    da_thu_chanh:       { count: 0, total: 0 },
    da_thu:             { count: 0, total: 0 },
    cho_chuyen_pending: { count: 0, total: 0 },
    da_chuyen:          { count: 0, total: 0 },
    da_tra:             { count: 0, total: 0 },
  };
  for (const g of groups) {
    if (results[g.trang_thai_cod]) {
      results[g.trang_thai_cod] = { count: g._count, total: g._sum.thu_ho || 0 };
    }
  }
  return results;
}

/**
 * Xác nhận thu COD trực tiếp — VP Nhận thu từ người nhận hàng
 * State: cho_thu → da_thu
 * Side effect: PhieuThu @ VP Nhận + BienNhanThuHo
 */
export async function xacNhanThuCOD(bienNhanId, { hinh_thuc, ghi_chu, nguoi_nop } = {}, user) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: { van_phong_nhan: { select: { id: true, ten: true } } },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
  if (bn.trang_thai_cod !== 'cho_thu') {
    const msg = bn.trang_thai_cod === 'khong_co'
      ? 'Biên nhận này không có tiền thu hộ (COD)'
      : 'COD đã được thu hoặc đang xử lý, không thể thu lại';
    throw Object.assign(new Error(msg), { statusCode: 400 });
  }
  if (!bn.thu_ho || Number(bn.thu_ho) <= 0) {
    throw Object.assign(new Error('Biên nhận không có tiền COD để thu'), { statusCode: 400 });
  }

  const tenNguoiNop = nguoi_nop || bn.don_vi_nhan || bn.nguoi_nhan || 'Không xác định';
  const ht = hinh_thuc || 'tien_mat';

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update trạng thái COD
    const updatedBN = await tx.bienNhan.update({
      where: { id: bienNhanId },
      data: { trang_thai_cod: 'da_thu' },
    });

    // 2. Tạo PhieuThu @ VP Nhận
    const phieuThu = await createWithCode(
      async (ma_phieu) => tx.phieuThu.create({
        data: {
          ma_phieu,
          doi_tuong: tenNguoiNop,
          ly_do: `Thu hộ COD BN ${bn.ma_so}`,
          so_tien: bn.thu_ho,
          hinh_thuc: ht,
          van_phong_id: bn.van_phong_nhan_id,
          nhan_vien_id: user.id,
          bien_nhan_id: bn.id,
        },
      }),
      'phieuThu', 'ma_phieu', 'PT', 4, tx,
    );

    // 3. Tạo BienNhanThuHo
    const bnth = await createWithCode(
      async (ma_bnth) => tx.bienNhanThuHo.create({
        data: {
          ma_bnth,
          bien_nhan_id: bn.id,
          so_tien: bn.thu_ho,
          nguoi_nop: tenNguoiNop,
          hinh_thuc: ht,
          ghi_chu: ghi_chu || null,
          van_phong_id: bn.van_phong_nhan_id,
          nhan_vien_id: user.id,
          la_qua_chanh: false,
        },
      }),
      'bienNhanThuHo', 'ma_bnth', 'BNTH', 4, tx,
    );

    return { bn: updatedBN, phieu_thu: phieuThu, bien_nhan_thu_ho: bnth };
  });

  writeAuditLog({ action: 'UPDATE', entity: 'bien_nhan', entityId: bienNhanId, newData: { trang_thai_cod: 'da_thu' } });
  return result;
}

/**
 * Auto thu COD — gọi từ PATCH trang-thai khi khach_da_nhan
 */
export async function xacNhanThuCODAuto(bienNhanId, user) {
  return xacNhanThuCOD(
    bienNhanId,
    { hinh_thuc: 'tien_mat', ghi_chu: 'Tự động thu COD khi giao hàng' },
    user,
  );
}

/**
 * Ghi nhận Chành đã thu — Chành thu từ người nhận, tiền chưa về VP
 * State: cho_thu → da_thu_chanh
 * Side effect: KHÔNG tạo PhieuThu (tiền chưa ở VP)
 */
export async function xacNhanThuChanh(bienNhanId, { ghi_chu } = {}, user) {
  const bn = await prisma.bienNhan.findUnique({ where: { id: bienNhanId } });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
  if (bn.trang_thai_cod !== 'cho_thu') {
    throw Object.assign(new Error('Chỉ BN ở trạng thái "Chờ thu" mới có thể ghi nhận chành thu'), { statusCode: 400 });
  }
  if (!bn.chanh_id) {
    throw Object.assign(new Error('Biên nhận này chưa được gán chành'), { statusCode: 400 });
  }

  const updatedBN = await prisma.bienNhan.update({
    where: { id: bienNhanId },
    data: { trang_thai_cod: 'da_thu_chanh' },
  });

  writeAuditLog({ action: 'UPDATE', entity: 'bien_nhan', entityId: bienNhanId, newData: { trang_thai_cod: 'da_thu_chanh', ghi_chu } });
  return updatedBN;
}

/**
 * VP Nhận xác nhận đã nhận tiền từ Chành
 * State: da_thu_chanh → da_thu
 * Side effect: PhieuThu @ VP Nhận + BienNhanThuHo (la_qua_chanh = true)
 */
export async function xacNhanNhanTuChanh(bienNhanId, { hinh_thuc, ghi_chu, nguoi_nop } = {}, user) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: { chanh: { select: { ten: true } } },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
  if (bn.trang_thai_cod !== 'da_thu_chanh') {
    throw Object.assign(new Error('BN chưa ở trạng thái "Chành đã thu"'), { statusCode: 400 });
  }

  const tenNguoiNop = nguoi_nop || (bn.chanh ? `Chành ${bn.chanh.ten}` : 'Chành') ;
  const ht = hinh_thuc || 'tien_mat';

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update trạng thái
    const updatedBN = await tx.bienNhan.update({
      where: { id: bienNhanId },
      data: { trang_thai_cod: 'da_thu' },
    });

    // 2. PhieuThu @ VP Nhận
    const phieuThu = await createWithCode(
      async (ma_phieu) => tx.phieuThu.create({
        data: {
          ma_phieu,
          doi_tuong: tenNguoiNop,
          ly_do: `Nhận COD BN ${bn.ma_so} từ chành`,
          so_tien: bn.thu_ho,
          hinh_thuc: ht,
          van_phong_id: bn.van_phong_nhan_id,
          nhan_vien_id: user.id,
          bien_nhan_id: bn.id,
        },
      }),
      'phieuThu', 'ma_phieu', 'PT', 4, tx,
    );

    // 3. BienNhanThuHo (la_qua_chanh = true)
    const bnth = await createWithCode(
      async (ma_bnth) => tx.bienNhanThuHo.create({
        data: {
          ma_bnth,
          bien_nhan_id: bn.id,
          so_tien: bn.thu_ho,
          nguoi_nop: tenNguoiNop,
          hinh_thuc: ht,
          ghi_chu: ghi_chu || null,
          van_phong_id: bn.van_phong_nhan_id,
          nhan_vien_id: user.id,
          la_qua_chanh: true,
        },
      }),
      'bienNhanThuHo', 'ma_bnth', 'BNTH', 4, tx,
    );

    return { bn: updatedBN, phieu_thu: phieuThu, bien_nhan_thu_ho: bnth };
  });

  writeAuditLog({ action: 'UPDATE', entity: 'bien_nhan', entityId: bienNhanId, newData: { trang_thai_cod: 'da_thu' } });
  return result;
}

/**
 * Trả COD cho người gửi — gom lô nhiều BN
 * State: da_chuyen → da_tra (per BN)
 * Side effect: PhieuChi per-BN @ VP Gửi (có bien_nhan_id)
 */
export async function traLo({ bien_nhan_ids, hinh_thuc, ghi_chu } = {}, user) {
  if (!bien_nhan_ids?.length) {
    throw Object.assign(new Error('Danh sách biên nhận không được rỗng'), { statusCode: 400 });
  }

  const bienNhans = await prisma.bienNhan.findMany({
    where: { id: { in: bien_nhan_ids } },
    include: { van_phong_gui: { select: { id: true, ten: true } } },
  });

  if (bienNhans.length !== bien_nhan_ids.length) {
    throw Object.assign(new Error('Một hoặc nhiều biên nhận không tìm thấy'), { statusCode: 404 });
  }

  const notDaChuyen = bienNhans.filter(bn => bn.trang_thai_cod !== 'da_chuyen');
  if (notDaChuyen.length > 0) {
    throw Object.assign(new Error(`Các BN chưa ở trạng thái "Đã chuyển": ${notDaChuyen.map(b => b.ma_so).join(', ')}`), { statusCode: 400 });
  }

  const wrongVP = bienNhans.filter(bn => bn.van_phong_gui_id !== user.van_phong_id);
  if (wrongVP.length > 0) {
    throw Object.assign(new Error('Một số BN không thuộc VP của bạn (cần VP Gửi)'), { statusCode: 403 });
  }

  const ht = hinh_thuc || 'tien_mat';

  const result = await prisma.$transaction(async (tx) => {
    const phieuChiList = [];

    for (const bn of bienNhans) {
      const phieuChi = await createWithCode(
        async (ma_phieu) => tx.phieuChi.create({
          data: {
            ma_phieu,
            nguoi_nhan: bn.don_vi_gui || bn.nguoi_gui || 'Không xác định',
            ly_do: `Trả COD BN ${bn.ma_so} cho người gửi`,
            so_tien: bn.thu_ho,
            hinh_thuc: ht,
            van_phong_id: user.van_phong_id,
            nhan_vien_id: user.id,
            bien_nhan_id: bn.id,
          },
        }),
        'phieuChi', 'ma_phieu', 'PC', 4, tx,
      );
      phieuChiList.push(phieuChi);

      await tx.bienNhan.update({
        where: { id: bn.id },
        data: { trang_thai_cod: 'da_tra' },
      });
    }

    return { count: phieuChiList.length, phieu_chi_list: phieuChiList };
  });

  // Log per-BN để có thể trace theo entity_id
  for (const bn of bienNhans) {
    writeAuditLog({
      action: 'UPDATE', entity: 'bien_nhan', entityId: bn.id,
      oldData: { trang_thai_cod: 'da_chuyen' },
      newData:  { trang_thai_cod: 'da_tra' },
    });
  }
  return result;
}
