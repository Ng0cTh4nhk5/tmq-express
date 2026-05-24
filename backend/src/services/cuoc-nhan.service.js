import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';
import { parseStartOfDayVN, parseEndOfDayVN } from '../utils/date.js';

// ─────────────────────────────────────────────────────────────────────────────
// DANH SÁCH BN CÓ CƯỚC CHƯA THU
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Danh sách BN có trang_thai_thu = chua_thu
 * Admin: xem tất cả | Staff: chỉ xem VP mình (VP Nhận)
 */
export async function listBNCuocNhan(
  { trang_thai_cuoc_nhan, vp_gui, vp_nhan, from, to, page = 1, limit = 20, search } = {},
  user,
) {
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);

  const where = { trang_thai_thu: 'chua_thu' };

  // Phân quyền: staff chỉ xem VP Nhận của mình
  if (user.role !== 'admin') {
    where.van_phong_nhan_id = user.van_phong_id;
  } else {
    if (vp_nhan) where.van_phong_nhan_id = Number(vp_nhan);
  }

  if (trang_thai_cuoc_nhan) where.trang_thai_cuoc_nhan = trang_thai_cuoc_nhan;
  if (vp_gui) where.van_phong_gui_id = Number(vp_gui);
  if (from || to) {
    where.ngay_bien_nhan = {};
    if (from) where.ngay_bien_nhan.gte = parseStartOfDayVN(from);
    if (to)   where.ngay_bien_nhan.lte = parseEndOfDayVN(to);
  }
  if (search) {
    where.OR = [
      { ma_so:      { contains: search, mode: 'insensitive' } },
      { don_vi_gui: { contains: search, mode: 'insensitive' } },
      { don_vi_nhan:{ contains: search, mode: 'insensitive' } },
      { nguoi_gui:  { contains: search, mode: 'insensitive' } },
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
        van_phong_gui:  { select: { ma_vp: true, ten: true } },
        van_phong_nhan: { select: { ma_vp: true, ten: true } },
        nhan_vien_nhap: { select: { ten: true } },
      },
    }),
    prisma.bienNhan.aggregate({ where, _sum: { gia_cuoc: true }, _count: true }),
  ]);

  return {
    data,
    pagination: { page: p, limit: l, total: agg._count, totalPages: Math.ceil(agg._count / l) },
    summary: { count: agg._count, tong_cuoc: agg._sum.gia_cuoc || 0 },
  };
}

/**
 * Tổng hợp cước nhận theo 4 trạng thái
 */
