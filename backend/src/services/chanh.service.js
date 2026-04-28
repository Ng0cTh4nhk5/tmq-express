import prisma from '../config/database.js';

/**
 * Danh sách tất cả chành (có lọc theo VP nếu cần)
 */
export async function getAllChanh({ van_phong_id, active } = {}) {
  const where = {};
  if (van_phong_id) where.van_phong_id = Number(van_phong_id);
  if (active !== undefined) where.active = active;

  return prisma.chanh.findMany({
    where,
    orderBy: [{ van_phong_id: 'asc' }, { ten: 'asc' }],
    include: {
      van_phong: { select: { ma_vp: true, ten: true } },
    },
  });
}

/**
 * Xem chi tiết 1 chành
 */
export async function getChanhById(id) {
  const chanh = await prisma.chanh.findUnique({
    where: { id },
    include: {
      van_phong: { select: { ma_vp: true, ten: true } },
    },
  });
  if (!chanh) throw Object.assign(new Error('Không tìm thấy chành'), { statusCode: 404 });
  return chanh;
}

/**
 * Tạo chành mới
 */
export async function createChanh(data) {
  // Kiểm tra VP tồn tại
  const vp = await prisma.vanPhong.findUnique({ where: { id: data.van_phong_id } });
  if (!vp) throw Object.assign(new Error('Văn phòng không tồn tại'), { statusCode: 400 });

  return prisma.chanh.create({
    data: {
      ten: data.ten,
      dia_chi: data.dia_chi || null,
      dien_thoai: data.dien_thoai || null,
      nguoi_lien_he: data.nguoi_lien_he || null,
      van_phong_id: data.van_phong_id,
      ghi_chu: data.ghi_chu || null,
    },
    include: {
      van_phong: { select: { ma_vp: true, ten: true } },
    },
  });
}

/**
 * Cập nhật chành
 */
export async function updateChanh(id, data) {
  const existing = await prisma.chanh.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy chành'), { statusCode: 404 });

  const updateData = {};
  const allowed = ['ten', 'dia_chi', 'dien_thoai', 'nguoi_lien_he', 'ghi_chu'];
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  // Cho phép chuyển VP nếu truyền van_phong_id
  if (data.van_phong_id !== undefined) {
    const vp = await prisma.vanPhong.findUnique({ where: { id: data.van_phong_id } });
    if (!vp) throw Object.assign(new Error('Văn phòng không tồn tại'), { statusCode: 400 });
    updateData.van_phong_id = data.van_phong_id;
  }

  return prisma.chanh.update({
    where: { id },
    data: updateData,
    include: {
      van_phong: { select: { ma_vp: true, ten: true } },
    },
  });
}

/**
 * Bật/tắt trạng thái chành
 */
export async function toggleChanhActive(id, active) {
  const existing = await prisma.chanh.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy chành'), { statusCode: 404 });

  return prisma.chanh.update({
    where: { id },
    data: { active },
  });
}
