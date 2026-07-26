import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning...');
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

  for (const s of [
    'van_phong','nhan_vien','khach_hang','doanh_nghiep',
    'bien_nhan','lich_su_trang_thai','bang_ke','bang_ke_chi_tiet',
    'phieu_thu','phieu_chi','cong_no','login_log','audit_log',
    'chanh','bien_nhan_thu_ho','phieu_chuyen_cod','phieu_chuyen_cod_chi_tiet',
    'phieu_chuyen_cuoc','phieu_chuyen_cuoc_chi_tiet',
  ]) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${s}_id_seq RESTART WITH 1`);
  }

  // ── VAN PHONG ──
  const vpSG = await prisma.vanPhong.create({ data: { ma_vp:'SG', ten:'VP TP. Hồ Chí Minh', dia_chi:'400 Lê Hồng Phong, Q.10, TP.HCM', dien_thoai:'02838333879' }});
  const vpCT = await prisma.vanPhong.create({ data: { ma_vp:'CT', ten:'VP Cần Thơ', dia_chi:'20 Đại lộ Hòa Bình, Q.Ninh Kiều, TP Cần Thơ', dien_thoai:'02922223344' }});
  const vpRG = await prisma.vanPhong.create({ data: { ma_vp:'RG', ten:'VP Rạch Giá', dia_chi:'15 Nguyễn Trung Trực, TP Rạch Giá', dien_thoai:'02973866444' }});
  console.log('VP: 3');

  // ── NHAN VIEN ──
  const pw = await bcrypt.hash('Tmq@1234', 10);
  await Promise.all([
    prisma.nhanVien.create({ data: { ma_nv:'NV-SG-001', ten:'Trần Minh Quang',   van_phong_id:vpSG.id, role:'admin',   username:'admin',    password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-SG-002', ten:'Nguyễn Thị Thu Hà', van_phong_id:vpSG.id, role:'quan_ly', username:'quanly',   password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-SG-003', ten:'Lê Văn Hùng',       van_phong_id:vpSG.id, role:'staff',   username:'staff_sg', password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-CT-001', ten:'Phạm Thanh Tùng',   van_phong_id:vpCT.id, role:'staff',   username:'staff_ct', password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-CT-002', ten:'Võ Thị Ngọc Hân',   van_phong_id:vpCT.id, role:'quan_ly', username:'quanly_ct',password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-RG-001', ten:'Đặng Hoàng Phúc',   van_phong_id:vpRG.id, role:'staff',   username:'staff_rg', password_hash:pw, require_password_change:false }}),
  ]);
  await prisma.nhanVien.create({ data: { ma_nv:'NV-SG-004', ten:'Bùi Quốc Toàn', van_phong_id:vpSG.id, role:'staff', username:'nv_new', password_hash:pw, require_password_change:true }});
  console.log('NV: 7');

  // ── KHACH HANG (20) ──
  const khData = [
    { ma_kh:'KH-001', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Tâm An Logistics',       nguoi_lien_he:'Nguyễn Văn Tâm',      dien_thoai:'0901234567', dia_chi:'123 Nguyễn Văn Linh, Q.7, TP.HCM',      ma_so_thue:'0312345678' },
    { ma_kh:'KH-002', loai_kh:'doanh_nghiep', ten_don_vi:'Cty CP Hoàng Long Phát',           nguoi_lien_he:'Trần Hoàng Long',     dien_thoai:'0912345678', dia_chi:'456 Điện Biên Phủ, Q.Bình Thạnh',      ma_so_thue:'0301234567' },
    { ma_kh:'KH-003', loai_kh:'doanh_nghiep', ten_don_vi:'DNTN Minh Phát',                   nguoi_lien_he:'Lê Minh Phát',        dien_thoai:'0923456789', dia_chi:'78 Trần Phú, Q.5, TP.HCM' },
    { ma_kh:'KH-004', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Phú Quốc Express',       nguoi_lien_he:'Phạm Quốc Việt',     dien_thoai:'0934567890', dia_chi:'12 Hùng Vương, Phú Quốc',               ma_so_thue:'0100234567' },
    { ma_kh:'KH-005', loai_kh:'doanh_nghiep', ten_don_vi:'Cửa Hàng Thanh Bình',             nguoi_lien_he:'Võ Thanh Bình',      dien_thoai:'0945678901', dia_chi:'234 Đề Thám, Q.1' },
    { ma_kh:'KH-006', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Đại Phong Trading',      nguoi_lien_he:'Đặng Đại Phong',     dien_thoai:'0956789012', dia_chi:'89 Lý Thường Kiệt, Q.10',               ma_so_thue:'0398765432' },
    { ma_kh:'KH-007', loai_kh:'doanh_nghiep', ten_don_vi:'DNTN Hòa Phát Vận Tải',           nguoi_lien_he:'Trương Hòa Phát',    dien_thoai:'0967890123', dia_chi:'56 CMT8, TP Cần Thơ' },
    { ma_kh:'KH-008', loai_kh:'doanh_nghiep', ten_don_vi:'Cty CP Sao Việt',                  nguoi_lien_he:'Lý Sao Việt',        dien_thoai:'0978901234', dia_chi:'10 Võ Văn Kiệt, TP Cần Thơ',            ma_so_thue:'0309876543' },
    { ma_kh:'KH-009', loai_kh:'doanh_nghiep', ten_don_vi:'HTX Nông Sản Sạch Cần Thơ',      nguoi_lien_he:'Huỳnh Thanh Nông',   dien_thoai:'0989012345', dia_chi:'Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ' },
    { ma_kh:'KH-010', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Thiên Phú',              nguoi_lien_he:'Ngô Thiên Phú',      dien_thoai:'0990123456', dia_chi:'321 Nguyễn Trung Trực, TP Rạch Giá',    ma_so_thue:'0316789012', ghi_chu:'Khách VIP, nợ cước cuối tháng' },
    { ma_kh:'KH-011', loai_kh:'ca_nhan',      ten_don_vi:'Nguyễn Anh Tuấn',                  dien_thoai:'0371234567', dia_chi:'15/3 Nguyễn Kiệm, Q.Phú Nhuận' },
    { ma_kh:'KH-012', loai_kh:'ca_nhan',      ten_don_vi:'Trần Thị Mai',                     dien_thoai:'0382345678', dia_chi:'88 Mậu Thân, TP Cần Thơ' },
    { ma_kh:'KH-013', loai_kh:'ca_nhan',      ten_don_vi:'Lê Đăng Khoa',                     dien_thoai:'0393456789', dia_chi:'TP Rạch Giá, Kiên Giang' },
    { ma_kh:'KH-014', loai_kh:'ca_nhan',      ten_don_vi:'Phạm Thùy Linh',                   dien_thoai:'0364567890', dia_chi:'23 Trần Hưng Đạo, TP Cần Thơ' },
    { ma_kh:'KH-015', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH ABC Thương Mại',         nguoi_lien_he:'Nguyễn Văn A',       dien_thoai:'0901111222', dia_chi:'99 Hai Bà Trưng, Q.1',                  active:false },
    { ma_kh:'KH-016', loai_kh:'ca_nhan',      ten_don_vi:'Võ Minh Tuấn',                     dien_thoai:'0333444555', dia_chi:'H.Giồng Riềng, Kiên Giang',                                                  active:false },
    { ma_kh:'KH-017', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH XNK Đồng Bằng Xanh',   nguoi_lien_he:'Bà Nguyễn Thị Thanh Thảo', dien_thoai:'0907777888', dia_chi:'KCN Trà Nóc, TP Cần Thơ', ma_so_thue:'1800123456', ghi_chu:'Xuất HĐDT hàng tháng' },
    { ma_kh:'KH-018', loai_kh:'ca_nhan',      ten_don_vi:'Ngô Thanh Hải',                    dien_thoai:'0358999000' },
    { ma_kh:'KH-019', loai_kh:'doanh_nghiep', ten_don_vi:'Cty CP Kim Long Kiên Giang',      nguoi_lien_he:'Nguyễn Kim Long',    dien_thoai:'0915888999', dia_chi:'48 Nguyễn Trung Trực, TP Rạch Giá',    ma_so_thue:'0100998877' },
    { ma_kh:'KH-020', loai_kh:'ca_nhan',      ten_don_vi:'Huỳnh Thị Nga',                    dien_thoai:'0377665544', dia_chi:'TP Cần Thơ' },
  ];
  for (const c of khData) await prisma.khachHang.create({ data: { active:true, ...c }});
  console.log('KH: 20');

  // ── DOANH NGHIEP + THANH VIEN ──
  const dn1 = await prisma.doanhNghiep.create({ data: { ten:'Tập đoàn Hoàng Long Group',     ma_so_thue:'0301234567', dia_chi:'456 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', dien_thoai:'0912345678', ghi_chu:'Gồm Tâm An Logistics + Hoàng Long Phát' }});
  const dn2 = await prisma.doanhNghiep.create({ data: { ten:'HTX Nông Sản ĐBSCL',            ma_so_thue:'1800123456', dia_chi:'KCN Trà Nóc, TP Cần Thơ',                 dien_thoai:'0907777888', ghi_chu:'Gồm HTX Nông Sản Sạch + XNK Đồng Bằng Xanh' }});
  const dn3 = await prisma.doanhNghiep.create({ data: { ten:'Thiên Phú – Phú Quốc Express', ma_so_thue:'0316789012', dia_chi:'TP Rạch Giá & Phú Quốc, Kiên Giang',      dien_thoai:'0990123456' }});

  const khAll = await prisma.khachHang.findMany({ orderBy:{ ma_kh:'asc' }});
  const fkh = (ma) => khAll.find(k => k.ma_kh === ma);

  for (const ma of ['KH-001','KH-002']) { const k=fkh(ma); if(k) await prisma.khachHang.update({ where:{id:k.id}, data:{doanh_nghiep_id:dn1.id}}); }
  for (const ma of ['KH-009','KH-017']) { const k=fkh(ma); if(k) await prisma.khachHang.update({ where:{id:k.id}, data:{doanh_nghiep_id:dn2.id}}); }
  for (const ma of ['KH-004','KH-010']) { const k=fkh(ma); if(k) await prisma.khachHang.update({ where:{id:k.id}, data:{doanh_nghiep_id:dn3.id}}); }
  console.log(`DN: 3 (${dn1.ten} / ${dn2.ten} / ${dn3.ten}), gắn 6 KH thành viên`);

  // ── CHANH (4) ──
  await prisma.chanh.create({ data:{ ten:'Chành Ba Gác Q7 - Nhà Bè',           dia_chi:'Phường Tân Hưng, Q.7, TP.HCM',     dien_thoai:'0903111222', nguoi_lien_he:'Chú Tư',        ghi_chu:'Hàng cồng kềnh giao các quận ven' }});
  await prisma.chanh.create({ data:{ ten:'Chành Tàu Thủy Cần Thơ - Phong Điền',dia_chi:'Bến phà Cần Thơ cũ, Q.Ninh Kiều', dien_thoai:'0912333444', nguoi_lien_he:'Anh Sáu',       ghi_chu:'Hàng nông sản dọc tuyến sông' }});
  await prisma.chanh.create({ data:{ ten:'Chành Tàu Cao Tốc Superdong',         dia_chi:'Bến tàu Rạch Giá, Nguyễn Công Trứ',dien_thoai:'02973980111',nguoi_lien_he:'Phòng nhận hàng',ghi_chu:'Nhận hàng chuyển ra đảo Phú Quốc, Hòn Tre' }});
  await prisma.chanh.create({ data:{ ten:'Chành Xe Khách RG-HT (cũ)',           dia_chi:'Bến xe Rạch Sỏi, TP Rạch Giá',    dien_thoai:'0901119999', nguoi_lien_he:'Ông Năm',       active:false }});
  console.log('Chành: 4');

  // ── SUMMARY ──
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   SEED COMPLETE (v1.0 — Base Data Only)   ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  VanPhong   : 3  (SG / CT / RG)           ║');
  console.log('║  NhanVien   : 7  (admin + 2 quan_ly + staff)║');
  console.log('║  KhachHang  : 20 (14 active, 2 inactive)  ║');
  console.log('║  DoanhNghiep: 3  (gắn 6 KH thành viên)   ║');
  console.log('║  Chanh      : 4  (3 active, 1 inactive)   ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  admin     → VP SG (toàn quyền)           ║');
  console.log('║  quanly    → VP SG (quản lý + công nợ)   ║');
  console.log('║  quanly_ct → VP CT (quản lý + công nợ)   ║');
  console.log('║  staff_sg / staff_ct / staff_rg            ║');
  console.log('║  Password: Tmq@1234                       ║');
  console.log('╚════════════════════════════════════════════╝\n');
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
