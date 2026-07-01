import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

function daysAgo(n, h = 8) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d;
}
function monthsAgo(m, day = 15, h = 8) {
  const d = new Date(); d.setMonth(d.getMonth() - m); d.setDate(day); d.setHours(h, 0, 0, 0); return d;
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

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
  for (const s of ['van_phong','nhan_vien','khach_hang','doanh_nghiep','bien_nhan','lich_su_trang_thai','bang_ke','bang_ke_chi_tiet','phieu_thu','phieu_chi','cong_no','login_log','audit_log','chanh','bien_nhan_thu_ho','phieu_chuyen_cod','phieu_chuyen_cod_chi_tiet','phieu_chuyen_cuoc','phieu_chuyen_cuoc_chi_tiet']) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${s}_id_seq RESTART WITH 1`);
  }

  // ── VAN PHONG ──
  const vpSG = await prisma.vanPhong.create({ data: { ma_vp:'SG', ten:'VP TP. Hồ Chí Minh', dia_chi:'491 Lê Hồng Phong, Q.10, TP.HCM', dien_thoai:'02838333879' }});
  const vpCT = await prisma.vanPhong.create({ data: { ma_vp:'CT', ten:'VP Cần Thơ', dia_chi:'20 Đại lộ Hòa Bình, Q.Ninh Kiều, TP Cần Thơ', dien_thoai:'02922223344' }});
  const vpRG = await prisma.vanPhong.create({ data: { ma_vp:'RG', ten:'VP Rạch Giá', dia_chi:'15 Nguyễn Trung Trực, TP Rạch Giá', dien_thoai:'02973866444' }});
  console.log('VP: 3');

  // ── NHAN VIEN ──
  const pw = await bcrypt.hash('Tmq@1234', 10);
  const [nvAdmin, nvKeToan, nvSG, nvCT, nvKeToanCT, nvRG] = await Promise.all([
    prisma.nhanVien.create({ data: { ma_nv:'NV-SG-001', ten:'Trần Minh Quang', van_phong_id:vpSG.id, role:'admin', username:'admin', password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-SG-002', ten:'Nguyễn Thị Thu Hà', van_phong_id:vpSG.id, role:'staff', username:'ketoan', password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-SG-003', ten:'Lê Văn Hùng', van_phong_id:vpSG.id, role:'staff', username:'staff_sg', password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-CT-001', ten:'Phạm Thanh Tùng', van_phong_id:vpCT.id, role:'staff', username:'staff_ct', password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-CT-002', ten:'Võ Thị Ngọc Hân', van_phong_id:vpCT.id, role:'staff', username:'ketoan_ct', password_hash:pw, require_password_change:false }}),
    prisma.nhanVien.create({ data: { ma_nv:'NV-RG-001', ten:'Đặng Hoàng Phúc', van_phong_id:vpRG.id, role:'staff', username:'staff_rg', password_hash:pw, require_password_change:false }}),
  ]);
  await prisma.nhanVien.create({ data: { ma_nv:'NV-SG-004', ten:'Bùi Quốc Toàn', van_phong_id:vpSG.id, role:'staff', username:'nv_new', password_hash:pw, require_password_change:true }});
  console.log('NV: 7');

  // ── KHACH HANG (20) ──
  const khData = [
    { ma_kh:'KH-001', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Tâm An Logistics', nguoi_lien_he:'Nguyễn Văn Tâm', dien_thoai:'0901234567', dia_chi:'123 Nguyễn Văn Linh, Q.7, TP.HCM', ma_so_thue:'0312345678' },
    { ma_kh:'KH-002', loai_kh:'doanh_nghiep', ten_don_vi:'Cty CP Hoàng Long Phát', nguoi_lien_he:'Trần Hoàng Long', dien_thoai:'0912345678', dia_chi:'456 Điện Biên Phủ, Q.Bình Thạnh', ma_so_thue:'0301234567' },
    { ma_kh:'KH-003', loai_kh:'doanh_nghiep', ten_don_vi:'DNTN Minh Phát', nguoi_lien_he:'Lê Minh Phát', dien_thoai:'0923456789', dia_chi:'78 Trần Phú, Q.5, TP.HCM' },
    { ma_kh:'KH-004', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Phú Quốc Express', nguoi_lien_he:'Phạm Quốc Việt', dien_thoai:'0934567890', dia_chi:'12 Hùng Vương, Phú Quốc', ma_so_thue:'0100234567' },
    { ma_kh:'KH-005', loai_kh:'doanh_nghiep', ten_don_vi:'Cửa Hàng Thanh Bình', nguoi_lien_he:'Võ Thanh Bình', dien_thoai:'0945678901', dia_chi:'234 Đề Thám, Q.1' },
    { ma_kh:'KH-006', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Đại Phong Trading', nguoi_lien_he:'Đặng Đại Phong', dien_thoai:'0956789012', dia_chi:'89 Lý Thường Kiệt, Q.10', ma_so_thue:'0398765432' },
    { ma_kh:'KH-007', loai_kh:'doanh_nghiep', ten_don_vi:'DNTN Hòa Phát Vận Tải', nguoi_lien_he:'Trương Hòa Phát', dien_thoai:'0967890123', dia_chi:'56 CMT8, TP Cần Thơ' },
    { ma_kh:'KH-008', loai_kh:'doanh_nghiep', ten_don_vi:'Cty CP Sao Việt', nguoi_lien_he:'Lý Sao Việt', dien_thoai:'0978901234', dia_chi:'10 Võ Văn Kiệt, TP Cần Thơ', ma_so_thue:'0309876543' },
    { ma_kh:'KH-009', loai_kh:'doanh_nghiep', ten_don_vi:'HTX Nông Sản Sạch Cần Thơ', nguoi_lien_he:'Huỳnh Thanh Nông', dien_thoai:'0989012345', dia_chi:'Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ' },
    { ma_kh:'KH-010', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH Thiên Phú', nguoi_lien_he:'Ngô Thiên Phú', dien_thoai:'0990123456', dia_chi:'321 Nguyễn Trung Trực, TP Rạch Giá', ma_so_thue:'0316789012', ghi_chu:'Khách VIP, nợ cước cuối tháng' },
    { ma_kh:'KH-011', loai_kh:'ca_nhan', ten_don_vi:'Nguyễn Anh Tuấn', dien_thoai:'0371234567', dia_chi:'15/3 Nguyễn Kiệm, Q.Phú Nhuận' },
    { ma_kh:'KH-012', loai_kh:'ca_nhan', ten_don_vi:'Trần Thị Mai', dien_thoai:'0382345678', dia_chi:'88 Mậu Thân, TP Cần Thơ' },
    { ma_kh:'KH-013', loai_kh:'ca_nhan', ten_don_vi:'Lê Đăng Khoa', dien_thoai:'0393456789', dia_chi:'TP Rạch Giá, Kiên Giang' },
    { ma_kh:'KH-014', loai_kh:'ca_nhan', ten_don_vi:'Phạm Thùy Linh', dien_thoai:'0364567890', dia_chi:'23 Trần Hưng Đạo, TP Cần Thơ' },
    { ma_kh:'KH-015', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH ABC Thương Mại', nguoi_lien_he:'Nguyễn Văn A', dien_thoai:'0901111222', dia_chi:'99 Hai Bà Trưng, Q.1', active:false },
    { ma_kh:'KH-016', loai_kh:'ca_nhan', ten_don_vi:'Võ Minh Tuấn', dien_thoai:'0333444555', dia_chi:'H.Giồng Riềng, Kiên Giang', active:false },
    { ma_kh:'KH-017', loai_kh:'doanh_nghiep', ten_don_vi:'Cty TNHH XNK Đồng Bằng Xanh', nguoi_lien_he:'Bà Nguyễn Thị Thanh Thảo', dien_thoai:'0907777888', dia_chi:'KCN Trà Nóc, TP Cần Thơ', ma_so_thue:'1800123456', ghi_chu:'Xuất HĐDT hàng tháng' },
    { ma_kh:'KH-018', loai_kh:'ca_nhan', ten_don_vi:'Ngô Thanh Hải', dien_thoai:'0358999000' },
    { ma_kh:'KH-019', loai_kh:'doanh_nghiep', ten_don_vi:'Cty CP Kim Long Kiên Giang', nguoi_lien_he:'Nguyễn Kim Long', dien_thoai:'0915888999', dia_chi:'48 Nguyễn Trung Trực, TP Rạch Giá', ma_so_thue:'0100998877' },
    { ma_kh:'KH-020', loai_kh:'ca_nhan', ten_don_vi:'Huỳnh Thị Nga', dien_thoai:'0377665544', dia_chi:'TP Cần Thơ' },
  ];
  for (const c of khData) await prisma.khachHang.create({ data: { active:true, ...c }});
  console.log('KH: 20');

  // ── DOANH NGHIEP + THANH VIEN ──
  const dn1 = await prisma.doanhNghiep.create({ data: { ten:'Tập đoàn Hoàng Long Group', ma_so_thue:'0301234567', dia_chi:'456 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', dien_thoai:'0912345678', ghi_chu:'Gồm Tâm An Logistics + Hoàng Long Phát' }});
  const dn2 = await prisma.doanhNghiep.create({ data: { ten:'HTX Nông Sản ĐBSCL', ma_so_thue:'1800123456', dia_chi:'KCN Trà Nóc, TP Cần Thơ', dien_thoai:'0907777888', ghi_chu:'Gồm HTX Nông Sản Sạch + XNK Đồng Bằng Xanh' }});
  const dn3 = await prisma.doanhNghiep.create({ data: { ten:'Thiên Phú – Phú Quốc Express', ma_so_thue:'0316789012', dia_chi:'TP Rạch Giá & Phú Quốc, Kiên Giang', dien_thoai:'0990123456' }});
  const khAll = await prisma.khachHang.findMany({ orderBy:{ ma_kh:'asc' }});
  const fkh = (ma) => khAll.find(k => k.ma_kh === ma);
  for (const ma of ['KH-001','KH-002']) { const k=fkh(ma); if(k) await prisma.khachHang.update({ where:{id:k.id}, data:{doanh_nghiep_id:dn1.id}}); }
  for (const ma of ['KH-009','KH-017']) { const k=fkh(ma); if(k) await prisma.khachHang.update({ where:{id:k.id}, data:{doanh_nghiep_id:dn2.id}}); }
  for (const ma of ['KH-004','KH-010']) { const k=fkh(ma); if(k) await prisma.khachHang.update({ where:{id:k.id}, data:{doanh_nghiep_id:dn3.id}}); }
  console.log('DN: 3, gắn 6 KH thành viên');

  // ── CHANH (4) ──
  const chanhBaGac = await prisma.chanh.create({ data:{ ten:'Chành Ba Gác Q7 - Nhà Bè', dia_chi:'Phường Tân Hưng, Q.7, TP.HCM', dien_thoai:'0903111222', nguoi_lien_he:'Chú Tư', ghi_chu:'Hàng cồng kềnh giao các quận ven' }});
  const chanhTauThuy = await prisma.chanh.create({ data:{ ten:'Chành Tàu Thủy Cần Thơ - Phong Điền', dia_chi:'Bến phà Cần Thơ cũ, Q.Ninh Kiều', dien_thoai:'0912333444', nguoi_lien_he:'Anh Sáu', ghi_chu:'Hàng nông sản dọc tuyến sông' }});
  const chanhSuperdong = await prisma.chanh.create({ data:{ ten:'Chành Tàu Cao Tốc Superdong', dia_chi:'Bến tàu Rạch Giá, Nguyễn Công Trứ', dien_thoai:'02973980111', nguoi_lien_he:'Phòng nhận hàng', ghi_chu:'Nhận hàng chuyển ra đảo Phú Quốc, Hòn Tre' }});
  await prisma.chanh.create({ data:{ ten:'Chành Xe Khách RG-HT (cũ)', dia_chi:'Bến xe Rạch Sỏi, TP Rạch Giá', dien_thoai:'0901119999', nguoi_lien_he:'Ông Năm', active:false }});
  console.log('Chành: 4');

  if (process.env.SKIP_BIEN_NHAN) {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║   SEED COMPLETE (SKIPPED BIEN NHAN)       ║');
    console.log('╚═══════════════════════════════════════════╝\n');
    return;
  }

  // ── HELPER mkBN ──
  const mkBN = (ma_so, date, vpGId, vpNId, nvId, fields={}) => ({
    ma_so, ngay_bien_nhan:date,
    van_phong_gui_id:vpGId, van_phong_nhan_id:vpNId, nhan_vien_nhap_id:nvId,
    don_vi_gui:'Cty TNHH Tâm An Logistics', nguoi_gui:'Nguyễn Văn Tâm', dien_thoai_gui:'0901234567',
    don_vi_nhan:'Cty TNHH Thiên Phú', nguoi_nhan:'Ngô Thiên Phú', dien_thoai_nhan:'0990123456',
    dia_chi_nhan:'321 Nguyễn Trung Trực, TP Rạch Giá',
    ten_hang_hoa:'3 Thùng', hang_hoa_json:[{don_vi:'Thùng',so_luong:3,ghi_chu:''}],
    gia_tri_hang:3000000, trong_luong:15, thu_ho:0,
    gia_cuoc:200000, trang_thai_thu:'da_thu', trang_thai_cod:'khong_co',
    trang_thai:'cho_vc', hinh_thuc_giao:'tan_noi',
    can_xuat_hddt:false, da_vao_bang_ke:false, hang_hu_khong_den:false,
    kh_gui_id:null, kh_nhan_id:null, chanh_id:null, dia_chi_giao:null,
    ...fields,
  });

  // ── BIEN NHAN HOM NAY (Group A-Today: 9 BN) ──
  const khTamAn = fkh('KH-001'); const khThienPhu = fkh('KH-010');
  const khHoangLong = fkh('KH-002'); const khHTX = fkh('KH-009');
  const khPhuQuoc = fkh('KH-004'); const khMinhPhat = fkh('KH-003');
  const todayBNs = [
    mkBN('TC-T01', new Date(), vpSG.id, vpCT.id, nvSG.id, { kh_gui_id:khTamAn?.id }),
    mkBN('TC-T02', new Date(), vpSG.id, vpCT.id, nvSG.id, { can_xuat_hddt:true, gia_cuoc:350000, kh_gui_id:khHoangLong?.id }),
    mkBN('TC-T03', new Date(), vpSG.id, vpRG.id, nvAdmin.id, { can_xuat_hddt:true, da_vao_bang_ke:false, gia_cuoc:400000 }),
    mkBN('TC-T04', new Date(), vpCT.id, vpSG.id, nvCT.id, { hinh_thuc_giao:'goi_dien', gia_cuoc:180000 }),
    mkBN('TC-T05', new Date(), vpCT.id, vpRG.id, nvCT.id, { hinh_thuc_giao:'tu_toi', gia_cuoc:150000 }),
    mkBN('TC-T06', new Date(), vpRG.id, vpSG.id, nvRG.id, { gia_cuoc:450000, kh_nhan_id:khTamAn?.id }),
    mkBN('TC-T07', new Date(), vpRG.id, vpCT.id, nvRG.id, { chanh_id:chanhTauThuy.id, dia_chi_giao:'56 CMT8, TP Cần Thơ', trang_thai:'dang_giao' }),
    mkBN('TC-T08', new Date(), vpSG.id, vpRG.id, nvSG.id, { thu_ho:2000000, trang_thai_cod:'cho_thu', gia_cuoc:300000 }),
    mkBN('TC-T09', new Date(), vpCT.id, vpSG.id, nvKeToanCT.id, { trang_thai_thu:'cong_no', gia_cuoc:250000, kh_gui_id:khHTX?.id }),
  ];
  for (const bn of todayBNs) await prisma.bienNhan.create({ data:bn });
  console.log('BN hôm nay: 9');

  // ── BIEN NHAN THANG TRUOC (T-1: 14 BN) ──
  const t1BNs = [
    mkBN('TC-M101', monthsAgo(1,3),  vpSG.id, vpCT.id, nvSG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:220000, can_xuat_hddt:true, kh_gui_id:khTamAn?.id }),
    mkBN('TC-M102', monthsAgo(1,5),  vpSG.id, vpCT.id, nvAdmin.id,    { trang_thai:'khach_da_nhan', gia_cuoc:310000, can_xuat_hddt:true, kh_gui_id:khHoangLong?.id }),
    mkBN('TC-M103', monthsAgo(1,7),  vpSG.id, vpRG.id, nvSG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:420000, can_xuat_hddt:true, chanh_id:chanhSuperdong.id, dia_chi_giao:'12 Hùng Vương, Phú Quốc' }),
    mkBN('TC-M104', monthsAgo(1,9),  vpCT.id, vpSG.id, nvCT.id,       { trang_thai:'khach_da_nhan', gia_cuoc:185000, hinh_thuc_giao:'goi_dien' }),
    mkBN('TC-M105', monthsAgo(1,11), vpCT.id, vpRG.id, nvKeToanCT.id, { trang_thai:'khach_da_nhan', gia_cuoc:260000, kh_gui_id:khHTX?.id }),
    mkBN('TC-M106', monthsAgo(1,13), vpRG.id, vpSG.id, nvRG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:390000, kh_nhan_id:khTamAn?.id }),
    mkBN('TC-M107', monthsAgo(1,15), vpSG.id, vpCT.id, nvSG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:175000, thu_ho:1500000, trang_thai_cod:'da_tra', hinh_thuc_giao:'tu_toi' }),
    mkBN('TC-M108', monthsAgo(1,17), vpSG.id, vpRG.id, nvAdmin.id,    { trang_thai:'khach_da_nhan', gia_cuoc:500000, can_xuat_hddt:true, da_vao_bang_ke:true, kh_gui_id:khTamAn?.id }),
    mkBN('TC-M109', monthsAgo(1,19), vpCT.id, vpSG.id, nvCT.id,       { trang_thai:'khach_da_nhan', gia_cuoc:210000, trang_thai_thu:'cong_no' }),
    mkBN('TC-M110', monthsAgo(1,21), vpRG.id, vpCT.id, nvRG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:320000, chanh_id:chanhTauThuy.id, dia_chi_giao:'56 CMT8, TP Cần Thơ' }),
    mkBN('TC-M111', monthsAgo(1,23), vpSG.id, vpCT.id, nvKeToan.id,   { trang_thai:'khach_da_nhan', gia_cuoc:145000, can_xuat_hddt:true, kh_gui_id:khMinhPhat?.id }),
    mkBN('TC-M112', monthsAgo(1,25), vpCT.id, vpRG.id, nvCT.id,       { trang_thai:'khach_da_nhan', gia_cuoc:380000, kh_gui_id:khHTX?.id, kh_nhan_id:khPhuQuoc?.id }),
    mkBN('TC-M113', monthsAgo(1,27), vpSG.id, vpRG.id, nvSG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:290000, trang_thai_thu:'cong_no', kh_gui_id:khHoangLong?.id }),
    mkBN('TC-M114', monthsAgo(1,28), vpRG.id, vpSG.id, nvRG.id,       { trang_thai:'da_den_kho',    gia_cuoc:230000 }),
  ];
  for (const bn of t1BNs) await prisma.bienNhan.create({ data:bn });
  console.log('BN T-1: 14');

  // ── BIEN NHAN 2 THANG TRUOC (T-2: 12 BN) ──
  const t2BNs = [
    mkBN('TC-M201', monthsAgo(2,2),  vpSG.id, vpCT.id, nvSG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:195000, can_xuat_hddt:true, da_vao_bang_ke:true }),
    mkBN('TC-M202', monthsAgo(2,5),  vpSG.id, vpRG.id, nvAdmin.id,    { trang_thai:'khach_da_nhan', gia_cuoc:460000, can_xuat_hddt:true, da_vao_bang_ke:true, kh_gui_id:khTamAn?.id }),
    mkBN('TC-M203', monthsAgo(2,8),  vpCT.id, vpSG.id, nvCT.id,       { trang_thai:'khach_da_nhan', gia_cuoc:170000 }),
    mkBN('TC-M204', monthsAgo(2,10), vpCT.id, vpRG.id, nvKeToanCT.id, { trang_thai:'khach_da_nhan', gia_cuoc:330000, kh_gui_id:khHTX?.id }),
    mkBN('TC-M205', monthsAgo(2,12), vpRG.id, vpSG.id, nvRG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:410000, can_xuat_hddt:true, da_vao_bang_ke:true }),
    mkBN('TC-M206', monthsAgo(2,14), vpSG.id, vpCT.id, nvSG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:240000, thu_ho:3000000, trang_thai_cod:'da_tra' }),
    mkBN('TC-M207', monthsAgo(2,16), vpRG.id, vpCT.id, nvRG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:280000, chanh_id:chanhTauThuy.id }),
    mkBN('TC-M208', monthsAgo(2,18), vpSG.id, vpRG.id, nvKeToan.id,   { trang_thai:'khach_da_nhan', gia_cuoc:520000, can_xuat_hddt:true, da_vao_bang_ke:true }),
    mkBN('TC-M209', monthsAgo(2,20), vpCT.id, vpSG.id, nvCT.id,       { trang_thai:'khach_da_nhan', gia_cuoc:160000 }),
    mkBN('TC-M210', monthsAgo(2,22), vpSG.id, vpCT.id, nvAdmin.id,    { trang_thai:'khach_da_nhan', gia_cuoc:300000, trang_thai_thu:'cong_no', kh_gui_id:khHoangLong?.id }),
    mkBN('TC-M211', monthsAgo(2,24), vpRG.id, vpSG.id, nvRG.id,       { trang_thai:'khach_da_nhan', gia_cuoc:350000, kh_nhan_id:khMinhPhat?.id }),
    mkBN('TC-M212', monthsAgo(2,26), vpCT.id, vpRG.id, nvKeToanCT.id, { trang_thai:'khach_da_nhan', gia_cuoc:275000 }),
  ];
  for (const bn of t2BNs) await prisma.bienNhan.create({ data:bn });
  console.log('BN T-2: 12');

  // ── GROUP B: Cước nhận (6 BN) ──
  const groupB = [
    mkBN('TC-B01', daysAgo(1), vpCT.id, vpRG.id, nvCT.id,       { trang_thai_thu:'chua_thu', trang_thai_cuoc_nhan:'cho_thu', gia_cuoc:350000 }),
    mkBN('TC-B02', daysAgo(3), vpSG.id, vpRG.id, nvAdmin.id,     { trang_thai:'da_den_kho', trang_thai_thu:'chua_thu', trang_thai_cuoc_nhan:'da_thu', gia_cuoc:400000 }),
    mkBN('TC-B03', daysAgo(5), vpRG.id, vpSG.id, nvRG.id,        { trang_thai:'da_den_kho', trang_thai_thu:'chua_thu', trang_thai_cuoc_nhan:'cho_chuyen', gia_cuoc:300000 }),
    mkBN('TC-B04', daysAgo(8), vpSG.id, vpCT.id, nvSG.id,        { trang_thai:'khach_da_nhan', trang_thai_thu:'chua_thu', trang_thai_cuoc_nhan:'da_nhan', gia_cuoc:250000 }),
    mkBN('TC-B05', daysAgo(2), vpCT.id, vpSG.id, nvKeToanCT.id,  { trang_thai:'dang_vc', trang_thai_thu:'chua_thu', trang_thai_cuoc_nhan:'cho_thu', gia_cuoc:180000 }),
    mkBN('TC-B06', daysAgo(4), vpRG.id, vpCT.id, nvRG.id,        { trang_thai:'da_den_kho', trang_thai_thu:'chua_thu', trang_thai_cuoc_nhan:'da_thu', gia_cuoc:290000, hinh_thuc_giao:'goi_dien' }),
  ];
  for (const bn of groupB) await prisma.bienNhan.create({ data:bn });
  console.log('BN Group B (cước nhận): 6');

  // ── GROUP C: Công nợ (6 BN, gắn KH/DN) ──
  const groupC = [
    mkBN('TC-C01', new Date(), vpSG.id, vpCT.id, nvSG.id,         { trang_thai_thu:'cong_no', gia_cuoc:300000, kh_gui_id:khTamAn?.id }),
    mkBN('TC-C02', daysAgo(5), vpCT.id, vpRG.id, nvKeToanCT.id,  { trang_thai:'da_den_kho', trang_thai_thu:'cong_no', gia_cuoc:200000 }),
    mkBN('TC-C03', daysAgo(8), vpRG.id, vpSG.id, nvRG.id,         { trang_thai:'khach_da_nhan', trang_thai_thu:'cong_no', gia_cuoc:150000, hinh_thuc_giao:'tu_toi' }),
    mkBN('TC-C04', monthsAgo(1,10), vpSG.id, vpRG.id, nvAdmin.id, { trang_thai:'khach_da_nhan', trang_thai_thu:'cong_no', gia_cuoc:420000, kh_gui_id:khHoangLong?.id }),
    mkBN('TC-C05', monthsAgo(1,20), vpCT.id, vpSG.id, nvCT.id,   { trang_thai:'khach_da_nhan', trang_thai_thu:'cong_no', gia_cuoc:280000, kh_gui_id:khHTX?.id }),
    mkBN('TC-C06', monthsAgo(2,5),  vpSG.id, vpCT.id, nvSG.id,   { trang_thai:'khach_da_nhan', trang_thai_thu:'cong_no', gia_cuoc:360000, kh_gui_id:khTamAn?.id }),
  ];
  for (const bn of groupC) await prisma.bienNhan.create({ data:bn });
  console.log('BN Group C (công nợ): 6');

  // ── GROUP D: COD (8 BN) ──
  const groupD = [
    mkBN('TC-D01', new Date(), vpCT.id, vpSG.id, nvCT.id,              { thu_ho:2000000, trang_thai_cod:'cho_thu' }),
    mkBN('TC-D02', daysAgo(3), vpSG.id, vpCT.id, nvAdmin.id,           { trang_thai:'da_den_kho', thu_ho:3000000, trang_thai_cod:'da_thu_chanh', chanh_id:chanhTauThuy.id, dia_chi_giao:'56 CMT8, TP Cần Thơ' }),
    mkBN('TC-D03', daysAgo(4), vpRG.id, vpSG.id, nvRG.id,              { trang_thai:'da_den_kho', thu_ho:1500000, trang_thai_cod:'da_thu' }),
    mkBN('TC-D04', daysAgo(6), vpCT.id, vpRG.id, nvCT.id,              { trang_thai:'da_den_kho', thu_ho:2500000, trang_thai_cod:'cho_chuyen_pending' }),
    mkBN('TC-D05', daysAgo(10), vpSG.id, vpRG.id, nvAdmin.id,          { trang_thai:'khach_da_nhan', thu_ho:4000000, trang_thai_cod:'da_chuyen' }),
    mkBN('TC-D06', daysAgo(12), vpCT.id, vpSG.id, nvKeToanCT.id,       { trang_thai:'khach_da_nhan', thu_ho:1800000, trang_thai_cod:'da_tra' }),
    mkBN('TC-D07', new Date(), vpRG.id, vpCT.id, nvRG.id,              { trang_thai_thu:'chua_thu', trang_thai_cuoc_nhan:'cho_thu', thu_ho:3500000, trang_thai_cod:'cho_thu', gia_cuoc:220000 }),
    mkBN('TC-D08', daysAgo(2), vpSG.id, vpCT.id, nvSG.id,              { trang_thai:'dang_vc', thu_ho:2200000, trang_thai_cod:'cho_thu', chanh_id:chanhBaGac.id, dia_chi_giao:'Phường Tân Hưng, Q.7' }),
  ];
  for (const bn of groupD) await prisma.bienNhan.create({ data:bn });
  console.log('BN Group D (COD): 8');

  // ── CONG NO (8 records: mix trang_thai + vai_tro + FK) ──
  const bnCAll = await prisma.bienNhan.findMany({ where:{ ma_so:{ in:['TC-C01','TC-C02','TC-C03','TC-C04','TC-C05','TC-C06'] }}});
  const getCBN = (ma) => bnCAll.find(b => b.ma_so === ma);

  // PhieuThu trước (cần id để link)
  const pt1 = await prisma.phieuThu.create({ data:{ ma_phieu:'PT-CN-001', doi_tuong:'Cty CP Hoàng Long Phát', ly_do:'Thu công nợ tháng trước (TC-C04)', so_tien:420000, van_phong_id:vpSG.id, nhan_vien_id:nvAdmin.id, bien_nhan_id:getCBN('TC-C04')?.id }});
  const pt2 = await prisma.phieuThu.create({ data:{ ma_phieu:'PT-CN-002', doi_tuong:'HTX Nông Sản Sạch Cần Thơ', ly_do:'Thu công nợ tháng trước (TC-C05)', so_tien:280000, van_phong_id:vpCT.id, nhan_vien_id:nvKeToanCT.id, bien_nhan_id:getCBN('TC-C05')?.id }});
  console.log('PhieuThu: 2');

  const congNoData = [
    // chua_thu — mới (hôm nay)
    { ma:'TC-C01', kh_id:khTamAn?.id,   dn_id:dn1.id,   vai_tro:'nguoi_gui', trang_thai:'chua_thu', ngay:new Date() },
    { ma:'TC-C02', kh_id:null,           dn_id:null,     vai_tro:'nguoi_gui', trang_thai:'chua_thu', ngay:daysAgo(5) },
    // qua_han — > 30 ngày chưa thu
    { ma:'TC-C06', kh_id:khTamAn?.id,   dn_id:dn1.id,   vai_tro:'nguoi_gui', trang_thai:'qua_han',  ngay:monthsAgo(2,5) },
    { ma:'TC-C03', kh_id:null,           dn_id:null,     vai_tro:'nguoi_nhan',trang_thai:'qua_han',  ngay:daysAgo(8) },
    // da_thu — đã có phiếu thu
    { ma:'TC-C04', kh_id:khHoangLong?.id,dn_id:dn1.id,   vai_tro:'nguoi_gui', trang_thai:'da_thu',   ngay:monthsAgo(1,10), pt_id:pt1.id },
    { ma:'TC-C05', kh_id:khHTX?.id,     dn_id:dn2.id,   vai_tro:'nguoi_gui', trang_thai:'da_thu',   ngay:monthsAgo(1,20), pt_id:pt2.id },
    // chua_thu gắn DN khác
    { ma:'TC-M109',kh_id:null,           dn_id:null,     vai_tro:'nguoi_gui', trang_thai:'chua_thu', ngay:monthsAgo(1,19)},
    { ma:'TC-M113',kh_id:khHoangLong?.id,dn_id:dn1.id,   vai_tro:'nguoi_gui', trang_thai:'qua_han',  ngay:monthsAgo(1,27)},
  ];
  const bnAllForCN = await prisma.bienNhan.findMany({ where:{ ma_so:{ in:congNoData.map(x=>x.ma) }}});
  const getBN = (ma) => bnAllForCN.find(b => b.ma_so === ma);
  for (const cn of congNoData) {
    const bn = getBN(cn.ma); if (!bn) continue;
    await prisma.congNo.create({ data:{
      bien_nhan_id:bn.id,
      doi_tuong: bn.don_vi_gui || 'Khách hàng',
      so_tien_no: bn.gia_cuoc,
      ngay_phat_sinh: cn.ngay,
      trang_thai: cn.trang_thai,
      khach_hang_id: cn.kh_id ?? null,
      doanh_nghiep_id: cn.dn_id ?? null,
      vai_tro: cn.vai_tro,
      phieu_thu_id: cn.pt_id ?? null,
      ngay_thu: cn.pt_id ? new Date() : null,
    }});
  }
  console.log('CongNo: 8 (chua_thu x2, qua_han x3, da_thu x2, mix DN/KH)');

  // ── BIEN NHAN THU HO + PHIEU CHUYEN COD + CUOC ──
  const [bnD03,bnD05,bnD06,bnB03] = await Promise.all([
    prisma.bienNhan.findFirst({ where:{ ma_so:'TC-D03' }}),
    prisma.bienNhan.findFirst({ where:{ ma_so:'TC-D05' }}),
    prisma.bienNhan.findFirst({ where:{ ma_so:'TC-D06' }}),
    prisma.bienNhan.findFirst({ where:{ ma_so:'TC-B03' }}),
  ]);
  if (bnD03) await prisma.bienNhanThuHo.create({ data:{ ma_bnth:'BNTH-001', bien_nhan_id:bnD03.id, so_tien:1500000, nguoi_nop:'Ngô Thiên Phú', hinh_thuc:'tien_mat', van_phong_id:vpSG.id, nhan_vien_id:nvAdmin.id, la_qua_chanh:false, ghi_chu:'Thu COD D03 tại VP SG' }});
  if (bnD05) await prisma.bienNhanThuHo.create({ data:{ ma_bnth:'BNTH-002', bien_nhan_id:bnD05.id, so_tien:4000000, nguoi_nop:'Ngô Thiên Phú', hinh_thuc:'chuyen_khoan', van_phong_id:vpRG.id, nhan_vien_id:nvRG.id, la_qua_chanh:false }});
  if (bnD06) await prisma.bienNhanThuHo.create({ data:{ ma_bnth:'BNTH-003', bien_nhan_id:bnD06.id, so_tien:1800000, nguoi_nop:'Nguyễn Văn Tâm', hinh_thuc:'tien_mat', van_phong_id:vpSG.id, nhan_vien_id:nvAdmin.id, la_qua_chanh:false }});
  console.log('BienNhanThuHo: 3');

  if (bnD05) {
    const pcCod = await prisma.phieuChuyenCOD.create({ data:{ ma_phieu:'PC-COD-001', van_phong_nhan_id:vpRG.id, van_phong_gui_id:vpSG.id, so_tien_tong:4000000, hinh_thuc:'chuyen_khoan', trang_thai:'da_chuyen', nhan_vien_lap_id:nvRG.id, ghi_chu:'Chuyển COD TC-D05 từ VP RG về VP SG', ngay_chuyen:daysAgo(8) }});
    await prisma.phieuChuyenCODChiTiet.create({ data:{ phieu_id:pcCod.id, bien_nhan_id:bnD05.id, so_tien:4000000 }});
  }
  if (bnB03) {
    const pcCuoc = await prisma.phieuChuyenCuoc.create({ data:{ ma_phieu:'PC-CUOC-001', van_phong_nhan_id:vpSG.id, van_phong_gui_id:vpRG.id, so_tien_tong:300000, hinh_thuc:'tien_mat', trang_thai:'cho_chuyen', nhan_vien_lap_id:nvAdmin.id, ghi_chu:'Chuyển cước TC-B03 từ VP SG về VP RG' }});
    await prisma.phieuChuyenCuocChiTiet.create({ data:{ phieu_id:pcCuoc.id, bien_nhan_id:bnB03.id, so_tien:300000 }});
  }
  console.log('PhieuChuyen COD+Cuoc: 2');

  // ── BANG KE HDDT (2 bang ke) ──
  // BangKe T-1: gom BN can_xuat_hddt=true trong tháng trước
  const bnForBK1 = await prisma.bienNhan.findMany({ where:{ ma_so:{ in:['TC-M101','TC-M102','TC-M103','TC-M108','TC-M111'] }}});
  const bk1TongCuoc = bnForBK1.reduce((s,b)=>s+Number(b.gia_cuoc),0);
  const bk1 = await prisma.bangKe.create({ data:{ ma_bang_ke:'BK-2026-T1', ngay_xuat:monthsAgo(1,28,14), so_bien_nhan:bnForBK1.length, tong_cuoc:bk1TongCuoc, ten_file:'bang_ke_2026_thang_truoc.xlsx' }});
  for (let i=0; i<bnForBK1.length; i++) {
    const bn = bnForBK1[i];
    await prisma.bangKeChiTiet.create({ data:{ bang_ke_id:bk1.id, bien_nhan_id:bn.id, stt:i+1, ngay:bn.ngay_bien_nhan, nguoi_gui:bn.nguoi_gui, hang_hoa:bn.ten_hang_hoa, gia_cuoc:bn.gia_cuoc }});
    await prisma.bienNhan.update({ where:{ id:bn.id }, data:{ da_vao_bang_ke:true }});
  }
  // BangKe T-2
  const bnForBK2 = await prisma.bienNhan.findMany({ where:{ ma_so:{ in:['TC-M201','TC-M202','TC-M205','TC-M208'] }}});
  const bk2TongCuoc = bnForBK2.reduce((s,b)=>s+Number(b.gia_cuoc),0);
  const bk2 = await prisma.bangKe.create({ data:{ ma_bang_ke:'BK-2026-T2', ngay_xuat:monthsAgo(2,28,14), so_bien_nhan:bnForBK2.length, tong_cuoc:bk2TongCuoc, ten_file:'bang_ke_2026_thang_2_truoc.xlsx' }});
  for (let i=0; i<bnForBK2.length; i++) {
    const bn = bnForBK2[i];
    await prisma.bangKeChiTiet.create({ data:{ bang_ke_id:bk2.id, bien_nhan_id:bn.id, stt:i+1, ngay:bn.ngay_bien_nhan, nguoi_gui:bn.nguoi_gui, hang_hoa:bn.ten_hang_hoa, gia_cuoc:bn.gia_cuoc }});
  }
  console.log('BangKe HDDT: 2 (T-1:5BN, T-2:4BN)');

  // ── SUMMARY ──
  const total = await prisma.bienNhan.count();
  const totalCN = await prisma.congNo.count();
  const totalPT = await prisma.phieuThu.count();
  const totalBK = await prisma.bangKe.count();
  console.log(`\n╔═══════════════════════════════════════════╗`);
  console.log(`║   SEED COMPLETE                           ║`);
  console.log(`╠═══════════════════════════════════════════╣`);
  console.log(`║  BienNhan   : ${String(total).padEnd(4)} (today+T-1+T-2+B+C+D)   ║`);
  console.log(`║  CongNo     : ${String(totalCN).padEnd(4)} (chua_thu/qua_han/da_thu) ║`);
  console.log(`║  PhieuThu   : ${String(totalPT).padEnd(4)}                          ║`);
  console.log(`║  BangKe     : ${String(totalBK).padEnd(4)} (T-1 + T-2)              ║`);
  console.log(`╠═══════════════════════════════════════════╣`);
  console.log(`║  admin / ketoan / staff_sg → VP SG        ║`);
  console.log(`║  staff_ct / ketoan_ct      → VP CT        ║`);
  console.log(`║  staff_rg                  → VP RG        ║`);
  console.log(`║  Password: Tmq@1234                       ║`);
  console.log(`╚═══════════════════════════════════════════╝\n`);
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

