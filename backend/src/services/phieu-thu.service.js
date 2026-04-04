import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';

export async function listPhieuThu({ page = 1, limit = 20, from, to, van_phong_id, hinh_thuc, search }) {
  const where = { da_huy: false };
  if (van_phong_id) where.van_phong_id = Number(van_phong_id);
  if (hinh_thuc) where.hinh_thuc = hinh_thuc;
  if (from || to) {
    where.ngay_thu = {};
    if (from) where.ngay_thu.gte = new Date(from);
    if (to) where.ngay_thu.lte = new Date(to + 'T23:59:59');
  }
  if (search) {
    where.OR = [
      { ma_phieu: { contains: search, mode: 'insensitive' } },
      { doi_tuong: { contains: search, mode: 'insensitive' } },
      { ly_do: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.phieuThu.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { ngay_thu: 'desc' },
      include: {
        nhan_vien: { select: { ten: true } },
        bien_nhan: { select: { ma_so: true } },
      },
    }),
    prisma.phieuThu.count({ where }),
  ]);
  return { data, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) } };
}

export async function getPhieuThu(id) {
  const pt = await prisma.phieuThu.findUnique({
    where: { id },
    include: {
      nhan_vien: { select: { ten: true } },
      bien_nhan: { select: { ma_so: true, don_vi_gui: true, don_vi_nhan: true, gia_cuoc: true } },
    },
  });
  if (!pt) throw Object.assign(new Error('Không tìm thấy phiếu thu'), { statusCode: 404 });
  return pt;
}

export async function createPhieuThu(data, user) {
  // Auto-fill từ biên nhận nếu có
  let doi_tuong = data.doi_tuong;
  let ly_do = data.ly_do;
  let so_tien = data.so_tien;

  if (data.bien_nhan_id) {
    const bn = await prisma.bienNhan.findUnique({ where: { id: data.bien_nhan_id } });
    if (bn) {
      doi_tuong = doi_tuong || bn.don_vi_gui || bn.nguoi_gui || '';
      ly_do = ly_do || `Thu cước BN ${bn.ma_so}`;
      so_tien = so_tien || Number(bn.gia_cuoc);
    }
  }

  // Sử dụng createWithCode để tránh race condition (retry on unique violation)
  const result = await createWithCode(
    (ma_phieu) => prisma.phieuThu.create({
      data: {
        ma_phieu,
        doi_tuong,
        ly_do,
        so_tien,
        hinh_thuc: data.hinh_thuc || 'tien_mat',
        van_phong_id: user.van_phong_id,
        nhan_vien_id: user.id,
        bien_nhan_id: data.bien_nhan_id || null,
      },
    }),
    'phieuThu', 'ma_phieu', 'PT',
  );

  writeAuditLog({ action: 'CREATE', entity: 'phieu_thu', entityId: result.id, newData: result });
  return result;
}

export async function updatePhieuThu(id, data, user) {
  const pt = await prisma.phieuThu.findUnique({ where: { id } });
  if (!pt) throw Object.assign(new Error('Không tìm thấy phiếu thu'), { statusCode: 404 });
  if (user.role !== 'admin' && pt.nhan_vien_id !== user.id) {
    throw Object.assign(new Error('Chỉ sửa phiếu do mình tạo'), { statusCode: 403 });
  }

  return prisma.phieuThu.update({
    where: { id },
    data: {
      doi_tuong: data.doi_tuong,
      ly_do: data.ly_do,
      so_tien: data.so_tien,
      hinh_thuc: data.hinh_thuc,
    },
  });
}

export async function huyPhieuThu(id) {
  const pt = await prisma.phieuThu.findUnique({ where: { id } });
  if (!pt) throw Object.assign(new Error('Không tìm thấy phiếu thu'), { statusCode: 404 });
  if (pt.da_huy) throw Object.assign(new Error('Phiếu đã hủy trước đó'), { statusCode: 400 });

  return prisma.$transaction(async (tx) => {
    // Hủy phiếu thu
    await tx.phieuThu.update({ where: { id }, data: { da_huy: true } });

    // Revert CongNo liên kết (nếu PT được tạo từ xác nhận thanh toán công nợ)
    await tx.congNo.updateMany({
      where: { phieu_thu_id: id },
      data: { trang_thai: 'chua_thu', ngay_thu: null, phieu_thu_id: null },
    });
  });
}
