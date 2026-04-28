import prisma from '../config/database.js';

export async function listDoanhNghiep({ search, active } = {}) {
  const where = {};
  if (active !== undefined) where.active = active === true || active === 'true';
  if (search?.trim()) {
    where.OR = [
      { ten: { contains: search.trim(), mode: 'insensitive' } },
      { ma_so_thue: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }
  return prisma.doanhNghiepHDDT.findMany({
    where,
    orderBy: [{ active: 'desc' }, { ten: 'asc' }],
  });
}

export async function createDoanhNghiep(data) {
  return prisma.doanhNghiepHDDT.create({
    data: {
      ten: data.ten.trim(),
      ma_so_thue: data.ma_so_thue?.trim() || null,
      dia_chi: data.dia_chi?.trim() || null,
    },
  });
}

export async function updateDoanhNghiep(id, data) {
  return prisma.doanhNghiepHDDT.update({
    where: { id },
    data: {
      ten: data.ten?.trim(),
      ma_so_thue: data.ma_so_thue?.trim() || null,
      dia_chi: data.dia_chi?.trim() || null,
    },
  });
}

export async function toggleDoanhNghiep(id, active) {
  return prisma.doanhNghiepHDDT.update({
    where: { id },
    data: { active },
  });
}
