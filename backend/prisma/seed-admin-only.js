import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹  Đang làm sạch dữ liệu...');

  // Xóa theo thứ tự phụ thuộc (bảng con trước, bảng cha sau)
  await prisma.auditLog.deleteMany();
  await prisma.loginLog.deleteMany();
  await prisma.bangKeChiTiet.deleteMany();
  await prisma.bangKe.deleteMany();
  await prisma.phieuChuyenCuocChiTiet.deleteMany();
  await prisma.phieuChuyenCuoc.deleteMany();
  await prisma.phieuChuyenCODChiTiet.deleteMany();
  await prisma.phieuChuyenCOD.deleteMany();
  await prisma.bienNhanThuHo.deleteMany();
  await prisma.congNo.deleteMany();
  await prisma.phieuThu.deleteMany();
  await prisma.phieuChi.deleteMany();
  await prisma.lichSuTrangThai.deleteMany();
  await prisma.bienNhan.deleteMany();
  await prisma.khachHang.deleteMany();
  await prisma.doanhNghiep.deleteMany();
  await prisma.nhanVien.deleteMany();
  await prisma.chanh.deleteMany();
  await prisma.vanPhong.deleteMany();

  // Reset sequences về 1
  for (const s of [
    'van_phong', 'nhan_vien', 'khach_hang', 'doanh_nghiep',
    'bien_nhan', 'lich_su_trang_thai', 'bang_ke', 'bang_ke_chi_tiet',
    'phieu_thu', 'phieu_chi', 'cong_no', 'login_log', 'audit_log',
    'chanh', 'bien_nhan_thu_ho', 'phieu_chuyen_cod', 'phieu_chuyen_cod_chi_tiet',
    'phieu_chuyen_cuoc', 'phieu_chuyen_cuoc_chi_tiet',
  ]) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${s}_id_seq RESTART WITH 1`);
  }

  // ── VĂN PHÒNG (3 VP chuẩn) ──
  const vpSG = await prisma.vanPhong.create({
    data: { ma_vp: 'SG', ten: 'VP TP. Hồ Chí Minh', dia_chi: '400 Lê Hồng Phong, Q.10, TP.HCM', dien_thoai: '02838333879' },
  });
  await prisma.vanPhong.create({
    data: { ma_vp: 'CT', ten: 'VP Cần Thơ', dia_chi: '20 Đại lộ Hòa Bình, Q.Ninh Kiều, TP Cần Thơ', dien_thoai: '02922223344' },
  });
  await prisma.vanPhong.create({
    data: { ma_vp: 'RG', ten: 'VP Rạch Giá', dia_chi: '15 Nguyễn Trung Trực, TP Rạch Giá', dien_thoai: '02973866444' },
  });

  // ── NHÂN VIÊN (Duy nhất 1 tài khoản Admin) ──
  const password = 'Tmq@1234';
  const pwHash = await bcrypt.hash(password, 10);
  await prisma.nhanVien.create({
    data: {
      ma_nv: 'NV-SG-001',
      ten: 'Trần Hồ Quang',
      van_phong_id: vpSG.id,
      role: 'admin',
      username: 'admin',
      password_hash: pwHash,
      require_password_change: false,
      active: true,
    },
  });

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   SEED ADMIN-ONLY COMPLETE                        ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log('║  Văn phòng : 3 (SG / CT / RG)                     ║');
  console.log('║  Tài khoản : 1 Admin duy nhất                     ║');
  console.log('║  Username  : admin                                ║');
  console.log('║  Password  : Tmq@1234                             ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed Admin Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
