/**
 * reset-to-admin.js
 * Xóa toàn bộ dữ liệu, chỉ giữ lại:
 *   - 3 Văn phòng (SG, CT, RG)
 *   - Tài khoản admin (NV-SG-001 / username: admin)
 *
 * Chạy: node prisma/reset-to-admin.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹  Đang xóa toàn bộ dữ liệu...');

  // Xóa theo thứ tự quan hệ (con trước, cha sau)
  await prisma.auditLog.deleteMany();
  await prisma.loginLog.deleteMany();
  await prisma.bangKeChiTiet.deleteMany();
  await prisma.bangKe.deleteMany();
  await prisma.congNo.deleteMany();
  await prisma.phieuThu.deleteMany();
  await prisma.phieuChi.deleteMany();
  await prisma.lichSuTrangThai.deleteMany();
  await prisma.bienNhan.deleteMany();
  await prisma.khachHang.deleteMany();
  await prisma.chanh.deleteMany();
  await prisma.nhanVien.deleteMany();
  await prisma.vanPhong.deleteMany();

  // Reset sequences
  const sequences = [
    'van_phong', 'nhan_vien', 'khach_hang', 'bien_nhan',
    'lich_su_trang_thai', 'bang_ke', 'bang_ke_chi_tiet',
    'phieu_thu', 'phieu_chi', 'cong_no', 'login_log', 'audit_log', 'chanh',
  ];
  for (const seq of sequences) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${seq}_id_seq RESTART WITH 1`);
  }
  console.log('  ✅  Đã xóa và reset sequences\n');

  // ── Tạo lại 3 Văn phòng ──────────────────────────────────────
  const vpSG = await prisma.vanPhong.create({
    data: { ma_vp: 'SG', ten: 'VP Tp.HCM', dia_chi: '491 Lê Hồng Phong, Phường 2, Quận 10, TP.HCM', dien_thoai: '(028) 383.338.79' },
  });
  await prisma.vanPhong.create({
    data: { ma_vp: 'CT', ten: 'VP Cần Thơ', dia_chi: '20 Đại lộ Hòa Bình, Q.Ninh Kiều, TP Cần Thơ', dien_thoai: '(0292) 222.333' },
  });
  await prisma.vanPhong.create({
    data: { ma_vp: 'RG', ten: 'VP Rạch Giá', dia_chi: '15 Nguyễn Trung Trực, TP Rạch Giá, Kiên Giang', dien_thoai: '(0297) 444.555' },
  });
  console.log('  ✅  3 Văn phòng (SG, CT, RG)');

  // ── Tạo lại tài khoản admin ───────────────────────────────────
  const password = 'Tmq@1234';
  const hash = await bcrypt.hash(password, 10);
  await prisma.nhanVien.create({
    data: {
      ma_nv: 'NV-SG-001',
      ten: 'Admin',
      van_phong_id: vpSG.id,
      role: 'admin',
      username: 'admin',
      password_hash: hash,
      active: true,
    },
  });
  console.log(`  ✅  Tài khoản admin (username: admin / password: ${password})\n`);

  console.log('🎉  Hoàn tất! Database đã được reset về trạng thái mới nhất.');
}

main()
  .catch((e) => { console.error('❌  Lỗi:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
