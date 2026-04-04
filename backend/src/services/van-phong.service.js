import prisma from '../config/database.js';

export async function getAllVanPhong(activeOnly = false) {
  const where = activeOnly ? { active: true } : {};
  return prisma.vanPhong.findMany({ where, orderBy: { ma_vp: 'asc' } });
}

export async function createVanPhong(data) {
  return prisma.vanPhong.create({ data });
}

export async function updateVanPhong(id, data) {
  // Không cho sửa ma_vp
  const { ma_vp, ...updateData } = data;
  return prisma.vanPhong.update({ where: { id }, data: updateData });
}

export async function toggleVanPhongActive(id, active) {
  // Khi deactivate: kiểm tra ràng buộc
  if (!active) {
    const [bnDangXuLy, nvActive] = await Promise.all([
      prisma.bienNhan.count({
        where: {
          OR: [{ van_phong_gui_id: id }, { van_phong_nhan_id: id }],
          trang_thai: { notIn: ['khach_da_nhan'] },
        },
      }),
      prisma.nhanVien.count({
        where: { van_phong_id: id, active: true },
      }),
    ]);

    const errors = [];
    if (bnDangXuLy > 0) errors.push(`${bnDangXuLy} biên nhận đang xử lý`);
    if (nvActive > 0) errors.push(`${nvActive} nhân viên đang hoạt động`);

    if (errors.length > 0) {
      throw Object.assign(
        new Error(`Không thể vô hiệu hóa VP: còn ${errors.join(', ')}`),
        { statusCode: 400 },
      );
    }
  }

  return prisma.vanPhong.update({ where: { id }, data: { active } });
}