export async function tongHopCuocNhan({ vp_gui, vp_nhan, from, to } = {}, user) {
  const baseWhere = { trang_thai_thu: 'chua_thu' };

  if (user.role !== 'admin') {
    baseWhere.van_phong_nhan_id = user.van_phong_id;
  } else {
    if (vp_nhan) baseWhere.van_phong_nhan_id = Number(vp_nhan);
  }
  if (vp_gui) baseWhere.van_phong_gui_id = Number(vp_gui);
  if (from || to) {
    baseWhere.ngay_bien_nhan = {};
    if (from) baseWhere.ngay_bien_nhan.gte = parseStartOfDayVN(from);
    if (to)   baseWhere.ngay_bien_nhan.lte = parseEndOfDayVN(to);
  }

  const groups = await prisma.bienNhan.groupBy({
    by: ['trang_thai_cuoc_nhan'],
    where: baseWhere,
    _count: true,
    _sum: { gia_cuoc: true },
  });

  const results = {
    cho_thu:    { count: 0, total: 0 },
    da_thu:     { count: 0, total: 0 },
    cho_chuyen: { count: 0, total: 0 },
    da_nhan:    { count: 0, total: 0 },
  };
  for (const g of groups) {
    const key = g.trang_thai_cuoc_nhan;
    if (key && results[key]) {
      results[key] = { count: g._count, total: Number(g._sum.gia_cuoc || 0) };
    }
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// THU CƯỚC TỪ NGƯỜI NHẬN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thu cước trực tiếp từ người nhận (thủ công hoặc auto)
 * State: cho_thu → da_thu
 * Side effect: PhieuThu @ VP Nhận
 */
export async function xacNhanThuCuocNhan(
  bienNhanId,
  { hinh_thuc, ghi_chu, nguoi_nop } = {},
  user,
) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: { van_phong_nhan: { select: { id: true, ten: true } } },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
  if (bn.trang_thai_thu !== 'chua_thu') {
    throw Object.assign(
      new Error('Biên nhận này không ở trạng thái "Chưa thu"'),
      { statusCode: 400 },
    );
  }
  if (bn.trang_thai_cuoc_nhan !== 'cho_thu') {
    const msg = bn.trang_thai_cuoc_nhan === 'da_thu'
      ? 'Cước đã được thu rồi'
      : bn.trang_thai_cuoc_nhan === 'cho_chuyen'
        ? 'Cước đang trong phiếu chuyển, bị khóa'
        : 'Cước đã hoàn tất';
    throw Object.assign(new Error(msg), { statusCode: 400 });
  }
  if (!bn.gia_cuoc || Number(bn.gia_cuoc) <= 0) {
    throw Object.assign(new Error('Biên nhận không có tiền cước để thu'), { statusCode: 400 });
  }

  const tenNguoiNop = nguoi_nop || bn.don_vi_nhan || bn.nguoi_nhan || 'Không xác định';
  const ht = hinh_thuc || 'tien_mat';

  const result = await prisma.$transaction(async (tx) => {
    // 1. Cập nhật trạng thái cước
    const updatedBN = await tx.bienNhan.update({
      where: { id: bienNhanId },
      data:  { trang_thai_cuoc_nhan: 'da_thu' },
    });

    // 2. Tạo PhieuThu @ VP Nhận
    const phieuThu = await createWithCode(
      async (ma_phieu) => tx.phieuThu.create({
        data: {
          ma_phieu,
          doi_tuong: tenNguoiNop,
          ly_do:     `Thu cước BN ${bn.ma_so} — Người nhận trả${ghi_chu ? ` (${ghi_chu})` : ''}`,
          so_tien:   bn.gia_cuoc,
          hinh_thuc: ht,
          van_phong_id:  bn.van_phong_nhan_id,
          nhan_vien_id:  user.id,
          bien_nhan_id:  bn.id,
        },
      }),
      'phieuThu', 'ma_phieu', 'PT', 4, tx,
    );

    return { bn: updatedBN, phieu_thu: phieuThu };
  });

  writeAuditLog({
    action: 'UPDATE', entity: 'bien_nhan', entityId: bienNhanId,
    newData: { trang_thai_cuoc_nhan: 'da_thu' },
  });
  return result;
}

/**
 * Auto thu cước — gọi từ PATCH trang-thai khi khach_da_nhan
 */
export async function xacNhanThuCuocNhanAuto(bienNhanId, user) {
  return xacNhanThuCuocNhan(
    bienNhanId,
    { hinh_thuc: 'tien_mat', ghi_chu: 'Tự động thu cước khi giao hàng' },
    user,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHIẾU CHUYỂN CƯỚC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Danh sách PhieuChuyenCuoc
 * Admin: xem tất cả | Staff: xem theo VP (nhan hoặc gui)
 */
export async function listPhieuChuyenCuoc(
  { vp_nhan, vp_gui, trang_thai, from, to, page = 1, limit = 20 } = {},
  user,
) {
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const where = {};

  if (user.role !== 'admin') {
    // Staff chỉ xem phiếu liên quan VP mình (VP Nhận lập hoặc VP Gửi xác nhận)
    where.OR = [
      { van_phong_nhan_id: user.van_phong_id },
      { van_phong_gui_id:  user.van_phong_id },
    ];
  } else {
    if (vp_nhan) where.van_phong_nhan_id = Number(vp_nhan);
    if (vp_gui)  where.van_phong_gui_id  = Number(vp_gui);
  }

  if (trang_thai) where.trang_thai = trang_thai;
  if (from || to) {
    where.ngay_lap = {};
    if (from) where.ngay_lap.gte = parseStartOfDayVN(from);
    if (to)   where.ngay_lap.lte = parseEndOfDayVN(to);
  }

  const [data, total] = await Promise.all([
    prisma.phieuChuyenCuoc.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { created_at: 'desc' },
      include: {
        van_phong_nhan: { select: { ma_vp: true, ten: true } },
        van_phong_gui:  { select: { ma_vp: true, ten: true } },
        nhan_vien_lap:  { select: { ten: true } },
        nhan_vien_nhan: { select: { ten: true } },
        _count: { select: { chi_tiet: true } },
      },
    }),
    prisma.phieuChuyenCuoc.count({ where }),
  ]);

  return { data, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

/**
 * Chi tiết PhieuChuyenCuoc (kèm danh sách BN)
 */
export async function getChiTietPhieuCuoc(phieuId) {
  const phieu = await prisma.phieuChuyenCuoc.findUnique({
    where: { id: phieuId },
    include: {
      van_phong_nhan: { select: { ma_vp: true, ten: true } },
      van_phong_gui:  { select: { ma_vp: true, ten: true } },
      nhan_vien_lap:  { select: { ten: true } },
      nhan_vien_nhan: { select: { ten: true } },
      phieu_chi: { select: { ma_phieu: true, so_tien: true, ngay_chi: true } },
      phieu_thu: { select: { ma_phieu: true, so_tien: true, ngay_thu: true } },
      chi_tiet: {
        include: {
          bien_nhan: {
            select: {
              ma_so: true, gia_cuoc: true, trang_thai_cuoc_nhan: true,
              nguoi_gui: true, don_vi_gui: true,
              nguoi_nhan: true, don_vi_nhan: true,
            },
          },
        },
      },
    },
  });
  if (!phieu) throw Object.assign(new Error('Không tìm thấy phiếu chuyển cước'), { statusCode: 404 });
  return phieu;
}

/**
 * Lập phiếu chuyển cước — gom lô BN da_thu → PhieuChuyenCuoc
 * Input: { van_phong_gui_id, bien_nhan_ids[], hinh_thuc, ghi_chu }
 */
export async function createPhieuChuyenCuoc(
  { van_phong_gui_id, bien_nhan_ids, hinh_thuc, ghi_chu },
  user,
) {
  if (!bien_nhan_ids?.length) {
    throw Object.assign(new Error('Danh sách biên nhận không được rỗng'), { statusCode: 400 });
  }

  const bienNhans = await prisma.bienNhan.findMany({
    where: { id: { in: bien_nhan_ids } },
    include: {
      van_phong_gui:  { select: { id: true, ten: true } },
      van_phong_nhan: { select: { id: true, ten: true } },
    },
  });

  if (bienNhans.length !== bien_nhan_ids.length) {
    throw Object.assign(new Error('Một hoặc nhiều biên nhận không tìm thấy'), { statusCode: 404 });
  }

  // Validate: phải là da_thu (đã thu từ người nhận)
  const notDaThu = bienNhans.filter(bn => bn.trang_thai_cuoc_nhan !== 'da_thu');
  if (notDaThu.length > 0) {
    const inPending = notDaThu.filter(bn => bn.trang_thai_cuoc_nhan === 'cho_chuyen');
    const others    = notDaThu.filter(bn => bn.trang_thai_cuoc_nhan !== 'cho_chuyen');
    const msgs = [];
    if (inPending.length) msgs.push(`Đang bị khóa trong phiếu khác: ${inPending.map(b => b.ma_so).join(', ')}`);
    if (others.length)    msgs.push(`Chưa ở trạng thái "Đã thu cước": ${others.map(b => b.ma_so).join(', ')}`);
    throw Object.assign(new Error(msgs.join(' | ')), { statusCode: 400 });
  }

  // Validate: cùng VP Nhận với user (staff) hoặc bất kỳ (admin)
  if (user.role !== 'admin') {
    const wrongVPNhan = bienNhans.filter(bn => bn.van_phong_nhan_id !== user.van_phong_id);
    if (wrongVPNhan.length > 0) {
      throw Object.assign(new Error('Một số BN không thuộc VP của bạn (cần VP Nhận)'), { statusCode: 403 });
    }
  }

  // Validate: cùng VP Gửi với input
  const vpGuiId = Number(van_phong_gui_id);
  const wrongVPGui = bienNhans.filter(bn => bn.van_phong_gui_id !== vpGuiId);
  if (wrongVPGui.length > 0) {
    throw Object.assign(new Error('Tất cả BN phải cùng một VP gửi'), { statusCode: 400 });
  }

  const soTienTong = bienNhans.reduce((sum, bn) => sum + Number(bn.gia_cuoc || 0), 0);
  const vpGui = bienNhans[0].van_phong_gui;
  const vpNhanId = bienNhans[0].van_phong_nhan_id;
  const ht = hinh_thuc || 'tien_mat';

  const result = await prisma.$transaction(async (tx) => {
    // 1. PhieuChi @ VP Nhận (chi tiền cước đi)
    const phieuChi = await createWithCode(
      async (ma_phieu) => tx.phieuChi.create({
        data: {
          ma_phieu,
          nguoi_nhan: `VP ${vpGui.ten}`,
          ly_do:      `Chuyển cước nhận (${bien_nhan_ids.length} BN) về VP ${vpGui.ten}`,
          so_tien:    soTienTong,
          hinh_thuc:  ht,
          van_phong_id:  user.van_phong_id,
          nhan_vien_id:  user.id,
        },
      }),
      'phieuChi', 'ma_phieu', 'PC', 4, tx,
    );

    // 2. PhieuChuyenCuoc
    const phieu = await createWithCode(
      async (ma_phieu) => tx.phieuChuyenCuoc.create({
        data: {
          ma_phieu,
          van_phong_nhan_id: vpNhanId,
          van_phong_gui_id:  vpGuiId,
          so_tien_tong:      soTienTong,
          hinh_thuc:         ht,
          trang_thai:        'cho_chuyen',
          ghi_chu:           ghi_chu || null,
          nhan_vien_lap_id:  user.id,
          phieu_chi_id:      phieuChi.id,
        },
      }),
      'phieuChuyenCuoc', 'ma_phieu', 'PC-CUOC', 4, tx,
    );

    // 3. Chi tiết BN
    await tx.phieuChuyenCuocChiTiet.createMany({
      data: bienNhans.map(bn => ({
        phieu_id:     phieu.id,
        bien_nhan_id: bn.id,
        so_tien:      bn.gia_cuoc,
      })),
    });

    // 4. Lock BN
    await tx.bienNhan.updateMany({
      where: { id: { in: bien_nhan_ids } },
      data:  { trang_thai_cuoc_nhan: 'cho_chuyen' },
    });

    return { phieu, phieu_chi: phieuChi };
  });

  writeAuditLog({
    action: 'CREATE', entity: 'phieu_chuyen_cuoc', entityId: result.phieu.id,
    newData: { bien_nhan_ids, so_tien_tong: soTienTong },
  });
  return result;
}

/**
 * VP Nhận xác nhận đã gửi tiền đi
 * State phiếu: cho_chuyen → da_chuyen
 */
export async function xacNhanChuyenCuoc(phieuId, { ghi_chu } = {}, user) {
  const phieu = await prisma.phieuChuyenCuoc.findUnique({ where: { id: phieuId } });
  if (!phieu) throw Object.assign(new Error('Không tìm thấy phiếu chuyển cước'), { statusCode: 404 });
  if (phieu.trang_thai !== 'cho_chuyen') {
    throw Object.assign(new Error('Phiếu không ở trạng thái chờ chuyển'), { statusCode: 400 });
  }
  if (user.role !== 'admin' && phieu.van_phong_nhan_id !== user.van_phong_id) {
    throw Object.assign(new Error('Chỉ VP Nhận mới có thể xác nhận đã gửi tiền'), { statusCode: 403 });
  }

  const updated = await prisma.phieuChuyenCuoc.update({
    where: { id: phieuId },
    data:  { trang_thai: 'da_chuyen', ngay_chuyen: new Date(), ghi_chu: ghi_chu || undefined },
  });

  writeAuditLog({ action: 'UPDATE', entity: 'phieu_chuyen_cuoc', entityId: phieuId, newData: { trang_thai: 'da_chuyen' } });
  return updated;
}

/**
 * VP Gửi xác nhận đã nhận tiền
 * State phiếu: da_chuyen → da_nhan
 * State BN: cho_chuyen → da_nhan
 * Side effect: PhieuThu @ VP Gửi
 */
export async function xacNhanNhanCuoc(phieuId, { hinh_thuc } = {}, user) {
  const phieu = await prisma.phieuChuyenCuoc.findUnique({
    where: { id: phieuId },
    include: {
      van_phong_nhan: { select: { id: true, ten: true } },
      van_phong_gui:  { select: { id: true, ten: true } },
      chi_tiet: { select: { bien_nhan_id: true } },
    },
  });

  if (!phieu) throw Object.assign(new Error('Không tìm thấy phiếu chuyển cước'), { statusCode: 404 });
  if (phieu.trang_thai !== 'da_chuyen') {
    throw Object.assign(new Error('Phiếu chưa được xác nhận gửi đi'), { statusCode: 400 });
  }
  if (user.role !== 'admin' && phieu.van_phong_gui_id !== user.van_phong_id) {
    throw Object.assign(new Error('Chỉ VP Gửi mới có thể xác nhận nhận tiền'), { statusCode: 403 });
  }

  const ht = hinh_thuc || 'tien_mat';
  const bienNhanIds = phieu.chi_tiet.map(ct => ct.bien_nhan_id);

  const result = await prisma.$transaction(async (tx) => {
    // 1. PhieuThu @ VP Gửi (thu cước về)
    const phieuThu = await createWithCode(
      async (ma_phieu) => tx.phieuThu.create({
        data: {
          ma_phieu,
          doi_tuong: `VP ${phieu.van_phong_nhan.ten}`,
          ly_do:     `Nhận cước từ VP ${phieu.van_phong_nhan.ten} (${phieu.ma_phieu})`,
          so_tien:   phieu.so_tien_tong,
          hinh_thuc: ht,
          van_phong_id:  user.van_phong_id,
          nhan_vien_id:  user.id,
        },
      }),
      'phieuThu', 'ma_phieu', 'PT', 4, tx,
    );

    // 2. Update phiếu → da_nhan
    await tx.phieuChuyenCuoc.update({
      where: { id: phieuId },
      data:  {
        trang_thai:        'da_nhan',
        ngay_nhan:         new Date(),
        nhan_vien_nhan_id: user.id,
        phieu_thu_id:      phieuThu.id,
      },
    });

    // 3. Update BN: cho_chuyen → da_nhan (terminal) + hoàn tất tài chính
    await tx.bienNhan.updateMany({
      where: { id: { in: bienNhanIds } },
      data:  {
        trang_thai_cuoc_nhan: 'da_nhan',
        trang_thai_thu: 'da_thu', // VP Gửi đã nhận đủ tiền cước — hoàn tất tài chính BN
      },
    });

    return { phieu_thu: phieuThu, so_bien_nhan: bienNhanIds.length };
  });

  writeAuditLog({ action: 'UPDATE', entity: 'phieu_chuyen_cuoc', entityId: phieuId, newData: { trang_thai: 'da_nhan' } });
  return result;
}
