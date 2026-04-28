import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';

/**
 * Danh sách BN có COD (thu_ho > 0)
 * @param {Object} params - { trang_thai_cod, vp_gui, vp_nhan, from, to, page, limit, search }
 * @returns {{ data, pagination, summary }}
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
    if (from) where.ngay_bien_nhan.gte = new Date(from);
    if (to) where.ngay_bien_nhan.lte = new Date(to + 'T23:59:59.999Z');
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
      },
    }),
    prisma.bienNhan.aggregate({
      where,
      _sum: { thu_ho: true },
      _count: true,
    }),
  ]);

  const total = agg._count;
  return {
    data,
    pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    summary: { count: total, total_thu_ho: agg._sum.thu_ho || 0 },
  };
}

/**
 * Tổng hợp COD theo 4 trạng thái
 * @returns {{ cho_thu: {count, total}, da_thu: {count, total}, da_chuyen: {count, total}, da_tra: {count, total} }}
 */
export async function tongHopThuHo({ vp_gui, vp_nhan, from, to } = {}) {
  const baseWhere = { thu_ho: { gt: 0 } };
  if (vp_gui) baseWhere.van_phong_gui_id = Number(vp_gui);
  if (vp_nhan) baseWhere.van_phong_nhan_id = Number(vp_nhan);
  if (from || to) {
    baseWhere.ngay_bien_nhan = {};
    if (from) baseWhere.ngay_bien_nhan.gte = new Date(from);
    if (to) baseWhere.ngay_bien_nhan.lte = new Date(to + 'T23:59:59.999Z');
  }

  // M2: 1 query groupBy thay vì 4 aggregate riêng
  const groups = await prisma.bienNhan.groupBy({
    by: ['trang_thai_cod'],
    where: baseWhere,
    _count: true,
    _sum: { thu_ho: true },
  });

  // Khởi tạo kết quả mặc định
  const results = {
    cho_thu:   { count: 0, total: 0 },
    da_thu:    { count: 0, total: 0 },
    da_chuyen: { count: 0, total: 0 },
    da_tra:    { count: 0, total: 0 },
  };
  for (const g of groups) {
    if (results[g.trang_thai_cod]) {
      results[g.trang_thai_cod] = { count: g._count, total: g._sum.thu_ho || 0 };
    }
  }
  return results;
}

/**
 * Xác nhận thu COD — NV tại VP nhận thu tiền từ người nhận
 * Side effect: tạo PhieuThu tại VP nhận
 */
export async function xacNhanThuCOD(bienNhanId, { hinh_thuc, ghi_chu } = {}, user) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: {
      van_phong_nhan: { select: { id: true, ten: true } },
    },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
  // C3: Positive guard — chỉ cho_thu mới được thu
  if (bn.trang_thai_cod !== 'cho_thu') {
    const msg = bn.trang_thai_cod === 'khong_co'
      ? 'Biên nhận này không có tiền thu hộ (COD)'
      : 'COD đã được thu hoặc đang xử lý, không thể thu lại';
    throw Object.assign(new Error(msg), { statusCode: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update trạng thái COD
    const updatedBN = await tx.bienNhan.update({
      where: { id: bienNhanId },
      data: { trang_thai_cod: 'da_thu' },
    });

    // 2. Tạo PhieuThu tại VP NHẬN — C1: pass tx vào createWithCode
    const phieuThu = await createWithCode(
      async (ma_phieu) => {
        return tx.phieuThu.create({
          data: {
            ma_phieu,
            doi_tuong: bn.don_vi_nhan || bn.nguoi_nhan || 'Không xác định',
            ly_do: `Thu hộ COD BN ${bn.ma_so}`,
            so_tien: bn.thu_ho,
            hinh_thuc: hinh_thuc || 'tien_mat',
            van_phong_id: bn.van_phong_nhan_id,
            nhan_vien_id: user.id,
            bien_nhan_id: bn.id,
          },
        });
      },
      'phieuThu', 'ma_phieu', 'PT', 4, tx,
    );

    return { bn: updatedBN, phieu_thu: phieuThu };
  });

  writeAuditLog({
    action: 'UPDATE',
    entity: 'bien_nhan',
    entityId: bienNhanId,
    newData: { trang_thai_cod: 'da_thu', ghi_chu },
  });
  return result;
}

/**
 * Auto thu COD — gọi từ PATCH trang-thai khi khach_da_nhan
 * Dùng defaults: tien_mat + ghi chú tự động
 */
export async function xacNhanThuCODAuto(bienNhanId, user) {
  return xacNhanThuCOD(
    bienNhanId,
    { hinh_thuc: 'tien_mat', ghi_chu: 'Tự động thu COD khi giao hàng' },
    user,
  );
}

