import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';

export async function listCongNo({ trang_thai, page = 1, limit = 20, search }) {
  const where = {};
  if (trang_thai) {
    where.trang_thai = { in: trang_thai.split(',') };
  }
  if (search) {
    where.OR = [
      { doi_tuong: { contains: search, mode: 'insensitive' } },
      { bien_nhan: { ma_so: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [data, total, summary] = await Promise.all([
    prisma.congNo.findMany({
      where,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { ngay_phat_sinh: 'desc' },
      include: {
        bien_nhan: { select: { ma_so: true, don_vi_gui: true, don_vi_nhan: true, gia_cuoc: true } },
        phieu_thu: { select: { ma_phieu: true } },
      },
    }),
    prisma.congNo.count({ where }),
    prisma.congNo.aggregate({
      where: { trang_thai: { in: ['chua_thu', 'qua_han'] } },
      _sum: { so_tien_no: true },
      _count: true,
    }),
  ]);

  // Check quá hạn (>30 ngày)
  const now = new Date();
  const enriched = data.map((cn) => {
    const ngayPhatSinh = new Date(cn.ngay_phat_sinh);
    const daysDiff = Math.floor((now - ngayPhatSinh) / (1000 * 60 * 60 * 24));
    return { ...cn, qua_han: daysDiff > 30 && cn.trang_thai === 'chua_thu', so_ngay: daysDiff };
  });

  return {
    data: enriched,
    summary: {
      tong_no: Number(summary._sum.so_tien_no || 0),
      so_cong_no: summary._count,
    },
    pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  };
}

export async function xacNhanThanhToan(congNoId, { hinh_thuc, ghi_chu }, user) {
  const cn = await prisma.congNo.findUnique({
    where: { id: congNoId },
    include: { bien_nhan: true },
  });
  if (!cn) throw Object.assign(new Error('Không tìm thấy công nợ'), { statusCode: 404 });
  if (cn.trang_thai === 'da_thu') {
    throw Object.assign(new Error('Công nợ đã được thu'), { statusCode: 400 });
  }

  // Tạo phiếu thu an toàn (retry on unique violation) + cập nhật công nợ
  const phieuThu = await createWithCode(
    (ma_phieu) => prisma.$transaction(async (tx) => {
      const pt = await tx.phieuThu.create({
        data: {
          ma_phieu,
          doi_tuong: cn.doi_tuong,
          ly_do: `Thu công nợ BN ${cn.bien_nhan.ma_so}${ghi_chu ? ` - ${ghi_chu}` : ''}`,
          so_tien: cn.so_tien_no,
          hinh_thuc: hinh_thuc || 'tien_mat',
          van_phong_id: user.van_phong_id,
          nhan_vien_id: user.id,
          bien_nhan_id: cn.bien_nhan_id,
        },
      });

      await tx.congNo.update({
        where: { id: congNoId },
        data: {
          trang_thai: 'da_thu',
          ngay_thu: new Date(),
          phieu_thu_id: pt.id,
        },
      });

      return pt;
    }),
    'phieuThu', 'ma_phieu', 'PT',
  );

  return { phieu_thu: { id: phieuThu.id, ma_phieu: phieuThu.ma_phieu } };
}

