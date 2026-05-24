import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

/** Ngày N ngày trước, giờ random 7h–17h */
function daysAgo(n, hourOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(7 + hourOffset + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

/** Ngày random trong tháng N tháng trước */
function monthsAgo(m, day = null) {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  d.setDate(day || (3 + Math.floor(Math.random() * 25)));
  d.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

/** Random item from array */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/** Random int between min and max (inclusive) */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  console.log('🧹 Cleaning database...');
  // Xóa theo thứ tự quan hệ (con trước, cha sau)
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
  await prisma.nhanVien.deleteMany();
  await prisma.chanh.deleteMany();
  await prisma.vanPhong.deleteMany();

  // Reset auto-increment sequences
  const sequences = [
    'van_phong', 'nhan_vien', 'khach_hang', 'bien_nhan',
    'lich_su_trang_thai', 'bang_ke', 'bang_ke_chi_tiet',
    'phieu_thu', 'phieu_chi', 'cong_no', 'login_log', 'audit_log', 'chanh',
    'bien_nhan_thu_ho',
    'phieu_chuyen_cod', 'phieu_chuyen_cod_chi_tiet',
    'phieu_chuyen_cuoc', 'phieu_chuyen_cuoc_chi_tiet',
  ];
  for (const seq of sequences) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${seq}_id_seq RESTART WITH 1`);
  }

  console.log('🌱 Seeding database...\n');

  // ══════════════════════════════════════════════════════════════
  // 1. VĂN PHÒNG (3)
  // ══════════════════════════════════════════════════════════════
  const vpSG = await prisma.vanPhong.create({
    data: { ma_vp: 'SG', ten: 'Văn phòng TP. Hồ Chí Minh', dia_chi: '491 Lê Hồng Phong, Phường 2, Quận 10, TP.HCM', dien_thoai: '02838333879' },
  });
  const vpCT = await prisma.vanPhong.create({
    data: { ma_vp: 'CT', ten: 'Văn phòng Cần Thơ', dia_chi: '20 Đại lộ Hòa Bình, Phường Tân An, Quận Ninh Kiều, TP Cần Thơ', dien_thoai: '02922223344' },
  });
  const vpRG = await prisma.vanPhong.create({
    data: { ma_vp: 'RG', ten: 'Văn phòng Rạch Giá', dia_chi: '15 Nguyễn Trung Trực, Phường Vĩnh Thanh, TP Rạch Giá, Kiên Giang', dien_thoai: '02973866444' },
  });
  console.log('  ✅ 3 văn phòng');

  // ══════════════════════════════════════════════════════════════
  // 2. NHÂN VIÊN (9)
  // ══════════════════════════════════════════════════════════════
  const hash = await bcrypt.hash('Tmq@1234', 10);
  const nvData = [
    { ma_nv: 'NV-SG-001', ten: 'Trần Minh Quang', van_phong_id: vpSG.id, role: 'admin', username: 'admin', require_password_change: false },
    { ma_nv: 'NV-SG-002', ten: 'Nguyễn Thị Thu Hà', van_phong_id: vpSG.id, role: 'staff', username: 'ketoan', require_password_change: false },
    { ma_nv: 'NV-SG-003', ten: 'Lê Văn Hùng', van_phong_id: vpSG.id, role: 'staff', username: 'staff_sg', require_password_change: false },
    { ma_nv: 'NV-CT-001', ten: 'Phạm Thanh Tùng', van_phong_id: vpCT.id, role: 'staff', username: 'staff_ct', require_password_change: false },
    { ma_nv: 'NV-CT-002', ten: 'Võ Thị Ngọc Hân', van_phong_id: vpCT.id, role: 'staff', username: 'ketoan_ct', require_password_change: false },
    { ma_nv: 'NV-RG-001', ten: 'Đặng Hoàng Phúc', van_phong_id: vpRG.id, role: 'staff', username: 'staff_rg', require_password_change: false },
    { ma_nv: 'NV-RG-002', ten: 'Huỳnh Văn Tài', van_phong_id: vpRG.id, role: 'staff', username: 'staff_rg_old', active: false, require_password_change: false },
    { ma_nv: 'NV-SG-004', ten: 'Bùi Quốc Toàn', van_phong_id: vpSG.id, role: 'staff', username: 'nv_new', active: true, require_password_change: true },
    { ma_nv: 'NV-CT-003', ten: 'Trương Văn Khải', van_phong_id: vpCT.id, role: 'staff', username: 'nv_locked', active: true, require_password_change: true },
  ];
  const nvList = [];
  for (const u of nvData) {
    const active = u.active !== undefined ? u.active : true;
    const nv = await prisma.nhanVien.create({ data: { ...u, active, password_hash: hash } });
    nvList.push(nv);
  }
  const [nvAdmin, nvKeToan, nvStaffSG, nvStaffCT, nvKeToanCT, nvStaffRG] = nvList;
  console.log('  ✅ 9 nhân viên');

  // ══════════════════════════════════════════════════════════════
  // 3. KHÁCH HÀNG (18)
  // ══════════════════════════════════════════════════════════════
  const customers = [
    { ma_kh: 'KH-001', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Tâm An Logistics', nguoi_lien_he: 'Nguyễn Văn Tâm', dien_thoai: '0901234567', email: 'tamanlogistics@gmail.com', dia_chi: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', ma_so_thue: '0312345678', so_cccd: '079201012345', ghi_chu: 'Gửi hàng đều đặn cuối tháng, ưu tiên giao tận nơi' },
    { ma_kh: 'KH-002', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty CP Hoàng Long Phát', nguoi_lien_he: 'Trần Hoàng Long', dien_thoai: '0912345678', email: 'hoanglong.phat@company.vn', dia_chi: '456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM', ma_so_thue: '0301234567', ghi_chu: 'Hàng điện tử, cần đóng gói cẩn thận' },
    { ma_kh: 'KH-003', loai_kh: 'doanh_nghiep', ten_don_vi: 'DNTN Minh Phát', nguoi_lien_he: 'Lê Minh Phát', dien_thoai: '0923456789', email: 'minhphat.dn@gmail.com', dia_chi: '78 Trần Phú, P.4, Q.5, TP.HCM', so_cccd: '079080011222', ghi_chu: 'Thường gửi hàng thực phẩm khô' },
    { ma_kh: 'KH-004', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Phú Quốc Express', nguoi_lien_he: 'Phạm Quốc Việt', dien_thoai: '0934567890', email: 'phuquocexpress@outlook.com', dia_chi: '12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang', ma_so_thue: '0100234567', ghi_chu: 'Hàng hải sản đông lạnh, yêu cầu giao nhanh' },
    { ma_kh: 'KH-005', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cửa Hàng Thanh Bình', nguoi_lien_he: 'Võ Thanh Bình', dien_thoai: '0945678901', email: 'thanhbinh.shop@gmail.com', dia_chi: '234 Đề Thám, P.Cô Giang, Q.1, TP.HCM', so_cccd: '079090033444' },
    { ma_kh: 'KH-006', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Đại Phong Trading', nguoi_lien_he: 'Đặng Đại Phong', dien_thoai: '0956789012', email: 'daiphong.trading@company.vn', dia_chi: '89 Lý Thường Kiệt, P.7, Q.10, TP.HCM', ma_so_thue: '0398765432', ghi_chu: 'Thanh toán chuyển khoản, xuất HĐĐT' },
    { ma_kh: 'KH-007', loai_kh: 'doanh_nghiep', ten_don_vi: 'DNTN Hòa Phát Vận Tải', nguoi_lien_he: 'Trương Hòa Phát', dien_thoai: '0967890123', email: 'hoaphat.vt@gmail.com', dia_chi: '56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ', so_cccd: '092070055666', ghi_chu: 'Đối tác vận tải khu vực ĐBSCL' },
    { ma_kh: 'KH-008', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty CP Sao Việt', nguoi_lien_he: 'Lý Sao Việt', dien_thoai: '0978901234', email: 'saoviet.corp@saoviet.com.vn', dia_chi: '10 Võ Văn Kiệt, P.An Hòa, Q.Ninh Kiều, TP Cần Thơ', ma_so_thue: '0309876543', ghi_chu: 'Gửi hàng nông sản định kỳ hàng tuần' },
    { ma_kh: 'KH-009', loai_kh: 'doanh_nghiep', ten_don_vi: 'HTX Nông Sản Sạch Cần Thơ', nguoi_lien_he: 'Huỳnh Thanh Nông', dien_thoai: '0989012345', email: 'htxnongsancantho@gmail.com', dia_chi: 'Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ', ghi_chu: 'Hàng trái cây tươi, cần giao trong ngày' },
    { ma_kh: 'KH-010', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Thiên Phú', nguoi_lien_he: 'Ngô Thiên Phú', dien_thoai: '0990123456', email: 'thienphuco@thienphuco.com', dia_chi: '321 Nguyễn Trung Trực, TP Rạch Giá, Kiên Giang', ma_so_thue: '0316789012', so_cccd: '086198001234', ghi_chu: 'Khách hàng VIP, thường xuyên nợ cước cuối tháng' },
    { ma_kh: 'KH-011', loai_kh: 'ca_nhan', ten_don_vi: 'Nguyễn Anh Tuấn', dien_thoai: '0371234567', email: 'anhtuannguyen@gmail.com', dia_chi: '15/3 Nguyễn Kiệm, P.3, Q.Phú Nhuận, TP.HCM', so_cccd: '079095077888', ghi_chu: 'Hay gửi quà tặng về quê Cần Thơ' },
    { ma_kh: 'KH-012', loai_kh: 'ca_nhan', ten_don_vi: 'Trần Thị Mai', dien_thoai: '0382345678', email: 'maitran.ct@gmail.com', dia_chi: '88 Mậu Thân, P.An Hòa, Q.Ninh Kiều, TP Cần Thơ', so_cccd: '092190099000' },
    { ma_kh: 'KH-013', loai_kh: 'ca_nhan', ten_don_vi: 'Lê Đăng Khoa', dien_thoai: '0393456789', dia_chi: 'Khu phố 3, P.Vĩnh Thanh Vân, TP Rạch Giá, Kiên Giang', ghi_chu: 'Gửi hàng về quê theo mùa' },
    { ma_kh: 'KH-014', loai_kh: 'ca_nhan', ten_don_vi: 'Phạm Thùy Linh', dien_thoai: '0364567890', email: 'thuylinhpham@yahoo.com', dia_chi: '23 Trần Hưng Đạo, P.An Thới, Q.Bình Thủy, TP Cần Thơ', so_cccd: '092185011333' },
    { ma_kh: 'KH-015', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH ABC Thương Mại', nguoi_lien_he: 'Nguyễn Văn A', dien_thoai: '0901111222', email: 'abc.thuongmai@gmail.com', dia_chi: '99 Hai Bà Trưng, Q.1, TP.HCM', ma_so_thue: '0300111222', ghi_chu: 'Ngưng hợp tác từ tháng 01/2026', active: false },
    { ma_kh: 'KH-016', loai_kh: 'ca_nhan', ten_don_vi: 'Võ Minh Tuấn', dien_thoai: '0333444555', dia_chi: 'Ấp 2, Xã Thạnh Lộc, H.Giồng Riềng, Kiên Giang', so_cccd: '086088022444', ghi_chu: 'Không còn liên lạc được', active: false },
    { ma_kh: 'KH-017', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH XNK Đồng Bằng Xanh', nguoi_lien_he: 'Bà Nguyễn Thị Thanh Thảo', dien_thoai: '0907777888', email: 'dongbangxanh.xnk@dongbangxanh.com.vn', dia_chi: 'Lô B5, KCN Trà Nóc, P.Trà Nóc, Q.Bình Thủy, TP Cần Thơ', ma_so_thue: '1800123456', so_cccd: '092080088123', ghi_chu: 'Khách hàng chiến lược, xuất hóa đơn VAT hàng tháng, thanh toán CK ngày 25' },
    { ma_kh: 'KH-018', loai_kh: 'ca_nhan', ten_don_vi: 'Ngô Thanh Hải', dien_thoai: '0358999000', so_cccd: '079096055789', ghi_chu: 'Tự động tạo từ biên nhận SGCT-0055 ngày 04/05/2026' },
  ];

  for (const c of customers) {
    const active = c.active !== undefined ? c.active : true;
    await prisma.khachHang.create({ data: { ...c, active } });
  }
  console.log('  ✅ 18 khách hàng');

  // ══════════════════════════════════════════════════════════════
  // 4. CHÀNH (4)
  // ══════════════════════════════════════════════════════════════
  const chanhData = [
    { ten: 'Chành Ba Gác Q7 - Nhà Bè', dia_chi: 'Khu dân cư Him Lam, Phường Tân Hưng, Quận 7, TP.HCM', dien_thoai: '0903111222', nguoi_lien_he: 'Chú Tư (tài xế ba gác)', ghi_chu: 'Chuyên nhận chở hàng cồng kềnh từ VP SG đi giao tận nơi các quận ven (Q7, Nhà Bè, Bình Chánh)', active: true },
    { ten: 'Chành Tàu Thủy Cần Thơ - Phong Điền', dia_chi: 'Bến phà Cần Thơ cũ, Phường Tân An, Q.Ninh Kiều, TP Cần Thơ', dien_thoai: '0912333444', nguoi_lien_he: 'Anh Sáu (chủ tàu)', ghi_chu: 'Chở hàng nông sản dọc tuyến sông đi các huyện Phong Điền, Thới Lai (giao tuyến huyện)', active: true },
    { ten: 'Chành Tàu Cao Tốc Superdong', dia_chi: 'Bến tàu Rạch Giá, Đường Nguyễn Công Trứ, TP Rạch Giá', dien_thoai: '02973980111', nguoi_lien_he: 'Phòng nhận hàng', ghi_chu: 'Nhận hàng chuyển ra đảo Phú Quốc, Hòn Tre. Chuyến sớm nhất 7h sáng', active: true },
    { ten: 'Chành Xe Khách Rạch Giá - Hà Tiên (cũ)', dia_chi: 'Bến xe Rạch Sỏi, TP Rạch Giá', dien_thoai: '0901119999', nguoi_lien_he: 'Ông Năm', ghi_chu: 'Đã ngưng hoạt động từ 03/2026 do đổi chủ', active: false },
  ];
  for (const ch of chanhData) {
    await prisma.chanh.create({ data: ch });
  }
  console.log('  ✅ 4 chành');

  // Lookup map chành cho BN data
  const allChanhs = await prisma.chanh.findMany();
  const chanhs = Object.fromEntries(allChanhs.map(c => [c.ten, c]));

  /*
  // ══════════════════════════════════════════════════════════════
  // 5. BIÊN NHẬN (38 test cases)
  // ══════════════════════════════════════════════════════════════
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Ngày historical
  const d35ago = new Date(); d35ago.setDate(d35ago.getDate() - 35); d35ago.setHours(9, 0, 0, 0);   // ~28/03
  const d14ago = new Date(); d14ago.setDate(d14ago.getDate() - 14); d14ago.setHours(8, 15, 0, 0); // ~20/04 (BN-11)
  const d7ago = new Date(); d7ago.setDate(d7ago.getDate() - 7); d7ago.setHours(7, 0, 0, 0);   // ~28/04 (BN-10)
  // Ngày tháng 4 (BN-21→30): trải đều 7..17 ngày trước
  const apr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(8, 0, 0, 0); return d; };
  // Ngày tháng 3 (BN-31→38): trải đều 40..57 ngày trước
  const mar = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(8, 0, 0, 0); return d; };

  const bienNhanData = [
    // BN-01
    { ma_so: 'SGCT-0001', ngay_bien_nhan: today, gio_tao: '09:15', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty TNHH Tâm An Logistics', nguoi_gui: 'Nguyễn Văn Tâm', dien_thoai_gui: '0901234567', dia_chi_gui: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', so_cccd_gui: '079201012345', don_vi_nhan: 'HTX Nông Sản Sạch Cần Thơ', nguoi_nhan: 'Huỳnh Thanh Nông', dien_thoai_nhan: '0989012345', dia_chi_nhan: 'Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '2 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 2, ghi_chu: 'Hàng giá trị cao, dễ vỡ' }], gia_tri_hang: 5000000, trong_luong: 12.50, thu_ho: 0, gia_cuoc: 150000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: chanhs['Chành Tàu Thủy Cần Thơ - Phong Điền'].id, dia_chi_giao: 'Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ', can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-02
    { ma_so: 'SGCT-0002', ngay_bien_nhan: today, gio_tao: '08:30', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty CP Hoàng Long Phát', nguoi_gui: 'Trần Hoàng Long', dien_thoai_gui: '0912345678', dia_chi_gui: '456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty CP Sao Việt', nguoi_nhan: 'Lý Sao Việt', dien_thoai_nhan: '0978901234', dia_chi_nhan: '10 Võ Văn Kiệt, P.An Hòa, Q.Ninh Kiều, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '5 Cuộn, 3 Túi', hang_hoa_json: [{ don_vi: 'Cuộn', so_luong: 5, ghi_chu: '' }, { don_vi: 'Túi', so_luong: 3, ghi_chu: '' }], gia_tri_hang: 12000000, trong_luong: 35.00, thu_ho: 0, gia_cuoc: 250000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'goi_dien', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-03
    { ma_so: 'SGCT-0003', ngay_bien_nhan: today, gio_tao: '14:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'DNTN Minh Phát', nguoi_gui: 'Lê Minh Phát', dien_thoai_gui: '0923456789', dia_chi_gui: '78 Trần Phú, P.4, Q.5, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'DNTN Hòa Phát Vận Tải', nguoi_nhan: 'Trương Hòa Phát', dien_thoai_nhan: '0967890123', dia_chi_nhan: '56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '10 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 10, ghi_chu: 'Tránh ẩm ướt' }], gia_tri_hang: 8000000, trong_luong: 28.00, thu_ho: 0, gia_cuoc: 200000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tu_toi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-04 — Cước chưa thu, KHÔNG COD (test case chính)
    { ma_so: 'CTRG-0001', ngay_bien_nhan: today, gio_tao: '10:45', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'Cty TNHH XNK Đồng Bằng Xanh', nguoi_gui: 'Nguyễn Thị Thanh Thảo', dien_thoai_gui: '0907777888', dia_chi_gui: 'Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ', so_cccd_gui: '086198001234', don_vi_nhan: 'Cty TNHH Phú Quốc Express', nguoi_nhan: 'Phạm Quốc Việt', dien_thoai_nhan: '0934567890', dia_chi_nhan: '12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang', so_cccd_nhan: null, ten_hang_hoa: '35 Thùng xốp', hang_hoa_json: [{ don_vi: 'Thùng xốp', so_luong: 20, ghi_chu: 'Hàng dễ dập nát' }, { don_vi: 'Thùng xốp', so_luong: 15, ghi_chu: 'Hàng nặng' }], gia_tri_hang: 15000000, trong_luong: 70.00, thu_ho: 0, gia_cuoc: 350000, trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'cho_thu', hinh_thuc_giao: 'tan_noi', chanh_id: chanhs['Chành Tàu Cao Tốc Superdong'].id, dia_chi_giao: '12 Hùng Vương, Dương Đông, Phú Quốc', can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'da_den_kho', trang_thai_cod: 'khong_co' },
    // BN-05
    { ma_so: 'RGSG-0001', ngay_bien_nhan: today, gio_tao: '07:30', van_phong_gui_id: vpRG.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffRG.id, don_vi_gui: 'Cty TNHH Phú Quốc Express', nguoi_gui: 'Phạm Quốc Việt', dien_thoai_gui: '0934567890', dia_chi_gui: '12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', so_cccd_nhan: '079201012345', ten_hang_hoa: '20 Thùng xốp', hang_hoa_json: [{ don_vi: 'Thùng xốp', so_luong: 8, ghi_chu: 'Hàng cấp đông' }, { don_vi: 'Thùng xốp', so_luong: 12, ghi_chu: 'Hàng đông lạnh' }], gia_tri_hang: 25000000, trong_luong: 45.00, thu_ho: 0, gia_cuoc: 500000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: chanhs['Chành Ba Gác Q7 - Nhà Bè'].id, dia_chi_giao: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
  ];
  for (const bn of bienNhanData) { await prisma.bienNhan.create({ data: bn }); }
  console.log('  ✅ 38 biên nhận (đợt 1/4: BN-01→05)');

  const bienNhanData2 = [
    // BN-06
    { ma_so: 'SGCT-0004', ngay_bien_nhan: today, gio_tao: '11:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty TNHH Đại Phong Trading', nguoi_gui: 'Đặng Đại Phong', dien_thoai_gui: '0956789012', dia_chi_gui: '89 Lý Thường Kiệt, P.7, Q.10, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '4 Thùng, 20 Hộp', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 4, ghi_chu: '' }, { don_vi: 'Hộp', so_luong: 20, ghi_chu: 'Chất lỏng, cẩn thận' }], gia_tri_hang: 18000000, trong_luong: 55.00, thu_ho: 0, gia_cuoc: 400000, trang_thai_thu: 'cong_no', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: '321 Nguyễn Trung Trực, TP Rạch Giá', can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-07 — ngày 28/03 (>30 ngày) để test badge "Quá hạn"
    { ma_so: 'SGCT-0005', ngay_bien_nhan: d35ago, gio_tao: '09:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty TNHH Thiên Phú', nguoi_gui: 'Ngô Thiên Phú', dien_thoai_gui: '0990123456', dia_chi_gui: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_gui: null, don_vi_nhan: 'Cty CP Hoàng Long Phát', nguoi_nhan: 'Trần Hoàng Long', dien_thoai_nhan: '0912345678', dia_chi_nhan: '456 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '30 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 30, ghi_chu: 'Hàng chất lỏng dễ vỡ' }], gia_tri_hang: 9000000, trong_luong: 42.00, thu_ho: 0, gia_cuoc: 300000, trang_thai_thu: 'cong_no', hinh_thuc_giao: 'goi_dien', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-08 COD bước 1
    { ma_so: 'CTSG-0001', ngay_bien_nhan: today, gio_tao: '08:00', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'Cty CP Sao Việt', nguoi_gui: 'Lý Sao Việt', dien_thoai_gui: '0978901234', dia_chi_gui: '10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, Q.7, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '25 Thùng xốp', hang_hoa_json: [{ don_vi: 'Thùng xốp', so_luong: 15, ghi_chu: 'Giao trong ngày' }, { don_vi: 'Thùng xốp', so_luong: 10, ghi_chu: 'Tránh nóng' }], gia_tri_hang: 7500000, trong_luong: 60.00, thu_ho: 2500000, gia_cuoc: 300000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'cho_thu' },
    // BN-09 COD bước 2
    { ma_so: 'CTSG-0002', ngay_bien_nhan: today, gio_tao: '09:30', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'HTX Nông Sản Sạch Cần Thơ', nguoi_gui: 'Huỳnh Thanh Nông', dien_thoai_gui: '0989012345', dia_chi_gui: 'Ấp Nhơn Lộc, Xã Nhơn Nghĩa, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'Cửa Hàng Thanh Bình', nguoi_nhan: 'Võ Thanh Bình', dien_thoai_nhan: '0945678901', dia_chi_nhan: '234 Đề Thám, P.Cô Giang, Q.1, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '50 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 50, ghi_chu: '' }], gia_tri_hang: 6000000, trong_luong: 25.00, thu_ho: 3000000, gia_cuoc: 200000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: '234 Đề Thám, P.Cô Giang, Q.1, TP.HCM', can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'da_thu' },
    // BN-10 COD bước 3 — ~28/04
    { ma_so: 'RGSG-0002', ngay_bien_nhan: d7ago, gio_tao: '07:00', van_phong_gui_id: vpRG.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffRG.id, don_vi_gui: 'Cty TNHH Thiên Phú', nguoi_gui: 'Ngô Thiên Phú', dien_thoai_gui: '0990123456', dia_chi_gui: '321 Nguyễn Trung Trực, TP Rạch Giá, Kiên Giang', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, Q.7, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '20 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 20, ghi_chu: 'Hàng chất lỏng dễ vỡ' }], gia_tri_hang: 4000000, trong_luong: 30.00, thu_ho: 1500000, gia_cuoc: 250000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: chanhs['Chành Ba Gác Q7 - Nhà Bè'].id, dia_chi_giao: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'da_chuyen' },
    // BN-11 COD bước 4 — ~20/04
    { ma_so: 'SGCT-0006', ngay_bien_nhan: d14ago, gio_tao: '08:15', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'DNTN Minh Phát', nguoi_gui: 'Lê Minh Phát', dien_thoai_gui: '0923456789', dia_chi_gui: '78 Trần Phú, P.4, Q.5, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Nguyễn Anh Tuấn', nguoi_nhan: 'Nguyễn Anh Tuấn', dien_thoai_nhan: '0371234567', dia_chi_nhan: '15/3 Nguyễn Kiệm, P.3, Q.Phú Nhuận, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '5 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 3, ghi_chu: 'Hàng điện tử' }, { don_vi: 'Thùng', so_luong: 2, ghi_chu: 'Hàng dễ vỡ' }], gia_tri_hang: 3500000, trong_luong: 18.00, thu_ho: 4200000, gia_cuoc: 180000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'goi_dien', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'da_tra' },
    // BN-12 HĐĐT chờ xuất
    { ma_so: 'SGCT-0007', ngay_bien_nhan: today, gio_tao: '11:30', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty TNHH Đại Phong Trading', nguoi_gui: 'Đặng Đại Phong', dien_thoai_gui: '0956789012', dia_chi_gui: '89 Lý Thường Kiệt, P.7, Q.10, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty CP Sao Việt', nguoi_nhan: 'Lý Sao Việt', dien_thoai_nhan: '0978901234', dia_chi_nhan: '10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '5 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 5, ghi_chu: 'Hàng nặng' }], gia_tri_hang: 10000000, trong_luong: 22.50, thu_ho: 0, gia_cuoc: 350000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: '10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ', can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-13 HĐĐT chờ xuất
    { ma_so: 'SGCT-0008', ngay_bien_nhan: today, gio_tao: '10:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty TNHH XNK Đồng Bằng Xanh', nguoi_gui: 'Nguyễn Thị Thanh Thảo', dien_thoai_gui: '0907777888', dia_chi_gui: 'Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'DNTN Hòa Phát Vận Tải', nguoi_nhan: 'Trương Hòa Phát', dien_thoai_nhan: '0967890123', dia_chi_nhan: '56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '3 Cuộn', hang_hoa_json: [{ don_vi: 'Cuộn', so_luong: 3, ghi_chu: 'Hàng nặng' }], gia_tri_hang: 4500000, trong_luong: 40.00, thu_ho: 0, gia_cuoc: 200000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tu_toi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-14 HĐĐT chờ xuất | SG→RG | Công nợ
    { ma_so: 'SGRG-0001', ngay_bien_nhan: today, gio_tao: '09:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty TNHH Tâm An Logistics', nguoi_gui: 'Nguyễn Văn Tâm', dien_thoai_gui: '0901234567', dia_chi_gui: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', so_cccd_gui: '079201012345', don_vi_nhan: 'Cty TNHH Phú Quốc Express', nguoi_nhan: 'Phạm Quốc Việt', dien_thoai_nhan: '0934567890', dia_chi_nhan: '12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang', so_cccd_nhan: null, ten_hang_hoa: '15 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 10, ghi_chu: 'Thiết bị điện tử' }, { don_vi: 'Thùng', so_luong: 5, ghi_chu: 'Hàng giá trị cao' }], gia_tri_hang: 20000000, trong_luong: 15.00, thu_ho: 0, gia_cuoc: 500000, trang_thai_thu: 'cong_no', hinh_thuc_giao: 'goi_dien', chanh_id: chanhs['Chành Tàu Cao Tốc Superdong'].id, dia_chi_giao: '12 Hùng Vương, Dương Đông, Phú Quốc', can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-15 HĐĐT chờ xuất | CT→RG
    { ma_so: 'CTRG-0002', ngay_bien_nhan: today, gio_tao: '14:30', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'Cty CP Hoàng Long Phát', nguoi_gui: 'Trần Hoàng Long', dien_thoai_gui: '0912345678', dia_chi_gui: '456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '2 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 2, ghi_chu: 'Hàng giá trị cao, dễ vỡ' }], gia_tri_hang: 28000000, trong_luong: 6.00, thu_ho: 0, gia_cuoc: 300000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: '321 Nguyễn Trung Trực, TP Rạch Giá', can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
  ];
  for (const bn of bienNhanData2) { await prisma.bienNhan.create({ data: bn }); }
  console.log('  ✅ 38 biên nhận (đợt 2/4: BN-06→15)');

  const bienNhanData3 = [
    // BN-16 HĐĐT đã vào BK
    { ma_so: 'SGCT-0009', ngay_bien_nhan: today, gio_tao: '08:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty TNHH Đại Phong Trading', nguoi_gui: 'Đặng Đại Phong', dien_thoai_gui: '0956789012', dia_chi_gui: '89 Lý Thường Kiệt, P.7, Q.10, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty CP Sao Việt', nguoi_nhan: 'Lý Sao Việt', dien_thoai_nhan: '0978901234', dia_chi_nhan: '10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '10 Bao', hang_hoa_json: [{ don_vi: 'Bao', so_luong: 10, ghi_chu: 'Hàng cồng kềnh' }], gia_tri_hang: 15000000, trong_luong: 20.00, thu_ho: 0, gia_cuoc: 400000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: '10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ', can_xuat_hddt: true, da_vao_bang_ke: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-17 HĐĐT đã vào BK
    { ma_so: 'SGCT-0010', ngay_bien_nhan: today, gio_tao: '09:30', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty TNHH XNK Đồng Bằng Xanh', nguoi_gui: 'Nguyễn Thị Thanh Thảo', dien_thoai_gui: '0907777888', dia_chi_gui: 'Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'HTX Nông Sản Sạch Cần Thơ', nguoi_nhan: 'Huỳnh Thanh Nông', dien_thoai_nhan: '0989012345', dia_chi_nhan: 'Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '80 Thùng', hang_hoa_json: [{ don_vi: 'Hộp', so_luong: 50, ghi_chu: 'Hàng dễ vỡ' }, { don_vi: 'Hộp', so_luong: 30, ghi_chu: 'Tránh nhiệt độ cao' }], gia_tri_hang: 35000000, trong_luong: 10.00, thu_ho: 0, gia_cuoc: 500000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: 'Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ', can_xuat_hddt: true, da_vao_bang_ke: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-18 Hàng hư không đến
    { ma_so: 'RGCT-0001', ngay_bien_nhan: today, gio_tao: '13:00', van_phong_gui_id: vpRG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffRG.id, don_vi_gui: 'Cty TNHH Thiên Phú', nguoi_gui: 'Ngô Thiên Phú', dien_thoai_gui: '0990123456', dia_chi_gui: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_gui: '086198009999', don_vi_nhan: 'DNTN Hòa Phát Vận Tải', nguoi_nhan: 'Trương Hòa Phát', dien_thoai_nhan: '0967890123', dia_chi_nhan: '56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '50 Kiện', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 50, ghi_chu: 'Hàng rất dễ vỡ, vỡ 1 phần trong vận chuyển' }], gia_tri_hang: 8000000, trong_luong: 150.00, thu_ho: 0, gia_cuoc: 650000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tu_toi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: true, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-19 Tối thiểu
    { ma_so: 'CTSG-0003', ngay_bien_nhan: today, gio_tao: null, van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: null, nguoi_gui: null, dien_thoai_gui: null, dia_chi_gui: null, so_cccd_gui: null, don_vi_nhan: null, nguoi_nhan: null, dien_thoai_nhan: null, dia_chi_nhan: null, so_cccd_nhan: null, ten_hang_hoa: 'Hàng tạp hóa', hang_hoa_json: [], gia_tri_hang: null, trong_luong: null, thu_ho: 0, gia_cuoc: 80000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-20 Đầy đủ + COD
    { ma_so: 'SGRG-0002', ngay_bien_nhan: today, gio_tao: '10:30', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty TNHH Tâm An Logistics', nguoi_gui: 'Nguyễn Văn Tâm', dien_thoai_gui: '0901234567', dia_chi_gui: '123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM', so_cccd_gui: '079201012345', don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: '086198001234', ten_hang_hoa: '9 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 3, ghi_chu: 'Hàng điện tử giá trị cao' }, { don_vi: 'Kiện', so_luong: 3, ghi_chu: '' }, { don_vi: 'Kiện', so_luong: 3, ghi_chu: '' }], gia_tri_hang: 45000000, trong_luong: 9.50, thu_ho: 45000000, gia_cuoc: 500000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: chanhs['Chành Tàu Cao Tốc Superdong'].id, dia_chi_giao: '12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang', can_xuat_hddt: true, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'cho_thu' },
    // BN-20b — Cước chưa thu + COD (test cả 2 luồng)
    { ma_so: 'SGRG-0020', ngay_bien_nhan: today, gio_tao: '11:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty CP Hoàng Long Phát', nguoi_gui: 'Trần Hoàng Long', dien_thoai_gui: '0912345678', dia_chi_gui: '456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '3 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 3, ghi_chu: 'Hàng điện tử' }], gia_tri_hang: 12000000, trong_luong: 8.00, thu_ho: 12000000, gia_cuoc: 280000, trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'cho_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: '321 Nguyễn Trung Trực, TP Rạch Giá', can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'da_den_kho', trang_thai_cod: 'cho_thu' },
    // BN-21 (tháng 4 — 7 ngày trước)
    { ma_so: 'SGCT-0011', ngay_bien_nhan: apr(7), gio_tao: '08:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty TNHH Tâm An Logistics', nguoi_gui: 'Nguyễn Văn Tâm', dien_thoai_gui: '0901234567', dia_chi_gui: '123 Nguyễn Văn Linh, Q.7, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'HTX Nông Sản Sạch Cần Thơ', nguoi_nhan: 'Huỳnh Thanh Nông', dien_thoai_nhan: '0989012345', dia_chi_nhan: 'Ấp Nhơn Lộc, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '5 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 5, ghi_chu: '' }], gia_tri_hang: 3000000, trong_luong: 15.00, thu_ho: 0, gia_cuoc: 150000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-22
    { ma_so: 'SGCT-0012', ngay_bien_nhan: apr(8), gio_tao: '09:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty CP Hoàng Long Phát', nguoi_gui: 'Trần Hoàng Long', dien_thoai_gui: '0912345678', dia_chi_gui: '456 Điện Biên Phủ, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'DNTN Hòa Phát Vận Tải', nguoi_nhan: 'Trương Hòa Phát', dien_thoai_nhan: '0967890123', dia_chi_nhan: '56 Cách Mạng Tháng 8, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '3 Bao', hang_hoa_json: [{ don_vi: 'Bao', so_luong: 3, ghi_chu: '' }], gia_tri_hang: 4000000, trong_luong: 20.00, thu_ho: 0, gia_cuoc: 200000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-23
    { ma_so: 'CTSG-0004', ngay_bien_nhan: apr(9), gio_tao: '10:00', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'Cty CP Sao Việt', nguoi_gui: 'Lý Sao Việt', dien_thoai_gui: '0978901234', dia_chi_gui: '10 Võ Văn Kiệt, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '10 Bao', hang_hoa_json: [{ don_vi: 'Bao', so_luong: 10, ghi_chu: '' }], gia_tri_hang: 5000000, trong_luong: 30.00, thu_ho: 0, gia_cuoc: 300000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-24
    { ma_so: 'CTSG-0005', ngay_bien_nhan: apr(10), gio_tao: '11:00', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'HTX Nông Sản Sạch Cần Thơ', nguoi_gui: 'Huỳnh Thanh Nông', dien_thoai_gui: '0989012345', dia_chi_gui: 'Ấp Nhơn Lộc, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'Cửa Hàng Thanh Bình', nguoi_nhan: 'Võ Thanh Bình', dien_thoai_nhan: '0945678901', dia_chi_nhan: '234 Đề Thám, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '5 Thùng xốp', hang_hoa_json: [{ don_vi: 'Thùng xốp', so_luong: 5, ghi_chu: '' }], gia_tri_hang: 2500000, trong_luong: 10.00, thu_ho: 0, gia_cuoc: 250000, trang_thai_thu: 'cong_no', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-25
    { ma_so: 'SGRG-0003', ngay_bien_nhan: apr(11), gio_tao: '08:30', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty TNHH Đại Phong Trading', nguoi_gui: 'Đặng Đại Phong', dien_thoai_gui: '0956789012', dia_chi_gui: '89 Lý Thường Kiệt, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '2 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 2, ghi_chu: '' }], gia_tri_hang: 8000000, trong_luong: 12.00, thu_ho: 0, gia_cuoc: 400000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-26
    { ma_so: 'RGSG-0003', ngay_bien_nhan: apr(12), gio_tao: '07:30', van_phong_gui_id: vpRG.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffRG.id, don_vi_gui: 'Cty TNHH Thiên Phú', nguoi_gui: 'Ngô Thiên Phú', dien_thoai_gui: '0990123456', dia_chi_gui: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '8 Thùng xốp', hang_hoa_json: [{ don_vi: 'Thùng xốp', so_luong: 8, ghi_chu: '' }], gia_tri_hang: 10000000, trong_luong: 25.00, thu_ho: 0, gia_cuoc: 500000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-27
    { ma_so: 'CTRG-0003', ngay_bien_nhan: apr(13), gio_tao: '09:00', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvKeToanCT.id, don_vi_gui: 'Cty TNHH XNK Đồng Bằng Xanh', nguoi_gui: 'Nguyễn Thị Thanh Thảo', dien_thoai_gui: '0907777888', dia_chi_gui: 'Lô B5, KCN Trà Nóc, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '20 Bao', hang_hoa_json: [{ don_vi: 'Bao', so_luong: 20, ghi_chu: '' }], gia_tri_hang: 6000000, trong_luong: 40.00, thu_ho: 0, gia_cuoc: 350000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
  ];
  for (const bn of bienNhanData3) { await prisma.bienNhan.create({ data: bn }); }
  console.log('  ✅ 38 biên nhận (đợt 3/4: BN-16→27)');

  const bienNhanData4 = [
    // BN-28
    { ma_so: 'RGCT-0002', ngay_bien_nhan: apr(14), gio_tao: '10:30', van_phong_gui_id: vpRG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffRG.id, don_vi_gui: 'Cty TNHH Phú Quốc Express', nguoi_gui: 'Phạm Quốc Việt', dien_thoai_gui: '0934567890', dia_chi_gui: '12 Hùng Vương, Phú Quốc', so_cccd_gui: null, don_vi_nhan: 'Cty CP Sao Việt', nguoi_nhan: 'Lý Sao Việt', dien_thoai_nhan: '0978901234', dia_chi_nhan: '10 Võ Văn Kiệt, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '10 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 10, ghi_chu: '' }], gia_tri_hang: 4000000, trong_luong: 22.00, thu_ho: 0, gia_cuoc: 180000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-29
    { ma_so: 'SGCT-0013', ngay_bien_nhan: apr(15), gio_tao: '11:30', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'DNTN Minh Phát', nguoi_gui: 'Lê Minh Phát', dien_thoai_gui: '0923456789', dia_chi_gui: '78 Trần Phú, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '3 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 3, ghi_chu: '' }], gia_tri_hang: 3500000, trong_luong: 8.00, thu_ho: 0, gia_cuoc: 120000, trang_thai_thu: 'cong_no', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-30
    { ma_so: 'CTSG-0006', ngay_bien_nhan: apr(16), gio_tao: '14:00', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'Cty CP Hoàng Long Phát', nguoi_gui: 'Trần Hoàng Long', dien_thoai_gui: '0912345678', dia_chi_gui: '456 Điện Biên Phủ, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '5 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 5, ghi_chu: '' }], gia_tri_hang: 2000000, trong_luong: 18.00, thu_ho: 0, gia_cuoc: 100000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-31 (tháng 3 — 40 ngày trước)
    { ma_so: 'SGCT-0014', ngay_bien_nhan: mar(40), gio_tao: '08:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty TNHH Tâm An Logistics', nguoi_gui: 'Nguyễn Văn Tâm', dien_thoai_gui: '0901234567', dia_chi_gui: '123 Nguyễn Văn Linh, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'DNTN Hòa Phát Vận Tải', nguoi_nhan: 'Trương Hòa Phát', dien_thoai_nhan: '0967890123', dia_chi_nhan: '56 Cách Mạng Tháng 8, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '2 Kiện', hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 2, ghi_chu: '' }], gia_tri_hang: 3000000, trong_luong: 6.00, thu_ho: 0, gia_cuoc: 250000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-32
    { ma_so: 'SGCT-0015', ngay_bien_nhan: mar(43), gio_tao: '09:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvAdmin.id, don_vi_gui: 'Cty TNHH Đại Phong Trading', nguoi_gui: 'Đặng Đại Phong', dien_thoai_gui: '0956789012', dia_chi_gui: '89 Lý Thường Kiệt, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty CP Sao Việt', nguoi_nhan: 'Lý Sao Việt', dien_thoai_nhan: '0978901234', dia_chi_nhan: '10 Võ Văn Kiệt, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '4 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 4, ghi_chu: '' }], gia_tri_hang: 5000000, trong_luong: 15.00, thu_ho: 0, gia_cuoc: 300000, trang_thai_thu: 'cong_no', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-33
    { ma_so: 'CTSG-0007', ngay_bien_nhan: mar(46), gio_tao: '10:00', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffCT.id, don_vi_gui: 'Cty CP Sao Việt', nguoi_gui: 'Lý Sao Việt', dien_thoai_gui: '0978901234', dia_chi_gui: '10 Võ Văn Kiệt, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '5 Bao', hang_hoa_json: [{ don_vi: 'Bao', so_luong: 5, ghi_chu: '' }], gia_tri_hang: 4000000, trong_luong: 20.00, thu_ho: 0, gia_cuoc: 150000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-34
    { ma_so: 'SGRG-0004', ngay_bien_nhan: mar(48), gio_tao: '08:30', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'DNTN Minh Phát', nguoi_gui: 'Lê Minh Phát', dien_thoai_gui: '0923456789', dia_chi_gui: '78 Trần Phú, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '2 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 2, ghi_chu: '' }], gia_tri_hang: 2000000, trong_luong: 8.00, thu_ho: 0, gia_cuoc: 100000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-35
    { ma_so: 'RGSG-0004', ngay_bien_nhan: mar(50), gio_tao: '07:30', van_phong_gui_id: vpRG.id, van_phong_nhan_id: vpSG.id, nhan_vien_nhap_id: nvStaffRG.id, don_vi_gui: 'Cty TNHH Thiên Phú', nguoi_gui: 'Ngô Thiên Phú', dien_thoai_gui: '0990123456', dia_chi_gui: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Tâm An Logistics', nguoi_nhan: 'Nguyễn Văn Tâm', dien_thoai_nhan: '0901234567', dia_chi_nhan: '123 Nguyễn Văn Linh, TP.HCM', so_cccd_nhan: null, ten_hang_hoa: '10 Thùng xốp', hang_hoa_json: [{ don_vi: 'Thùng xốp', so_luong: 10, ghi_chu: '' }], gia_tri_hang: 7000000, trong_luong: 30.00, thu_ho: 0, gia_cuoc: 450000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-36
    { ma_so: 'CTRG-0004', ngay_bien_nhan: mar(53), gio_tao: '09:00', van_phong_gui_id: vpCT.id, van_phong_nhan_id: vpRG.id, nhan_vien_nhap_id: nvKeToanCT.id, don_vi_gui: 'Cty TNHH XNK Đồng Bằng Xanh', nguoi_gui: 'Nguyễn Thị Thanh Thảo', dien_thoai_gui: '0907777888', dia_chi_gui: 'Lô B5, KCN Trà Nóc, TP Cần Thơ', so_cccd_gui: null, don_vi_nhan: 'Cty TNHH Thiên Phú', nguoi_nhan: 'Ngô Thiên Phú', dien_thoai_nhan: '0990123456', dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá', so_cccd_nhan: null, ten_hang_hoa: '15 Bao', hang_hoa_json: [{ don_vi: 'Bao', so_luong: 15, ghi_chu: '' }], gia_tri_hang: 5000000, trong_luong: 35.00, thu_ho: 0, gia_cuoc: 200000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-37
    { ma_so: 'RGCT-0003', ngay_bien_nhan: mar(55), gio_tao: '10:00', van_phong_gui_id: vpRG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffRG.id, don_vi_gui: 'Cty TNHH Phú Quốc Express', nguoi_gui: 'Phạm Quốc Việt', dien_thoai_gui: '0934567890', dia_chi_gui: '12 Hùng Vương, Phú Quốc', so_cccd_gui: null, don_vi_nhan: 'DNTN Hòa Phát Vận Tải', nguoi_nhan: 'Trương Hòa Phát', dien_thoai_nhan: '0967890123', dia_chi_nhan: '56 Cách Mạng Tháng 8, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '10 Thùng', hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 10, ghi_chu: '' }], gia_tri_hang: 3500000, trong_luong: 25.00, thu_ho: 0, gia_cuoc: 120000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
    // BN-38
    { ma_so: 'SGCT-0016', ngay_bien_nhan: mar(57), gio_tao: '11:00', van_phong_gui_id: vpSG.id, van_phong_nhan_id: vpCT.id, nhan_vien_nhap_id: nvStaffSG.id, don_vi_gui: 'Cty CP Hoàng Long Phát', nguoi_gui: 'Trần Hoàng Long', dien_thoai_gui: '0912345678', dia_chi_gui: '456 Điện Biên Phủ, TP.HCM', so_cccd_gui: null, don_vi_nhan: 'HTX Nông Sản Sạch Cần Thơ', nguoi_nhan: 'Huỳnh Thanh Nông', dien_thoai_nhan: '0989012345', dia_chi_nhan: 'Ấp Nhơn Lộc, TP Cần Thơ', so_cccd_nhan: null, ten_hang_hoa: '5 Bao', hang_hoa_json: [{ don_vi: 'Bao', so_luong: 5, ghi_chu: '' }], gia_tri_hang: 2500000, trong_luong: 12.00, thu_ho: 0, gia_cuoc: 180000, trang_thai_thu: 'da_thu', hinh_thuc_giao: 'tan_noi', chanh_id: null, dia_chi_giao: null, can_xuat_hddt: false, hang_hu_khong_den: false, trang_thai: 'cho_vc', trang_thai_cod: 'khong_co' },
  ];
  for (const bn of bienNhanData4) { await prisma.bienNhan.create({ data: bn }); }
  console.log('  ✅ 38 biên nhận (đợt 4/4: BN-28→38)');

  // ══════════════════════════════════════════════════════════════
  // 6. CÔNG NỢ — tự tạo cho các BN có trang_thai_thu: cong_no
  // ══════════════════════════════════════════════════════════════
  // Lookup BN cần công nợ
  const bnCongNo = await prisma.bienNhan.findMany({
    where: { ma_so: { in: ['SGCT-0004', 'SGCT-0005', 'SGRG-0001', 'CTSG-0005', 'SGCT-0013', 'SGCT-0015'] } },
    select: { id: true, ma_so: true, gia_cuoc: true, don_vi_gui: true, nguoi_gui: true, ngay_bien_nhan: true },
  });
  const bnMap = Object.fromEntries(bnCongNo.map(b => [b.ma_so, b]));

  const congNoList = [
    { ma_so: 'SGCT-0004', doi_tuong: 'Cty TNHH Đại Phong Trading', so_tien_no: 400000 },
    { ma_so: 'SGCT-0005', doi_tuong: 'Cty TNHH Thiên Phú', so_tien_no: 300000 },
    { ma_so: 'SGRG-0001', doi_tuong: 'Cty TNHH Tâm An Logistics', so_tien_no: 500000 },
    { ma_so: 'CTSG-0005', doi_tuong: 'HTX Nông Sản Sạch Cần Thơ', so_tien_no: 250000 },
    { ma_so: 'SGCT-0013', doi_tuong: 'DNTN Minh Phát', so_tien_no: 120000 },
    { ma_so: 'SGCT-0015', doi_tuong: 'Cty TNHH Đại Phong Trading', so_tien_no: 300000 },
  ];
  for (const cn of congNoList) {
    const bn = bnMap[cn.ma_so];
    if (!bn) continue;
    await prisma.congNo.create({
      data: {
        bien_nhan_id: bn.id,
        doi_tuong: cn.doi_tuong,
        so_tien_no: cn.so_tien_no,
        ngay_phat_sinh: bn.ngay_bien_nhan,
        trang_thai: 'chua_thu',
      }
    });
  }
  console.log('  ✅ 6 công nợ');

  // ══════════════════════════════════════════════════════════════
  // 7. BIÊN NHẬN THU HỘ — BN-09 (da_thu) và BN-10 (da_chuyen)
  // ══════════════════════════════════════════════════════════════
  const bn09 = await prisma.bienNhan.findFirst({ where: { ma_so: 'CTSG-0002' } });
  const bn10 = await prisma.bienNhan.findFirst({ where: { ma_so: 'RGSG-0002' } });

  if (bn09) {
    await prisma.bienNhanThuHo.create({
      data: {
        ma_bnth: 'BNTH-0001',
        bien_nhan_id: bn09.id,
        so_tien: 3000000,
        nguoi_nop: 'Võ Thanh Bình',
        hinh_thuc: 'tien_mat',
        van_phong_id: vpSG.id,
        nhan_vien_id: nvAdmin.id,
        la_qua_chanh: false,
        ghi_chu: 'Thu COD từ người nhận BN CTSG-0002',
      }
    });
  }
  if (bn10) {
    await prisma.bienNhanThuHo.create({
      data: {
        ma_bnth: 'BNTH-0002',
        bien_nhan_id: bn10.id,
        so_tien: 1500000,
        nguoi_nop: 'Nguyễn Văn Tâm',
        hinh_thuc: 'tien_mat',
        van_phong_id: vpSG.id,
        nhan_vien_id: nvAdmin.id,
        la_qua_chanh: false,
        ghi_chu: 'Thu COD từ người nhận BN RGSG-0002',
      }
    });
  }
  console.log('  ✅ 2 biên nhận thu hộ (BNTH-0001, BNTH-0002)');

  // ══════════════════════════════════════════════════════════════
  // 8. PHIẾU CHUYỂN COD — BN-10 (da_chuyen): SG → RG
  // ══════════════════════════════════════════════════════════════
  if (bn10) {
    const pcCod = await prisma.phieuChuyenCOD.create({
      data: {
        ma_phieu: 'PC-COD-0001',
        van_phong_nhan_id: vpSG.id,   // SG đang giữ tiền
        van_phong_gui_id: vpRG.id,    // RG sẽ nhận tiền về
        so_tien_tong: 1500000,
        hinh_thuc: 'chuyen_khoan',
        trang_thai: 'da_chuyen',
        nhan_vien_lap_id: nvAdmin.id,
        ghi_chu: 'Chuyển COD từ VP SG về VP RG — BN RGSG-0002',
        ngay_chuyen: d7ago,
      }
    });
    await prisma.phieuChuyenCODChiTiet.create({
      data: {
        phieu_id: pcCod.id,
        bien_nhan_id: bn10.id,
        so_tien: 1500000,
      }
    });
  }
  console.log('  ✅ 1 phiếu chuyển COD (PC-COD-0001)');

  // ══════════════════════════════════════════════════════════════
  // TEST DATA: PhieuChuyenCuoc (BN-04 = CTRG-0001 đã ở da_thu)
  // ══════════════════════════════════════════════════════════════
  // Để test luồng chuyển cước, cập nhật BN-04 lên da_thu trước
  const bn04 = await prisma.bienNhan.findFirst({ where: { ma_so: 'CTRG-0001' } });
  if (bn04) {
    // Tạo PhieuThu giả lập thu cước từ người nhận
    const ptCuoc = await prisma.phieuThu.create({
      data: {
        ma_phieu: 'PT-CUOC-T01',
        doi_tuong: 'Cty TNHH Phú Quốc Express',
        ly_do: `Thu cước BN ${bn04.ma_so} — Người nhận trả (seed)`,
        so_tien: 350000,
        hinh_thuc: 'tien_mat',
        van_phong_id: vpRG.id,
        nhan_vien_id: nvStaffRG.id,
        bien_nhan_id: bn04.id,
      },
    });
    await prisma.bienNhan.update({
      where: { id: bn04.id },
      data: { trang_thai_cuoc_nhan: 'da_thu' },
    });
    console.log('  ✅ BN CTRG-0001: trang_thai_cuoc_nhan → da_thu (sẵn sàng lập PhieuChuyenCuoc)');
  }
  */

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  const counts = {
    vanPhong: await prisma.vanPhong.count(),
    nhanVien: await prisma.nhanVien.count(),
    khachHang: await prisma.khachHang.count(),
    chanh: await prisma.chanh.count(),
  };

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       📊 DATABASE SUMMARY            ║');
  console.log('╠══════════════════════════════════════╣');
  for (const [model, count] of Object.entries(counts)) {
    console.log(`║  ${model.padEnd(22)} ${String(count).padStart(6)} ║`);
  }
  console.log('╚══════════════════════════════════════╝');

  console.log('\n🔑 Tài khoản đăng nhập:');
  console.log('   ┌──────────────┬───────┬─────────────┐');
  console.log('   │ Username     │ Role  │ Văn phòng   │');
  console.log('   ├──────────────┼───────┼─────────────┤');
  console.log('   │ admin        │ admin │ VP Tp.HCM   │');
  console.log('   │ ketoan       │ staff │ VP Tp.HCM   │');
  console.log('   │ staff_sg     │ staff │ VP Tp.HCM   │');
  console.log('   │ staff_ct     │ staff │ VP Cần Thơ  │');
  console.log('   │ ketoan_ct    │ staff │ VP Cần Thơ  │');
  console.log('   │ staff_rg     │ staff │ VP Rạch Giá │');
  console.log('   │ staff_rg_old │ staff │ VP Rạch Giá │');
  console.log('   │ nv_new       │ staff │ VP Tp.HCM   │');
  console.log('   │ nv_locked    │ staff │ VP Cần Thơ  │');
  console.log('   └──────────────┴───────┴─────────────┘');
  console.log('   🔒 Mật khẩu chung: Tmq@1234\n');
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