/**
 * Xác nhận chuyển COD — VP nhận chuyển tiền về VP gửi
 * Side effect: PhieuChi@VP_nhận + PhieuThu@VP_gửi
 */
export async function xacNhanChuyenCOD(bienNhanId, { hinh_thuc, ghi_chu } = {}, user) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: {
      van_phong_gui: { select: { id: true, ten: true } },
      van_phong_nhan: { select: { id: true, ten: true } },
    },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
  // C3: Positive guard — chỉ da_thu mới được chuyển
  if (bn.trang_thai_cod !== 'da_thu') {
    const msg = ['khong_co', 'cho_thu'].includes(bn.trang_thai_cod)
      ? 'Chưa thu COD từ người nhận, không thể chuyển'
      : 'COD đã được chuyển hoặc hoàn tất';
    throw Object.assign(new Error(msg), { statusCode: 400 });
  }

  const ht = hinh_thuc || 'tien_mat';

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update trạng thái COD
    const updatedBN = await tx.bienNhan.update({
      where: { id: bienNhanId },
      data: { trang_thai_cod: 'da_chuyen' },
    });

    // 2. Tạo PhieuChi tại VP NHẬN (chi ra) — C1: pass tx
    const phieuChi = await createWithCode(
      async (ma_phieu) => {
        return tx.phieuChi.create({
          data: {
            ma_phieu,
            nguoi_nhan: `VP ${bn.van_phong_gui.ten}`,
            ly_do: `Chuyển COD BN ${bn.ma_so} về VP gửi`,
            so_tien: bn.thu_ho,
            hinh_thuc: ht,
            van_phong_id: bn.van_phong_nhan_id,
            nhan_vien_id: user.id,
          },
        });
      },
      'phieuChi', 'ma_phieu', 'PC', 4, tx,
    );

    // 3. Tạo PhieuThu tại VP GỬI (nhận vào) — C1: pass tx
    const phieuThu = await createWithCode(
      async (ma_phieu) => {
        return tx.phieuThu.create({
          data: {
            ma_phieu,
            doi_tuong: `VP ${bn.van_phong_nhan.ten}`,
            ly_do: `Nhận COD BN ${bn.ma_so} từ VP nhận`,
            so_tien: bn.thu_ho,
            hinh_thuc: ht,
            van_phong_id: bn.van_phong_gui_id,
            nhan_vien_id: user.id,
            bien_nhan_id: bn.id,
          },
        });
      },
      'phieuThu', 'ma_phieu', 'PT', 4, tx,
    );

    return { bn: updatedBN, phieu_chi: phieuChi, phieu_thu: phieuThu };
  });

  writeAuditLog({
    action: 'UPDATE',
    entity: 'bien_nhan',
    entityId: bienNhanId,
    newData: { trang_thai_cod: 'da_chuyen', ghi_chu },
  });
  return result;
}

/**
 * Xác nhận trả COD — VP gửi trả tiền cho người gửi
 * Side effect: PhieuChi@VP_gửi
 */
export async function xacNhanTraCOD(bienNhanId, { hinh_thuc, ghi_chu } = {}, user) {
  const bn = await prisma.bienNhan.findUnique({
    where: { id: bienNhanId },
    include: {
      van_phong_gui: { select: { id: true, ten: true } },
    },
  });

  if (!bn) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
  // C3: Positive guard — chỉ da_chuyen mới được trả
  if (bn.trang_thai_cod !== 'da_chuyen') {
    const msg = bn.trang_thai_cod === 'da_tra'
      ? 'COD đã hoàn tất cho biên nhận này'
      : 'COD chưa được chuyển về VP gửi, không thể trả';
    throw Object.assign(new Error(msg), { statusCode: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update trạng thái COD
    const updatedBN = await tx.bienNhan.update({
      where: { id: bienNhanId },
      data: { trang_thai_cod: 'da_tra' },
    });

    // 2. Tạo PhieuChi tại VP GỬI (chi ra cho người gửi) — C1: pass tx
    const phieuChi = await createWithCode(
      async (ma_phieu) => {
        return tx.phieuChi.create({
          data: {
            ma_phieu,
            nguoi_nhan: bn.don_vi_gui || bn.nguoi_gui || 'Không xác định',
            ly_do: `Trả COD BN ${bn.ma_so} cho người gửi`,
            so_tien: bn.thu_ho,
            hinh_thuc: hinh_thuc || 'tien_mat',
            van_phong_id: bn.van_phong_gui_id,
            nhan_vien_id: user.id,
          },
        });
      },
      'phieuChi', 'ma_phieu', 'PC', 4, tx,
    );

    return { bn: updatedBN, phieu_chi: phieuChi };
  });

  writeAuditLog({
    action: 'UPDATE',
    entity: 'bien_nhan',
    entityId: bienNhanId,
    newData: { trang_thai_cod: 'da_tra', ghi_chu },
  });
  return result;
}
