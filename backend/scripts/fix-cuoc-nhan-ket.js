/**
 * Data Fix Script — Repair BN kẹt trang_thai_cuoc_nhan
 * 
 * Mục tiêu: Tìm tất cả BN có:
 *   - trang_thai = 'khach_da_nhan' (đã giao xong)
 *   - trang_thai_cuoc_nhan = 'cho_thu' (cước chưa được thu — kẹt)
 * 
 * Phân 2 nhóm:
 *   - gia_cuoc = 0: Clear trang_thai_cuoc_nhan về null (không có gì để thu)
 *   - gia_cuoc > 0: Liệt kê để nhân viên thu thủ công qua UI
 * 
 * Chạy: node scripts/fix-cuoc-nhan-ket.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Tìm BN kẹt trang_thai_cuoc_nhan = cho_thu sau khi đã giao...\n');

  const bienNhansKet = await prisma.bienNhan.findMany({
    where: {
      trang_thai: 'khach_da_nhan',
      trang_thai_cuoc_nhan: 'cho_thu',
    },
    select: {
      id: true, ma_so: true, ngay_bien_nhan: true,
      gia_cuoc: true, trang_thai_thu: true,
      van_phong_gui:  { select: { ma_vp: true } },
      van_phong_nhan: { select: { ma_vp: true } },
    },
    orderBy: { ngay_bien_nhan: 'desc' },
  });

  if (bienNhansKet.length === 0) {
    console.log('✅ Không có BN nào bị kẹt. Hệ thống sạch!');
    return;
  }

  console.log(`⚠  Tìm thấy ${bienNhansKet.length} BN bị kẹt:\n`);

  const nhomZero  = bienNhansKet.filter(bn => !bn.gia_cuoc || Number(bn.gia_cuoc) === 0);
  const nhomValid = bienNhansKet.filter(bn => bn.gia_cuoc && Number(bn.gia_cuoc) > 0);

  // ─── Nhóm 1: gia_cuoc = 0 → Clear state ──────────────────────────────────
  if (nhomZero.length > 0) {
    console.log(`📋 Nhóm 1 — gia_cuoc = 0 (${nhomZero.length} BN) → Sẽ clear trang_thai_cuoc_nhan về null:`);
    for (const bn of nhomZero) {
      console.log(`   ${bn.ma_so} | ${bn.van_phong_gui.ma_vp}→${bn.van_phong_nhan.ma_vp} | gia_cuoc=${bn.gia_cuoc}`);
    }

    const zeroIds = nhomZero.map(bn => bn.id);
    const updated = await prisma.bienNhan.updateMany({
      where: { id: { in: zeroIds } },
      data:  { trang_thai_cuoc_nhan: null },
    });
    console.log(`\n   ✅ Đã clear ${updated.count} BN (gia_cuoc = 0)\n`);
  }

  // ─── Nhóm 2: gia_cuoc > 0 → Cần thu thủ công qua UI ─────────────────────
  if (nhomValid.length > 0) {
    console.log(`📋 Nhóm 2 — gia_cuoc > 0 (${nhomValid.length} BN) → Cần thu thủ công qua UI:`);
    let tongCuoc = 0;
    for (const bn of nhomValid) {
      const cuoc = Number(bn.gia_cuoc);
      tongCuoc += cuoc;
      const ngay = new Date(bn.ngay_bien_nhan).toLocaleDateString('vi-VN');
      console.log(`   ${bn.ma_so} | ${bn.van_phong_gui.ma_vp}→${bn.van_phong_nhan.ma_vp} | ${ngay} | ${cuoc.toLocaleString('vi-VN')}đ`);
    }
    console.log(`\n   💰 Tổng cước cần thu: ${tongCuoc.toLocaleString('vi-VN')}đ`);
    console.log('   → Vào màn hình "Cước nhận", filter "Cần thu thủ công", dùng nút "Thu cước" cho từng BN.\n');
  }

  console.log('✅ Script hoàn tất.');
}

main()
  .catch((err) => { console.error('❌ Lỗi:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
