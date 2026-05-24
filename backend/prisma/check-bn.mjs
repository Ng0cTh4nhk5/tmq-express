import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const rows = await prisma.bienNhan.findMany({
  select: { id: true, ma_so: true, don_vi_gui: true, ten_hang_hoa: true, trang_thai: true, trang_thai_cod: true, trang_thai_thu: true },
  orderBy: { id: 'asc' }
});
console.log(`\nTổng: ${rows.length} biên nhận\n`);
rows.forEach(r => {
  console.log(`[${String(r.id).padStart(2)}] ${r.ma_so.padEnd(12)} | ${(r.don_vi_gui || '(trống)').substring(0,30).padEnd(30)} | ${(r.ten_hang_hoa || '').padEnd(15)} | ${r.trang_thai} | ${r.trang_thai_cod} | ${r.trang_thai_thu}`);
});
await prisma.$disconnect();
