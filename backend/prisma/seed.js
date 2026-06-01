import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

/** Ngày N ngày trước, giờ random 7h-17h */
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

  // ══════════════════════════════════════
  // 1. VĂN PHÒNG (3)
  // ══════════════════════════════════════
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

  // ══════════════════════════════════════
  // 2. NHÂN VIÊN (9)
  // ══════════════════════════════════════
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

  // ══════════════════════════════════════
  // 3. KHÁCH HÀNG (18)
  // ══════════════════════════════════════
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

  // ══════════════════════════════════════
  // 4. CHÀNH (4)
  // ══════════════════════════════════════
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

  /*
  // ══════════════════════════════════════
  // 5. BIÊN NHẬN — Đầy đủ tổ hợp trạng thái (33 BN)
  // ══════════════════════════════════════
  const today = new Date(); today.setHours(9, 0, 0, 0);
  const d7  = (h=8) => { const d=new Date(); d.setDate(d.getDate()-7);  d.setHours(h,0,0,0); return d; };
  const d14 = (h=8) => { const d=new Date(); d.setDate(d.getDate()-14); d.setHours(h,0,0,0); return d; };

  // Helper: tạo BN với default + override
  const mkBN = (ma_so, date, vpGId, vpNId, nvId, fields = {}) => ({
    ma_so,
    ngay_bien_nhan: date,
    van_phong_gui_id: vpGId,
    van_phong_nhan_id: vpNId,
    nhan_vien_nhap_id: nvId,
    don_vi_gui: 'Cty TNHH Tâm An Logistics',
    nguoi_gui: 'Nguyễn Văn Tâm',
    dien_thoai_gui: '0901234567',
    dia_chi_gui: '123 Nguyễn Văn Linh, Q.7, TP.HCM',
    don_vi_nhan: 'Cty TNHH Thiên Phú',
    nguoi_nhan: 'Ngô Thiên Phú',
    dien_thoai_nhan: '0990123456',
    dia_chi_nhan: '321 Nguyễn Trung Trực, TP Rạch Giá',
    ten_hang_hoa: '5 Thùng',
    hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 5, ghi_chu: '' }],
    gia_tri_hang: 5000000,
    trong_luong: 20,
    thu_ho: 0,
    gia_cuoc: 200000,
    trang_thai_thu: 'da_thu',
    trang_thai_cod: 'khong_co',
    trang_thai: 'cho_vc',
    hinh_thuc_giao: 'tan_noi',
    chanh_id: null,
    dia_chi_giao: null,
    can_xuat_hddt: false,
    da_vao_bang_ke: false,
    hang_hu_khong_den: false,
    ...fields,
  });

  // ── GROUP A: ĐÃ THU CƯỚC GỬI & KHÔNG CÓ COD (18 BIÊN NHẬN) ──────────────────
  // Dùng để test tất cả các trạng thái vận chuyển (7 trạng thái) và các hình thức giao nhận (tận nơi, tự tới, gọi điện, chành)
  const groupA = [
    // A01: Trạng thái "Chờ vận chuyển" | Giao "Tận nơi" | Biên nhận cơ bản
    mkBN('TC-A01', today, vpSG.id, vpCT.id, nvStaffSG.id),
    // A02: Trạng thái "Chờ vận chuyển" | Giao "Tận nơi" | Cần xuất hóa đơn điện tử (can_xuat_hddt = true)
    mkBN('TC-A02', today, vpSG.id, vpCT.id, nvStaffSG.id, { can_xuat_hddt: true }),
    // A03: Trạng thái "Chờ vận chuyển" | Giao "Tận nơi" | Cần xuất hóa đơn & Đã đưa vào bảng kê HĐĐT (da_vao_bang_ke = true)
    mkBN('TC-A03', today, vpSG.id, vpCT.id, nvAdmin.id,   { can_xuat_hddt: true, da_vao_bang_ke: true }),
    // A04: Trạng thái "Chờ vận chuyển" | Giao qua "Gọi điện báo khách tự đến lấy"
    mkBN('TC-A04', today, vpSG.id, vpCT.id, nvStaffSG.id, { hinh_thuc_giao: 'goi_dien' }),
    // A05: Trạng thái "Chờ vận chuyển" | Khách "Tự tới" kho gửi/nhận hàng
    mkBN('TC-A05', today, vpSG.id, vpCT.id, nvStaffSG.id, { hinh_thuc_giao: 'tu_toi' }),
    // A06: Trạng thái "Chờ vận chuyển" | Cờ báo hàng bị hư hỏng không đến nơi được (hang_hu_khong_den = true)
    mkBN('TC-A06', today, vpCT.id, vpRG.id, nvStaffCT.id, { hang_hu_khong_den: true }),
    // A07: Trạng thái "Đang vận chuyển" | Giao "Tận nơi" (Đang đi trên đường từ SG -> CT)
    mkBN('TC-A07', d7(),  vpSG.id, vpCT.id, nvStaffSG.id, { trang_thai: 'dang_vc' }),
    // A08: Trạng thái "Đang vận chuyển" | Giao qua "Gọi điện" (Đang đi trên đường từ CT -> SG)
    mkBN('TC-A08', d7(),  vpCT.id, vpSG.id, nvStaffCT.id, { trang_thai: 'dang_vc', hinh_thuc_giao: 'goi_dien' }),
    // A09: Trạng thái "Đã đến kho" | Giao "Tận nơi" (Hàng đã về tới kho SG, chờ xếp xe đi giao)
    mkBN('TC-A09', d7(),  vpRG.id, vpSG.id, nvStaffRG.id, { trang_thai: 'da_den_kho' }),
    // A10: Trạng thái "Đã đến kho" | Giao qua "Gọi điện" (Hàng đã về tới kho RG, chờ nhân viên gọi điện)
    mkBN('TC-A10', d7(),  vpSG.id, vpRG.id, nvStaffSG.id, { trang_thai: 'da_den_kho', hinh_thuc_giao: 'goi_dien' }),
    // A11: Trạng thái "Đã đến kho" | Khách "Tự tới" kho lấy hàng (Hàng đã nằm ở kho RG)
    mkBN('TC-A11', d7(),  vpCT.id, vpRG.id, nvStaffCT.id, { trang_thai: 'da_den_kho', hinh_thuc_giao: 'tu_toi' }),
    // A12: Trạng thái "Đã báo khách" | Giao "Tận nơi" (Đã liên hệ với khách để xác nhận địa chỉ giao)
    mkBN('TC-A12', d7(),  vpSG.id, vpCT.id, nvAdmin.id,   { trang_thai: 'da_bao_khach' }),
    // A13: Trạng thái "Đã báo khách" | Giao qua "Gọi điện" (Đã gọi điện báo khách và đang chờ khách đến kho nhận)
    mkBN('TC-A13', d7(),  vpCT.id, vpSG.id, nvKeToanCT.id,{ trang_thai: 'da_bao_khach', hinh_thuc_giao: 'goi_dien' }),
    // A14: Trạng thái "Đang giao" | Giao qua Chành xe Tàu Thủy Cần Thơ (Đang trên đường mang ra chành giao)
    mkBN('TC-A14', d7(),  vpRG.id, vpCT.id, nvStaffRG.id, { trang_thai: 'dang_giao', chanh_id: chanhTauThuy?.id ?? null, dia_chi_giao: '56 Cách Mạng Tháng 8, TP Cần Thơ' }),
    // A15: Trạng thái "Đã giao chành" | Giao qua Chành xe Superdong (Đã giao xong cho chành xe trung chuyển ra Phú Quốc)
    mkBN('TC-A15', d14(), vpSG.id, vpRG.id, nvStaffSG.id, { trang_thai: 'da_giao_chanh', chanh_id: chanhSuperdong?.id ?? null, dia_chi_giao: '12 Hùng Vương, Phú Quốc' }),
    // A16: Trạng thái "Khách đã nhận" | Giao "Tận nơi" (Hoàn tất chu trình giao tận nơi thành công)
    mkBN('TC-A16', d14(), vpSG.id, vpCT.id, nvStaffSG.id, { trang_thai: 'khach_da_nhan' }),
    // A17: Trạng thái "Khách đã nhận" | Giao qua "Gọi điện" (Khách đã tới kho ký nhận và mang hàng về)
    mkBN('TC-A17', d14(), vpCT.id, vpRG.id, nvStaffCT.id, { trang_thai: 'khach_da_nhan', hinh_thuc_giao: 'goi_dien' }),
    // A18: Trạng thái "Khách đã nhận" | Khách "Tự tới" kho lấy hàng (Đã ký nhận lấy hàng tại quầy kho SG)
    mkBN('TC-A18', d14(), vpRG.id, vpSG.id, nvStaffRG.id, { trang_thai: 'khach_da_nhan', hinh_thuc_giao: 'tu_toi' }),
  ];
  for (const bn of groupA) await prisma.bienNhan.create({ data: bn });
  console.log('  ✅ Group A: 18 BN (da_thu, khong_co) — 7 trang_thai x hinh_thuc_giao x flags');

  // ── GROUP B: CHƯA THU CƯỚC GỬI & LÀ CƯỚC NHẬN / THU SAU (5 BIÊN NHẬN) ────────
  // Dùng để test nghiệp vụ "Cước Nhận" (Cước do người nhận trả khi nhận hàng) và các phiếu chuyển cước giữa các VP
  const groupB = [
    // B01: Trạng thái "Chờ vận chuyển" | Cước nhận đang ở trạng thái "Chờ thu" tại đầu nhận (RG)
    mkBN('TC-B01', today, vpCT.id, vpRG.id, nvStaffCT.id, { trang_thai: 'cho_vc', trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'cho_thu', gia_cuoc: 350000 }),
    // B02: Trạng thái "Đã đến kho" | Cước nhận đã được VP nhận thu tiền ("Đã thu") nhưng chưa gom chuyển cước về VP gửi
    mkBN('TC-B02', d7(), vpSG.id, vpRG.id, nvAdmin.id, { trang_thai: 'da_den_kho', trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'da_thu', gia_cuoc: 400000 }),
    // B03: Trạng thái "Đã đến kho" | Cước nhận đã gom vào Phiếu Chuyển Cước ("Chờ chuyển") để chuyển tiền về VP gửi (RG)
    mkBN('TC-B03', d7(), vpRG.id, vpSG.id, nvStaffRG.id, { trang_thai: 'da_den_kho', trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'cho_chuyen', gia_cuoc: 300000 }),
    // B04: Trạng thái "Khách đã nhận" | Cước nhận đã hoàn thành việc chuyển tiền và VP gửi đã xác nhận ("Đã nhận")
    mkBN('TC-B04', d14(), vpSG.id, vpCT.id, nvStaffSG.id, { trang_thai: 'khach_da_nhan', trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'da_nhan', gia_cuoc: 250000 }),
    // B05: Trạng thái "Đang vận chuyển" | Cước nhận đang ở trạng thái "Chờ thu" (Hàng đi từ CT -> SG)
    mkBN('TC-B05', d7(), vpCT.id, vpSG.id, nvStaffCT.id, { trang_thai: 'dang_vc', trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'cho_thu', hinh_thuc_giao: 'goi_dien', gia_cuoc: 180000 }),
  ];
  for (const bn of groupB) await prisma.bienNhan.create({ data: bn });
  console.log('  ✅ Group B: 5 BN (chua_thu, khong_co) — 5 trang_thai_cuoc_nhan');

  // ── GROUP C: THANH TOÁN CÔNG NỢ (3 BIÊN NHẬN) ─────────────────────────────
  // Dùng để test nghiệp vụ "Công Nợ" (Thu tiền cước hàng tháng theo bảng kê gửi cho doanh nghiệp)
  const groupC = [
    // C01: Trạng thái "Chờ vận chuyển" | Thanh toán công nợ (cước ghi nợ cho khách gửi)
    mkBN('TC-C01', today, vpSG.id, vpCT.id, nvStaffSG.id, { trang_thai: 'cho_vc', trang_thai_thu: 'cong_no', gia_cuoc: 300000 }),
    // C02: Trạng thái "Đã đến kho" | Thanh toán công nợ
    mkBN('TC-C02', d7(), vpCT.id, vpRG.id, nvKeToanCT.id, { trang_thai: 'da_den_kho', trang_thai_thu: 'cong_no', gia_cuoc: 200000 }),
    // C03: Trạng thái "Khách đã nhận" | Thanh toán công nợ | Khách tự tới lấy hàng
    mkBN('TC-C03', d14(), vpRG.id, vpSG.id, nvStaffRG.id, { trang_thai: 'khach_da_nhan', trang_thai_thu: 'cong_no', hinh_thuc_giao: 'tu_toi', gia_cuoc: 150000 }),
  ];
  for (const bn of groupC) await prisma.bienNhan.create({ data: bn });
  console.log('  ✅ Group C: 3 BN (cong_no)');

  // ── GROUP D: THU HỘ / COD (7 BIÊN NHẬN) ────────────────────────────────────
  // Dùng để test toàn bộ vòng đời COD: Thu COD đầu nhận, Quản lý COD chành xe, và Phiếu chuyển tiền COD về VP gửi
  const groupD = [
    // D01: Trạng thái "Chờ vận chuyển" | COD ở trạng thái "Chờ thu" tại đầu nhận (chưa giao hàng nên chưa thu COD)
    mkBN('TC-D01', today, vpCT.id, vpSG.id, nvStaffCT.id, { trang_thai: 'cho_vc', thu_ho: 2000000, trang_thai_cod: 'cho_thu' }),
    // D02: Trạng thái "Đã đến kho" | COD do Chành xe thu hộ ("Chành đã thu") nhưng chưa mang tiền về nộp cho văn phòng nhận
    mkBN('TC-D02', d7(), vpSG.id, vpCT.id, nvAdmin.id, { trang_thai: 'da_den_kho', thu_ho: 3000000, trang_thai_cod: 'da_thu_chanh', chanh_id: chanhTauThuy?.id ?? null, dia_chi_giao: '56 Cách Mạng Tháng 8, TP Cần Thơ' }),
    // D03: Trạng thái "Đã đến kho" | COD do văn phòng nhận thu tiền từ người nhận ("Đã thu") thành công
    mkBN('TC-D03', d7(), vpRG.id, vpSG.id, nvStaffRG.id, { trang_thai: 'da_den_kho', thu_ho: 1500000, trang_thai_cod: 'da_thu' }),
    // D04: Trạng thái "Đã đến kho" | COD đã thu, đã gom vào Phiếu Chuyển COD và bị khóa ("Chờ chuyển pending") chờ xác nhận gửi tiền
    mkBN('TC-D04', d7(), vpCT.id, vpRG.id, nvStaffCT.id, { trang_thai: 'da_den_kho', thu_ho: 2500000, trang_thai_cod: 'cho_chuyen_pending' }),
    // D05: Trạng thái "Khách đã nhận" | COD đã gửi đi từ VP nhận và đang trên đường chuyển về hoặc đã chuyển về VP gửi ("Đã chuyển")
    mkBN('TC-D05', d14(), vpSG.id, vpRG.id, nvAdmin.id, { trang_thai: 'khach_da_nhan', thu_ho: 4000000, trang_thai_cod: 'da_chuyen' }),
    // D06: Trạng thái "Khách đã nhận" | COD đã hoàn tất: VP gửi đã nhận được tiền và đã chi trả xong cho người gửi hàng ("Đã trả")
    mkBN('TC-D06', d14(), vpCT.id, vpSG.id, nvStaffCT.id, { trang_thai: 'khach_da_nhan', thu_ho: 1800000, trang_thai_cod: 'da_tra' }),
    // D07: Trạng thái "Chờ vận chuyển" | Cả cước nhận và COD đều đang ở trạng thái chờ thu ("Chờ thu" / "Chưa thu")
    mkBN('TC-D07', today, vpRG.id, vpCT.id, nvStaffRG.id, { trang_thai: 'cho_vc', trang_thai_thu: 'chua_thu', trang_thai_cuoc_nhan: 'cho_thu', thu_ho: 3500000, trang_thai_cod: 'cho_thu', gia_cuoc: 220000 }),
  ];
  for (const bn of groupD) await prisma.bienNhan.create({ data: bn });
  console.log('  ✅ Group D: 7 BN (COD) — 6 trang_thai_cod x mix trang_thai/thu');

  // ── 6. CÔNG NỢ (cho C01, C02, C03) ──────────────────────────
  const bnCRows = await prisma.bienNhan.findMany({ where: { ma_so: { in: ['TC-C01','TC-C02','TC-C03'] } } });
  for (const bn of bnCRows) {
    await prisma.congNo.create({ data: {
      bien_nhan_id: bn.id,
      doi_tuong: bn.don_vi_gui || 'Khách hàng',
      so_tien_no: bn.gia_cuoc,
      ngay_phat_sinh: bn.ngay_bien_nhan,
      trang_thai: 'chua_thu',
    }});
  }
  console.log('  ✅ 3 công nợ (TC-C01, TC-C02, TC-C03)');

  // ── 7. BIÊN NHẬN THU HỘ (D03=da_thu, D05=da_chuyen, D06=da_tra) ──
  const [bnD03, bnD05, bnD06] = await Promise.all([
    prisma.bienNhan.findFirst({ where: { ma_so: 'TC-D03' } }),
    prisma.bienNhan.findFirst({ where: { ma_so: 'TC-D05' } }),
    prisma.bienNhan.findFirst({ where: { ma_so: 'TC-D06' } }),
  ]);
  if (bnD03) await prisma.bienNhanThuHo.create({ data: { ma_bnth: 'BNTH-TC01', bien_nhan_id: bnD03.id, so_tien: 1500000, nguoi_nop: 'Ngô Thiên Phú', hinh_thuc: 'tien_mat', van_phong_id: vpSG.id, nhan_vien_id: nvAdmin.id, la_qua_chanh: false, ghi_chu: 'Thu COD D03 tại VP SG' } });
  if (bnD05) await prisma.bienNhanThuHo.create({ data: { ma_bnth: 'BNTH-TC02', bien_nhan_id: bnD05.id, so_tien: 4000000, nguoi_nop: 'Ngô Thiên Phú', hinh_thuc: 'chuyen_khoan', van_phong_id: vpRG.id, nhan_vien_id: nvStaffRG.id, la_qua_chanh: false, ghi_chu: 'Thu COD D05 tại VP RG' } });
  if (bnD06) await prisma.bienNhanThuHo.create({ data: { ma_bnth: 'BNTH-TC03', bien_nhan_id: bnD06.id, so_tien: 1800000, nguoi_nop: 'Nguyễn Văn Tâm', hinh_thuc: 'tien_mat', van_phong_id: vpSG.id, nhan_vien_id: nvAdmin.id, la_qua_chanh: false, ghi_chu: 'Thu COD D06 tại VP SG' } });
  console.log('  ✅ 3 biên nhận thu hộ (BNTH-TC01, TC02, TC03)');

  // ── 8. PHIẾU CHUYỂN COD (cho D05=da_chuyen: RG→SG ngược chiều, VP SG giữ tiền chuyển về VP SG gửi) ──
  if (bnD05) {
    const pcCod = await prisma.phieuChuyenCOD.create({ data: {
      ma_phieu: 'PC-COD-TC01',
      van_phong_nhan_id: vpRG.id,  // VP RG thu COD, chuyển về
      van_phong_gui_id: vpSG.id,   // VP SG nhận lại COD
      so_tien_tong: 4000000,
      hinh_thuc: 'chuyen_khoan',
      trang_thai: 'da_chuyen',
      nhan_vien_lap_id: nvStaffRG.id,
      ghi_chu: 'Chuyển COD BN TC-D05 từ VP RG về VP SG',
      ngay_chuyen: d14(),
    }});
    await prisma.phieuChuyenCODChiTiet.create({ data: { phieu_id: pcCod.id, bien_nhan_id: bnD05.id, so_tien: 4000000 } });
  }
  console.log('  ✅ 1 phiếu chuyển COD (PC-COD-TC01)');

  // ── 9. PHIẾU CHUYỂN CƯỚC (cho B03=cho_chuyen: RG→SG) ──────
  const bnB03 = await prisma.bienNhan.findFirst({ where: { ma_so: 'TC-B03' } });
  if (bnB03) {
    const pcCuoc = await prisma.phieuChuyenCuoc.create({ data: {
      ma_phieu: 'PC-CUOC-TC01',
      van_phong_nhan_id: vpSG.id,  // VP SG thu cước từ người nhận, chuyển về VP RG gửi
      van_phong_gui_id: vpRG.id,
      so_tien_tong: 300000,
      hinh_thuc: 'tien_mat',
      trang_thai: 'cho_chuyen',
      nhan_vien_lap_id: nvAdmin.id,
      ghi_chu: 'Chuyển cước BN TC-B03 từ VP SG về VP RG',
    }});
    await prisma.phieuChuyenCuocChiTiet.create({ data: { phieu_id: pcCuoc.id, bien_nhan_id: bnB03.id, so_tien: 300000 } });
  }
  console.log('  ✅ 1 phiếu chuyển cước (PC-CUOC-TC01)');
  */

  // ── SUMMARY (SẠCH BIÊN NHẬN) ──────────────────────────────────
  const totalBN = await prisma.bienNhan.count();
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   📊 SEED COMPLETE — ${totalBN} BIÊN NHẬN          ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  console.log(`║  TẠM THỜI LOẠI BỎ TOÀN BỘ BIÊN NHẬN       ║`);
  console.log(`╠══════════════════════════════════════════╣`);
  console.log(`║  🔑 admin/ketoan/staff_sg  → VP SG      ║`);
  console.log(`║  🔑 staff_ct/ketoan_ct     → VP CT      ║`);
  console.log(`║  🔑 staff_rg               → VP RG      ║`);
  console.log(`║  🔒 Mật khẩu: Tmq@1234                  ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
