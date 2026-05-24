import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';
import { parseStartOfDayVN, parseEndOfDayVN } from '../utils/date.js';

/**
 * Danh sách PhieuChuyenCOD
 */
export async function listPhieuChuyenCOD({ vp_nhan, vp_gui, trang_thai, from, to, page = 1, limit = 20 }) {
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const where = {};

  if (vp_nhan) where.van_phong_nhan_id = Number(vp_nhan);
  if (vp_gui) where.van_phong_gui_id = Number(vp_gui);
  if (trang_thai) where.trang_thai = trang_thai;
  if (from || to) {
    where.ngay_lap = {};
    if (from) where.ngay_lap.gte = parseStartOfDayVN(from);
    if (to)   where.ngay_lap.lte = parseEndOfDayVN(to);
  }

  const [data, total] = await Promise.all([
    prisma.phieuChuyenCOD.findMany({
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
    prisma.phieuChuyenCOD.count({ where }),
  ]);

  return {
    data,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
  };
}

/**
 * Lập phiếu chuyển COD — gom lô BN da_thu → PhieuChuyenCOD
 * Input: { van_phong_gui_id, bien_nhan_ids[], hinh_thuc, ghi_chu }
 */
export async function createPhieuChuyenCOD({ van_phong_gui_id, bien_nhan_ids, hinh_thuc, ghi_chu }, user) {
  if (!bien_nhan_ids?.length) {
    throw Object.assign(new Error('Danh sách biên nhận không được rỗng'), { statusCode: 400 });
  }

  const bienNhans = await prisma.bienNhan.findMany({
    where: { id: { in: bien_nhan_ids } },
    include: {
      van_phong_gui: { select: { id: true, ten: true } },
      van_phong_nhan: { select: { id: true, ten: true } },
    },
  });

  if (bienNhans.length !== bien_nhan_ids.length) {
    throw Object.assign(new Error('Một hoặc nhiều biên nhận không tìm thấy'), { statusCode: 404 });
  }

  // Validate: tất cả phải da_thu
  const notDaThu = bienNhans.filter(bn => bn.trang_thai_cod !== 'da_thu');
  if (notDaThu.length > 0) {
    const inPending = notDaThu.filter(bn => bn.trang_thai_cod === 'cho_chuyen_pending');
    const others    = notDaThu.filter(bn => bn.trang_thai_cod !== 'cho_chuyen_pending');
    const msgs = [];
    if (inPending.length) msgs.push(`Đang bị khóa trong phiếu chuyển khác: ${inPending.map(b => b.ma_so).join(', ')}`);
    if (others.length)    msgs.push(`Chưa ở trạng thái "Đã thu": ${others.map(b => b.ma_so).join(', ')}`);
    throw Object.assign(new Error(msgs.join(' | ')), { statusCode: 400 });
  }

  // Validate: cùng VP Nhận với user
  const wrongVPNhan = bienNhans.filter(bn => bn.van_phong_nhan_id !== user.van_phong_id);
  if (wrongVPNhan.length > 0) {
    throw Object.assign(new Error('Một số BN không thuộc VP của bạn (cần VP Nhận)'), { statusCode: 403 });
  }

  // Validate: cùng VP Gửi với input
  const vpGuiId = Number(van_phong_gui_id);
  const wrongVPGui = bienNhans.filter(bn => bn.van_phong_gui_id !== vpGuiId);
  if (wrongVPGui.length > 0) {
    throw Object.assign(new Error('Tất cả BN phải cùng một VP gửi'), { statusCode: 400 });
  }

  const soTienTong = bienNhans.reduce((sum, bn) => sum + Number(bn.thu_ho || 0), 0);
  const vpGui = bienNhans[0].van_phong_gui;
  const ht = hinh_thuc || 'tien_mat';

  const result = await prisma.$transaction(async (tx) => {
    // 1. PhieuChi @ VP Nhận (chi tiền đi)
    const phieuChi = await createWithCode(
      async (ma_phieu) => tx.phieuChi.create({
        data: {
          ma_phieu,
          nguoi_nhan: `VP ${vpGui.ten}`,
          ly_do: `Chuyển COD (${bien_nhan_ids.length} BN) về VP ${vpGui.ten}`,
          so_tien: soTienTong,
          hinh_thuc: ht,
          van_phong_id: user.van_phong_id,
          nhan_vien_id: user.id,
        },
      }),
      'phieuChi', 'ma_phieu', 'PC', 4, tx,
    );

    // 2. PhieuChuyenCOD (trang_thai = cho_chuyen, link phieu_chi)
    const phieu = await createWithCode(
      async (ma_phieu) => tx.phieuChuyenCOD.create({
        data: {
          ma_phieu,
          van_phong_nhan_id: user.van_phong_id,
          van_phong_gui_id: vpGuiId,
          so_tien_tong: soTienTong,
          hinh_thuc: ht,
          trang_thai: 'cho_chuyen',
          ghi_chu: ghi_chu || null,
          nhan_vien_lap_id: user.id,
          phieu_chi_id: phieuChi.id,
        },
      }),
      'phieuChuyenCOD', 'ma_phieu', 'PC-COD', 4, tx,
    );

    // 3. Chi tiết BN
    await tx.phieuChuyenCODChiTiet.createMany({
      data: bienNhans.map(bn => ({
        phieu_id: phieu.id,
        bien_nhan_id: bn.id,
        so_tien: bn.thu_ho,
      })),
    });

    // 4. Lock BN — ngăn đưa vào phiếu khác cho đến khi xác nhận nhận tiền
    await tx.bienNhan.updateMany({
      where: { id: { in: bien_nhan_ids } },
      data:  { trang_thai_cod: 'cho_chuyen_pending' },
    });

    return { phieu, phieu_chi: phieuChi };
  });

  writeAuditLog({ action: 'CREATE', entity: 'phieu_chuyen_cod', entityId: result.phieu.id, newData: { bien_nhan_ids, so_tien_tong: soTienTong } });
  return result;
}

/**
 * VP Nhận xác nhận đã gửi tiền đi
 * State: cho_chuyen → da_chuyen
 */
export async function xacNhanChuyen(phieuId, { ghi_chu } = {}, user) {
  const phieu = await prisma.phieuChuyenCOD.findUnique({ where: { id: phieuId } });
  if (!phieu) throw Object.assign(new Error('Không tìm thấy phiếu chuyển COD'), { statusCode: 404 });
  if (phieu.trang_thai !== 'cho_chuyen') {
    throw Object.assign(new Error('Phiếu không ở trạng thái chờ chuyển'), { statusCode: 400 });
  }
  if (phieu.van_phong_nhan_id !== user.van_phong_id) {
    throw Object.assign(new Error('Chỉ VP Nhận mới có thể xác nhận đã gửi tiền'), { statusCode: 403 });
  }

  const updated = await prisma.phieuChuyenCOD.update({
    where: { id: phieuId },
    data: { trang_thai: 'da_chuyen', ngay_chuyen: new Date(), ghi_chu: ghi_chu || undefined },
  });

  writeAuditLog({ action: 'UPDATE', entity: 'phieu_chuyen_cod', entityId: phieuId, newData: { trang_thai: 'da_chuyen' } });
  return updated;
}

/**
 * VP Gửi xác nhận đã nhận tiền
 * State: da_chuyen → da_nhan
 * Side effect: PhieuThu @ VP Gửi + update BN → da_chuyen
 */
export async function xacNhanNhan(phieuId, { hinh_thuc } = {}, user) {
  const phieu = await prisma.phieuChuyenCOD.findUnique({
    where: { id: phieuId },
    include: {
      van_phong_nhan: { select: { id: true, ten: true } },
      van_phong_gui:  { select: { id: true, ten: true } },
      chi_tiet: { select: { bien_nhan_id: true } },
    },
  });

  if (!phieu) throw Object.assign(new Error('Không tìm thấy phiếu chuyển COD'), { statusCode: 404 });
  if (phieu.trang_thai !== 'da_chuyen') {
    throw Object.assign(new Error('Phiếu chưa được xác nhận gửi đi'), { statusCode: 400 });
  }
  if (phieu.van_phong_gui_id !== user.van_phong_id) {
    throw Object.assign(new Error('Chỉ VP Gửi mới có thể xác nhận nhận tiền'), { statusCode: 403 });
  }

  const ht = hinh_thuc || 'tien_mat';
  const bienNhanIds = phieu.chi_tiet.map(ct => ct.bien_nhan_id);

  const result = await prisma.$transaction(async (tx) => {
    // 1. PhieuThu @ VP Gửi
    const phieuThu = await createWithCode(
      async (ma_phieu) => tx.phieuThu.create({
        data: {
          ma_phieu,
          doi_tuong: `VP ${phieu.van_phong_nhan.ten}`,
          ly_do: `Nhận COD từ VP ${phieu.van_phong_nhan.ten} (${phieu.ma_phieu})`,
          so_tien: phieu.so_tien_tong,
          hinh_thuc: ht,
          van_phong_id: user.van_phong_id,
          nhan_vien_id: user.id,
        },
      }),
      'phieuThu', 'ma_phieu', 'PT', 4, tx,
    );

    // 2. Update PhieuChuyenCOD → da_nhan, gắn phieu_thu_id
    await tx.phieuChuyenCOD.update({
      where: { id: phieuId },
      data: {
        trang_thai: 'da_nhan',
        ngay_nhan: new Date(),
        nhan_vien_nhan_id: user.id,
        phieu_thu_id: phieuThu.id,
      },
    });

    // 3. Mở khóa BN: cho_chuyen_pending → da_chuyen (tiền đã về VP Gửi)
    await tx.bienNhan.updateMany({
      where: { id: { in: bienNhanIds } },
      data: { trang_thai_cod: 'da_chuyen' },
    });

    return { phieu_thu: phieuThu, so_bien_nhan: bienNhanIds.length };
  });

  writeAuditLog({ action: 'UPDATE', entity: 'phieu_chuyen_cod', entityId: phieuId, newData: { trang_thai: 'da_nhan' } });
  return result;
}

/**
 * Chi tiết PhieuChuyenCOD (kèm danh sách BN)
 */
export async function getChiTiet(phieuId) {
  const phieu = await prisma.phieuChuyenCOD.findUnique({
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
              ma_so: true,
              nguoi_gui: true, don_vi_gui: true,
              nguoi_nhan: true, don_vi_nhan: true,
              thu_ho: true, trang_thai_cod: true,
            },
          },
        },
      },
    },
  });

  if (!phieu) throw Object.assign(new Error('Không tìm thấy phiếu'), { statusCode: 404 });
  return phieu;
}
