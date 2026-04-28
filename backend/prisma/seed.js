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
  await prisma.congNo.deleteMany();
  await prisma.phieuThu.deleteMany();
  await prisma.phieuChi.deleteMany();
  await prisma.lichSuTrangThai.deleteMany();
  await prisma.bienNhan.deleteMany();
  await prisma.khachHang.deleteMany();
  await prisma.nhanVien.deleteMany();
  await prisma.vanPhong.deleteMany();

  // Reset auto-increment sequences
  const sequences = [
    'van_phong', 'nhan_vien', 'khach_hang', 'bien_nhan',
    'lich_su_trang_thai', 'bang_ke', 'bang_ke_chi_tiet',
    'phieu_thu', 'phieu_chi', 'cong_no', 'login_log', 'audit_log',
  ];
  for (const seq of sequences) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${seq}_id_seq RESTART WITH 1`);
  }

  console.log('🌱 Seeding database...\n');

  // ══════════════════════════════════════════════════════════════
  // 1. VĂN PHÒNG (3)
  // ══════════════════════════════════════════════════════════════
  const vpSG = await prisma.vanPhong.create({
    data: { ma_vp: 'SG', ten: 'VP Tp.HCM', dia_chi: '491 Lê Hồng Phong, Phường 2, Quận 10, TP.HCM', dien_thoai: '(028) 383.338.79' },
  });
  const vpCT = await prisma.vanPhong.create({
    data: { ma_vp: 'CT', ten: 'VP Cần Thơ', dia_chi: '20 Đại lộ Hòa Bình, Q.Ninh Kiều, TP Cần Thơ', dien_thoai: '(0292) 222.333' },
  });
  const vpRG = await prisma.vanPhong.create({
    data: { ma_vp: 'RG', ten: 'VP Rạch Giá', dia_chi: '15 Nguyễn Trung Trực, TP Rạch Giá, Kiên Giang', dien_thoai: '(0297) 444.555' },
  });
  console.log('  ✅ 3 văn phòng');

  // ══════════════════════════════════════════════════════════════
  // 2. NHÂN VIÊN (7)
  // ══════════════════════════════════════════════════════════════
  const hash = await bcrypt.hash('Tmq@1234', 10);
  const nvData = [
    { ma_nv: 'NV-SG-001', ten: 'Trần Minh Quang (Admin)', van_phong_id: vpSG.id, role: 'admin', username: 'admin' },
    { ma_nv: 'NV-SG-002', ten: 'Nguyễn Thị Thu Hà', van_phong_id: vpSG.id, role: 'accountant', username: 'ketoan' },
    { ma_nv: 'NV-SG-003', ten: 'Lê Văn Hùng', van_phong_id: vpSG.id, role: 'staff', username: 'staff_sg' },
    { ma_nv: 'NV-CT-001', ten: 'Phạm Thanh Tùng', van_phong_id: vpCT.id, role: 'staff', username: 'staff_ct' },
    { ma_nv: 'NV-CT-002', ten: 'Võ Thị Ngọc Hân', van_phong_id: vpCT.id, role: 'accountant', username: 'ketoan_ct' },
    { ma_nv: 'NV-RG-001', ten: 'Đặng Hoàng Phúc', van_phong_id: vpRG.id, role: 'staff', username: 'staff_rg' },
    // NV inactive — để demo quản lý nhân viên
    { ma_nv: 'NV-RG-002', ten: 'Huỳnh Văn Tài (đã nghỉ)', van_phong_id: vpRG.id, role: 'staff', username: 'staff_rg_old', active: false },
  ];
  const nvList = [];
  for (const u of nvData) {
    const active = u.active !== undefined ? u.active : true;
    const nv = await prisma.nhanVien.create({ data: { ...u, active, password_hash: hash } });
    nvList.push(nv);
  }
  const [nvAdmin, nvKeToan, nvStaffSG, nvStaffCT, nvKeToanCT, nvStaffRG] = nvList;
  console.log('  ✅ 7 nhân viên (6 active + 1 inactive)');

  // ══════════════════════════════════════════════════════════════
  // 3. KHÁCH HÀNG (15) — mix doanh nghiệp + cá nhân + inactive
  // ══════════════════════════════════════════════════════════════
  const customers = [
    // Doanh nghiệp (10)
    { ma_kh: 'KH-001', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Tâm An Logistics', nguoi_lien_he: 'Nguyễn Văn Tâm', dien_thoai: '0901234567', ma_so_thue: '0312345678' },
    { ma_kh: 'KH-002', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty CP Hoàng Long Phát', nguoi_lien_he: 'Trần Hoàng Long', dien_thoai: '0912345678', ma_so_thue: '0301234567' },
    { ma_kh: 'KH-003', loai_kh: 'doanh_nghiep', ten_don_vi: 'DNTN Minh Phát', nguoi_lien_he: 'Lê Minh Phát', dien_thoai: '0923456789' },
    { ma_kh: 'KH-004', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Phú Quốc Express', nguoi_lien_he: 'Phạm Quốc Việt', dien_thoai: '0934567890' },
    { ma_kh: 'KH-005', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cửa Hàng Thanh Bình', nguoi_lien_he: 'Võ Thanh Bình', dien_thoai: '0945678901' },
    { ma_kh: 'KH-006', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Đại Phong', nguoi_lien_he: 'Đặng Đại Phong', dien_thoai: '0956789012', ma_so_thue: '0398765432' },
    { ma_kh: 'KH-007', loai_kh: 'doanh_nghiep', ten_don_vi: 'DNTN Hòa Phát Vận Tải', nguoi_lien_he: 'Trương Hòa Phát', dien_thoai: '0967890123' },
    { ma_kh: 'KH-008', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty CP Sao Việt', nguoi_lien_he: 'Lý Sao Việt', dien_thoai: '0978901234', ma_so_thue: '0309876543' },
    { ma_kh: 'KH-009', loai_kh: 'doanh_nghiep', ten_don_vi: 'Nông Sản Cần Thơ', nguoi_lien_he: 'Huỳnh Thanh Nông', dien_thoai: '0989012345' },
    { ma_kh: 'KH-010', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Thiên Phú', nguoi_lien_he: 'Ngô Thiên Phú', dien_thoai: '0990123456', ma_so_thue: '0316789012' },
    // Cá nhân (4)
    { ma_kh: 'KH-011', loai_kh: 'ca_nhan', ten_don_vi: 'Anh Tuấn (cá nhân)', nguoi_lien_he: 'Nguyễn Anh Tuấn', dien_thoai: '0371234567' },
    { ma_kh: 'KH-012', loai_kh: 'ca_nhan', ten_don_vi: 'Chị Mai (cá nhân)', nguoi_lien_he: 'Trần Thị Mai', dien_thoai: '0382345678' },
    { ma_kh: 'KH-013', loai_kh: 'ca_nhan', ten_don_vi: 'Anh Khoa (cá nhân)', nguoi_lien_he: 'Lê Đăng Khoa', dien_thoai: '0393456789' },
    { ma_kh: 'KH-014', loai_kh: 'ca_nhan', ten_don_vi: 'Chị Linh (cá nhân)', nguoi_lien_he: 'Phạm Thùy Linh', dien_thoai: '0364567890' },
    // KH inactive — demo toggle
    { ma_kh: 'KH-015', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH ABC (ngưng HĐ)', nguoi_lien_he: 'Nguyễn Văn A', dien_thoai: '0901111222', active: false },
  ];

  for (const c of customers) {
    const active = c.active !== undefined ? c.active : true;
    await prisma.khachHang.create({ data: { ...c, active } });
  }
  console.log('  ✅ 15 khách hàng (10 DN + 4 cá nhân + 1 inactive)');

  // ══════════════════════════════════════════════════════════════
  // 4. BIÊN NHẬN (50) — trải đều 6 tuyến × nhiều trạng thái
  //    + dữ liệu 30 ngày gần nhất để dashboard đẹp
  // ══════════════════════════════════════════════════════════════
  const trangThaiFlow = ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'];

  const routes = [
    { vpGui: vpSG, vpNhan: vpCT, nv: nvStaffSG },
    { vpGui: vpCT, vpNhan: vpSG, nv: nvStaffCT },
    { vpGui: vpSG, vpNhan: vpRG, nv: nvAdmin },
    { vpGui: vpRG, vpNhan: vpSG, nv: nvStaffRG },
    { vpGui: vpCT, vpNhan: vpRG, nv: nvStaffCT },
    { vpGui: vpRG, vpNhan: vpCT, nv: nvStaffRG },
  ];

  const hangHoaList = [
    'Linh kiện điện tử Samsung', 'Vải may mặc xuất khẩu', 'Phụ tùng xe máy Honda',
    'Mỹ phẩm nhập khẩu Hàn Quốc', 'Thực phẩm khô đặc sản', 'Đồ gia dụng Sunhouse',
    'Sách vở - Văn phòng phẩm', 'Thuốc tây dược phẩm', 'Giày dép Biti\'s',
    'Nông sản sạch Cần Thơ', 'Thiết bị y tế Omron', 'Quần áo thời trang Việt',
    'Phụ kiện điện thoại', 'Đồ chơi trẻ em Lego', 'Hàng tạp hóa tổng hợp',
    'Laptop Dell Inspiron', 'Dụng cụ cơ khí Bosch', 'Hóa chất công nghiệp',
    'Nội thất gỗ Đức Thành', 'Hải sản đông lạnh Phú Quốc',
    'Gạo nếp cẩm Tây Ninh', 'Trái cây miền Tây (xoài, sầu riêng)',
    'Bánh kẹo nhập khẩu', 'Rượu vang Chile', 'Đèn LED trang trí Rạng Đông',
    'Áo mưa công nghiệp', 'Giỏ quà Tết doanh nghiệp', 'Hạt điều rang muối Bình Phước',
    'Dây cáp điện Cadivi', 'Nước mắm Phú Quốc truyền thống',
    'Máy bơm nước Panasonic', 'Bình ắc quy GS Yuasa', 'Gạch ốp lát Viglacera',
    'Sơn nước Dulux', 'Máy lọc nước Kangaroo', 'Tủ lạnh Toshiba',
    'Quạt công nghiệp Lifan', 'Giấy in A4 Double A', 'Mực in HP LaserJet',
    'Bao bì carton 5 lớp', 'Kệ sắt V lỗ', 'Ống nhựa Bình Minh',
    'Xi măng Hà Tiên', 'Gỗ ván ép MDF', 'Phân bón Đầu Trâu',
    'Thuốc trừ sâu sinh học', 'Thức ăn chăn nuôi CP', 'Cà phê rang xay',
    'Trà oolong Đài Loan', 'Nệm mousse Kim Đan',
  ];

  const cuocValues = [50000, 80000, 100000, 120000, 150000, 180000, 200000, 250000, 300000, 350000, 400000, 500000, 650000, 750000, 1000000, 1200000, 1500000, 2000000, 2500000, 3000000];

  const allBienNhan = [];
  let bnIndex = 0;

  // === PHASE A: 30 BN trong 7 ngày gần nhất (cho biểu đồ doanh thu 7 ngày) ===
  for (let day = 6; day >= 0; day--) {
    const bnPerDay = day === 0 ? 6 : (day <= 2 ? 5 : 4); // Hôm nay nhiều hơn
    for (let i = 0; i < bnPerDay; i++) {
      const route = routes[bnIndex % routes.length];
      const prefix = `${route.vpGui.ma_vp}${route.vpNhan.ma_vp}`;
      const khIdx = bnIndex % customers.length;
      const nhIdx = (khIdx + 3 + bnIndex) % (customers.length - 1); // -1 to skip inactive
      const cuoc = cuocValues[bnIndex % cuocValues.length];
      const ngay = daysAgo(day, i * 2);

      // Trạng thái: BN cũ hơn → hoàn thành hơn
      let trangThaiIdx;
      if (day >= 5) trangThaiIdx = 4; // khach_da_nhan
      else if (day >= 3) trangThaiIdx = rand(2, 4); // da_den_kho → khach_da_nhan
      else if (day >= 1) trangThaiIdx = rand(1, 3); // dang_vc → da_bao_khach
      else trangThaiIdx = rand(0, 1); // cho_vc hoặc dang_vc (mới tạo hôm nay)

      // Thanh toán
      const isCongNo = bnIndex % 5 === 4; // ~20% là công nợ
      const trangThaiThu = isCongNo ? 'cong_no' : (bnIndex % 7 === 6 ? 'chua_thu' : 'da_thu');

      // HĐĐT — 8 BN cần xuất, phần lớn chưa vào bảng kê
      const canXuatHddt = bnIndex < 10;

      const bn = await prisma.bienNhan.create({
        data: {
          ma_so: `${prefix}-${String(bnIndex + 1).padStart(4, '0')}`,
          ngay_nhan: ngay,
          van_phong_gui_id: route.vpGui.id,
          van_phong_nhan_id: route.vpNhan.id,
          nhan_vien_nhap_id: route.nv.id,
          don_vi_gui: customers[khIdx].ten_don_vi,
          nguoi_gui: customers[khIdx].nguoi_lien_he,
          dien_thoai_gui: customers[khIdx].dien_thoai,
          don_vi_nhan: customers[nhIdx].ten_don_vi,
          nguoi_nhan: customers[nhIdx].nguoi_lien_he,
          dien_thoai_nhan: customers[nhIdx].dien_thoai,
          so_cccd: bnIndex % 4 === 0 ? `0${rand(60, 99)}${rand(100, 999)}${rand(100, 999)}${rand(10, 99)}` : null,
          ten_hang_hoa: hangHoaList[bnIndex % hangHoaList.length],
          gia_tri_hang: cuoc * rand(2, 10),
          trong_luong: parseFloat((0.5 + Math.random() * 80).toFixed(2)),
          thu_ho: bnIndex % 3 === 0 ? cuoc * rand(1, 3) : 0,
          gia_cuoc: cuoc,
          trang_thai: trangThaiFlow[trangThaiIdx],
          trang_thai_thu: trangThaiThu,
          can_xuat_hddt: canXuatHddt,
          da_vao_bang_ke: false,
          hang_hu_khong_den: bnIndex === 7, // 1 BN demo checkbox này
          hinh_thuc_giao: ['tan_noi', 'goi_dien', 'tu_toi'][bnIndex % 3],
          created_at: ngay,
          updated_at: ngay,
        },
      });
      allBienNhan.push(bn);

      // Lịch sử trạng thái
      for (let s = 0; s <= trangThaiIdx; s++) {
        const logDate = new Date(ngay);
        logDate.setHours(logDate.getHours() + s * rand(2, 6));
        await prisma.lichSuTrangThai.create({
          data: {
            bien_nhan_id: bn.id,
            trang_thai_cu: s === 0 ? null : trangThaiFlow[s - 1],
            trang_thai_moi: trangThaiFlow[s],
            nhan_vien_id: route.nv.id,
            phuong_thuc: s === 0 ? 'manual' : (s > 2 ? 'manual' : pick(['batch', 'manual', 'qr_scan'])),
            ghi_chu: s === 0 ? 'Tạo biên nhận mới' : `Cập nhật trạng thái → ${trangThaiFlow[s]}`,
            created_at: logDate,
          },
        });
      }

      // Công nợ
      if (isCongNo) {
        await prisma.congNo.create({
          data: {
            bien_nhan_id: bn.id,
            doi_tuong: customers[khIdx].ten_don_vi,
            so_tien_no: cuoc,
            ngay_phat_sinh: ngay,
            trang_thai: 'chua_thu',
          },
        });
      }

      bnIndex++;
    }
  }

  // === PHASE B: 20 BN cũ hơn (8–30 ngày trước) — cho tổng biên nhận ấn tượng ===
  for (let i = 0; i < 20; i++) {
    const day = rand(8, 30);
    const route = routes[bnIndex % routes.length];
    const prefix = `${route.vpGui.ma_vp}${route.vpNhan.ma_vp}`;
    const khIdx = bnIndex % (customers.length - 1);
    const nhIdx = (khIdx + 5) % (customers.length - 1);
    const cuoc = cuocValues[bnIndex % cuocValues.length];
    const ngay = daysAgo(day, i % 4);

    const trangThaiIdx = 4; // tất cả đã hoàn thành
    const isCongNo = i % 6 === 5;
    const trangThaiThu = isCongNo ? 'cong_no' : 'da_thu';

    const bn = await prisma.bienNhan.create({
      data: {
        ma_so: `${prefix}-${String(bnIndex + 1).padStart(4, '0')}`,
        ngay_nhan: ngay,
        van_phong_gui_id: route.vpGui.id,
        van_phong_nhan_id: route.vpNhan.id,
        nhan_vien_nhap_id: route.nv.id,
        don_vi_gui: customers[khIdx].ten_don_vi,
        nguoi_gui: customers[khIdx].nguoi_lien_he,
        dien_thoai_gui: customers[khIdx].dien_thoai,
        don_vi_nhan: customers[nhIdx].ten_don_vi,
        nguoi_nhan: customers[nhIdx].nguoi_lien_he,
        dien_thoai_nhan: customers[nhIdx].dien_thoai,
        ten_hang_hoa: hangHoaList[bnIndex % hangHoaList.length],
        gia_tri_hang: cuoc * rand(2, 8),
        trong_luong: parseFloat((1 + Math.random() * 60).toFixed(2)),
        thu_ho: i % 4 === 0 ? cuoc * 2 : 0,
        gia_cuoc: cuoc,
        trang_thai: trangThaiFlow[trangThaiIdx],
        trang_thai_thu: trangThaiThu,
        can_xuat_hddt: i < 5, // 5 BN có HĐĐT, đã vào bảng kê
        da_vao_bang_ke: i < 5,
        hinh_thuc_giao: ['tan_noi', 'goi_dien', 'tu_toi'][i % 3],
        created_at: ngay,
        updated_at: ngay,
      },
    });
    allBienNhan.push(bn);

    // Lịch sử trạng thái tóm gọn
    for (let s = 0; s <= trangThaiIdx; s++) {
      const logDate = new Date(ngay);
      logDate.setHours(logDate.getHours() + s * rand(3, 8));
      await prisma.lichSuTrangThai.create({
        data: {
          bien_nhan_id: bn.id,
          trang_thai_cu: s === 0 ? null : trangThaiFlow[s - 1],
          trang_thai_moi: trangThaiFlow[s],
          nhan_vien_id: route.nv.id,
          phuong_thuc: s === 0 ? 'manual' : pick(['batch', 'manual']),
          ghi_chu: s === 0 ? 'Tạo biên nhận mới' : `Cập nhật trạng thái`,
          created_at: logDate,
        },
      });
    }

    if (isCongNo) {
      // Một số CN đã thu, một số chưa
      const daThu = i % 2 === 0;
      await prisma.congNo.create({
        data: {
          bien_nhan_id: bn.id,
          doi_tuong: customers[khIdx].ten_don_vi,
          so_tien_no: cuoc,
          ngay_phat_sinh: ngay,
          trang_thai: daThu ? 'da_thu' : 'chua_thu',
          ngay_thu: daThu ? daysAgo(day - 2) : null,
        },
      });
    }

    bnIndex++;
  }

  console.log(`  ✅ ${allBienNhan.length} biên nhận + lịch sử trạng thái + công nợ`);

  // ══════════════════════════════════════════════════════════════
  // 5. PHIẾU THU (20) — trải 6 tháng cho biểu đồ thu/chi đẹp
  //    + 1 phiếu bị hủy (demo soft delete)
  // ══════════════════════════════════════════════════════════════
  const ptData = [
    // Tháng hiện tại (8 phiếu)
    { doi_tuong: 'Cty TNHH Tâm An Logistics', ly_do: 'Thu cước vận chuyển lô hàng SG-CT', so_tien: 2500000, vp: vpSG.id, nv: nvKeToan.id, bn: allBienNhan[0]?.id, ngay: daysAgo(1) },
    { doi_tuong: 'Cty CP Hoàng Long Phát', ly_do: 'Thu cước gửi hàng SG-RG', so_tien: 1200000, vp: vpSG.id, nv: nvKeToan.id, bn: allBienNhan[2]?.id, ngay: daysAgo(2) },
    { doi_tuong: 'DNTN Minh Phát', ly_do: 'Thu tiền thu hộ COD', so_tien: 3500000, vp: vpSG.id, nv: nvAdmin.id, ngay: daysAgo(3) },
    { doi_tuong: 'Anh Tuấn (cá nhân)', ly_do: 'Thu cước gửi hàng cá nhân', so_tien: 200000, vp: vpSG.id, nv: nvStaffSG.id, ngay: daysAgo(4) },
    { doi_tuong: 'Cửa Hàng Thanh Bình', ly_do: 'Thu cước tuyến CT→SG', so_tien: 850000, vp: vpCT.id, nv: nvKeToanCT.id, bn: allBienNhan[6]?.id, ngay: daysAgo(2) },
    { doi_tuong: 'DNTN Hòa Phát Vận Tải', ly_do: 'Thu cước vận chuyển RG→SG', so_tien: 1500000, vp: vpRG.id, nv: nvStaffRG.id, bn: allBienNhan[8]?.id, ngay: daysAgo(3) },
    { doi_tuong: 'Cty CP Sao Việt', ly_do: 'Thu cước theo hợp đồng tháng', so_tien: 5000000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan', ngay: daysAgo(5) },
    { doi_tuong: 'Cty TNHH Thiên Phú', ly_do: 'Thu nợ cước vận chuyển', so_tien: 3000000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan', ngay: daysAgo(6) },
    // Tháng -1 (4 phiếu)
    { doi_tuong: 'Cty TNHH Đại Phong', ly_do: 'Thu cước vận chuyển tháng trước', so_tien: 4200000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan', ngay: monthsAgo(1, 25) },
    { doi_tuong: 'Nông Sản Cần Thơ', ly_do: 'Thu cước gửi nông sản đi SG', so_tien: 1800000, vp: vpCT.id, nv: nvKeToanCT.id, ngay: monthsAgo(1, 20) },
    { doi_tuong: 'Chị Mai (cá nhân)', ly_do: 'Thu cước gửi hàng', so_tien: 150000, vp: vpCT.id, nv: nvStaffCT.id, ngay: monthsAgo(1, 15) },
    { doi_tuong: 'Cty TNHH Phú Quốc Express', ly_do: 'Thu cước theo hợp đồng', so_tien: 6500000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan', ngay: monthsAgo(1, 10) },
    // Tháng -2 (3 phiếu)
    { doi_tuong: 'Cty TNHH Tâm An Logistics', ly_do: 'Thu cước tháng 2', so_tien: 3800000, vp: vpSG.id, nv: nvKeToan.id, ngay: monthsAgo(2, 22) },
    { doi_tuong: 'Cửa Hàng Thanh Bình', ly_do: 'Thu cước tuyến CT', so_tien: 920000, vp: vpCT.id, nv: nvKeToanCT.id, ngay: monthsAgo(2, 15) },
    { doi_tuong: 'DNTN Hòa Phát Vận Tải', ly_do: 'Thu cước RG-CT', so_tien: 1100000, vp: vpRG.id, nv: nvStaffRG.id, ngay: monthsAgo(2, 8) },
    // Tháng -3, -4, -5 (mỗi tháng 1-2 phiếu)
    { doi_tuong: 'Cty CP Hoàng Long Phát', ly_do: 'Thu cước quý I', so_tien: 8000000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan', ngay: monthsAgo(3, 20) },
    { doi_tuong: 'Cty TNHH Đại Phong', ly_do: 'Thu cước', so_tien: 2200000, vp: vpSG.id, nv: nvAdmin.id, ngay: monthsAgo(4, 15) },
    { doi_tuong: 'Nông Sản Cần Thơ', ly_do: 'Thu cước vận chuyển', so_tien: 1500000, vp: vpCT.id, nv: nvKeToanCT.id, ngay: monthsAgo(4, 10) },
    { doi_tuong: 'DNTN Minh Phát', ly_do: 'Thu cước vận chuyển', so_tien: 2800000, vp: vpSG.id, nv: nvKeToan.id, ngay: monthsAgo(5, 20) },
    // 1 phiếu bị hủy (demo soft delete)
    { doi_tuong: 'Cty TNHH ABC (ngưng HĐ)', ly_do: 'Thu cước — HỦY do sai thông tin', so_tien: 500000, vp: vpSG.id, nv: nvKeToan.id, da_huy: true, ngay: daysAgo(4) },
  ];

  for (let i = 0; i < ptData.length; i++) {
    const pt = ptData[i];
    await prisma.phieuThu.create({
      data: {
        ma_phieu: `PT-${String(i + 1).padStart(4, '0')}`,
        ngay_thu: pt.ngay,
        doi_tuong: pt.doi_tuong,
        ly_do: pt.ly_do,
        so_tien: pt.so_tien,
        hinh_thuc: pt.hinh_thuc || 'tien_mat',
        van_phong_id: pt.vp,
        nhan_vien_id: pt.nv,
        bien_nhan_id: pt.bn || null,
        da_huy: pt.da_huy || false,
      },
    });
  }
  console.log('  ✅ 20 phiếu thu (19 active + 1 đã hủy)');

  // ══════════════════════════════════════════════════════════════
  // 6. PHIẾU CHI (12) — trải 6 tháng
  //    + 1 phiếu bị hủy
  // ══════════════════════════════════════════════════════════════
  const pcData = [
    // Tháng hiện tại (5)
    { nguoi_nhan: 'Nhà xe Phương Trang', ly_do: 'Chi phí vận chuyển tuyến SG→CT', so_tien: 3500000, vp: vpSG.id, nv: nvAdmin.id, ngay: daysAgo(2) },
    { nguoi_nhan: 'Nhà xe Kumho Samco', ly_do: 'Chi phí vận chuyển tuyến SG→RG', so_tien: 4200000, vp: vpSG.id, nv: nvKeToan.id, ngay: daysAgo(3) },
    { nguoi_nhan: 'FPT Telecom', ly_do: 'Tiền Internet VP Tp.HCM tháng 4/2026', so_tien: 550000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan', ngay: daysAgo(5) },
    { nguoi_nhan: 'Nhân viên bốc xếp - Anh Bảy', ly_do: 'Tiền công bốc xếp hàng tuần', so_tien: 800000, vp: vpCT.id, nv: nvKeToanCT.id, ngay: daysAgo(4) },
    { nguoi_nhan: 'Nhân viên bốc xếp - Anh Tám', ly_do: 'Tiền công bốc xếp RG', so_tien: 500000, vp: vpRG.id, nv: nvStaffRG.id, ngay: daysAgo(1) },
    // Tháng -1 (3)
    { nguoi_nhan: 'Chủ nhà VP Cần Thơ', ly_do: 'Tiền thuê mặt bằng tháng 3/2026', so_tien: 8000000, vp: vpCT.id, nv: nvKeToanCT.id, hinh_thuc: 'chuyen_khoan', ngay: monthsAgo(1, 5) },
    { nguoi_nhan: 'Cửa hàng Văn phòng phẩm Thành Đạt', ly_do: 'Mua giấy in, mực in, bút', so_tien: 350000, vp: vpSG.id, nv: nvAdmin.id, ngay: monthsAgo(1, 12) },
    { nguoi_nhan: 'Nhà xe Phương Trang', ly_do: 'Chi vận chuyển tháng 3', so_tien: 2800000, vp: vpSG.id, nv: nvKeToan.id, ngay: monthsAgo(1, 20) },
    // Tháng -2, -3, -4 (mỗi tháng 1)
    { nguoi_nhan: 'Chủ nhà VP Rạch Giá', ly_do: 'Tiền thuê mặt bằng tháng 2/2026', so_tien: 5000000, vp: vpRG.id, nv: nvStaffRG.id, hinh_thuc: 'chuyen_khoan', ngay: monthsAgo(2, 5) },
    { nguoi_nhan: 'Nhà xe Phương Trang', ly_do: 'Chi vận chuyển tháng 1', so_tien: 3200000, vp: vpSG.id, nv: nvKeToan.id, ngay: monthsAgo(3, 18) },
    { nguoi_nhan: 'Công ty TNHH Bảo hiểm PVI', ly_do: 'Bảo hiểm hàng hóa quý IV/2025', so_tien: 2500000, vp: vpSG.id, nv: nvAdmin.id, hinh_thuc: 'chuyen_khoan', ngay: monthsAgo(4, 10) },
    // 1 phiếu bị hủy
    { nguoi_nhan: 'Nhà xe ABC', ly_do: 'Chi phí vận chuyển — HỦY do trùng', so_tien: 1000000, vp: vpSG.id, nv: nvKeToan.id, da_huy: true, ngay: daysAgo(3) },
  ];

  for (let i = 0; i < pcData.length; i++) {
    const pc = pcData[i];
    await prisma.phieuChi.create({
      data: {
        ma_phieu: `PC-${String(i + 1).padStart(4, '0')}`,
        ngay_chi: pc.ngay,
        nguoi_nhan: pc.nguoi_nhan,
        ly_do: pc.ly_do,
        so_tien: pc.so_tien,
        hinh_thuc: pc.hinh_thuc || 'tien_mat',
        van_phong_id: pc.vp,
        nhan_vien_id: pc.nv,
        da_huy: pc.da_huy || false,
      },
    });
  }
  console.log('  ✅ 12 phiếu chi (11 active + 1 đã hủy)');

  // ══════════════════════════════════════════════════════════════
  // 7. BẢNG KÊ HĐĐT (2) — 1 bảng kê cũ hoàn chỉnh
  //    + BN chờ còn lại cho demo xuất bảng kê
  // ══════════════════════════════════════════════════════════════
  // Bảng kê 1: 5 BN cũ (Phase B, đánh dấu da_vao_bang_ke)
  const bnDaVaoBK = allBienNhan.filter(bn => bn.da_vao_bang_ke); // Phase B đã đánh dấu 5 BN
  if (bnDaVaoBK.length > 0) {
    const tongCuoc1 = bnDaVaoBK.reduce((sum, bn) => sum + Number(bn.gia_cuoc), 0);
    await prisma.bangKe.create({
      data: {
        ma_bang_ke: 'BK-0001',
        ngay_xuat: daysAgo(10),
        so_bien_nhan: bnDaVaoBK.length,
        tong_cuoc: tongCuoc1,
        ten_file: 'BK-0001_20260326.xlsx',
        chi_tiet: {
          create: bnDaVaoBK.map(bn => ({ bien_nhan_id: bn.id })),
        },
      },
    });
  }
  // Còn lại BN có can_xuat_hddt=true, da_vao_bang_ke=false → sẽ thấy trong tab "BN chờ"
  console.log(`  ✅ 1 bảng kê lịch sử (${bnDaVaoBK.length} BN) + ${allBienNhan.filter(b => !b.da_vao_bang_ke && b.can_xuat_hddt).length} BN chờ xuất`);

  // ══════════════════════════════════════════════════════════════
  // 8. LOGIN LOG (15) — demo nhật ký đăng nhập
  // ══════════════════════════════════════════════════════════════
  const loginEntries = [
    { nv: nvAdmin, username: 'admin', action: 'login_success', days: 0 },
    { nv: nvAdmin, username: 'admin', action: 'login_success', days: 1 },
    { nv: nvAdmin, username: 'admin', action: 'login_success', days: 2 },
    { nv: nvKeToan, username: 'ketoan', action: 'login_success', days: 0 },
    { nv: nvKeToan, username: 'ketoan', action: 'login_success', days: 1 },
    { nv: nvStaffSG, username: 'staff_sg', action: 'login_success', days: 0 },
    { nv: nvStaffCT, username: 'staff_ct', action: 'login_success', days: 0 },
    { nv: nvStaffCT, username: 'staff_ct', action: 'login_success', days: 1 },
    { nv: nvStaffRG, username: 'staff_rg', action: 'login_success', days: 0 },
    { nv: nvKeToanCT, username: 'ketoan_ct', action: 'login_success', days: 1 },
    // Login thất bại (demo brute force detection)
    { nv: null, username: 'admin', action: 'login_failed', days: 3 },
    { nv: null, username: 'admin', action: 'login_failed', days: 3 },
    { nv: null, username: 'hacker', action: 'login_failed', days: 2 },
    { nv: null, username: 'test', action: 'login_failed', days: 1 },
    { nv: null, username: 'admin123', action: 'login_failed', days: 0 },
  ];
  for (const entry of loginEntries) {
    await prisma.loginLog.create({
      data: {
        nhan_vien_id: entry.nv?.id || null,
        username: entry.username,
        action: entry.action,
        ip_address: entry.action === 'login_failed' ? `103.${rand(1, 255)}.${rand(1, 255)}.${rand(1, 255)}` : '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: daysAgo(entry.days),
      },
    });
  }
  console.log('  ✅ 15 login logs (10 thành công + 5 thất bại)');

  // ══════════════════════════════════════════════════════════════
  // 9. AUDIT LOG (8) — demo nhật ký thao tác
  // ══════════════════════════════════════════════════════════════
  const auditEntries = [
    { nv: nvStaffSG.id, action: 'CREATE', entity: 'bien_nhan', entityId: allBienNhan[0]?.id, days: 6 },
    { nv: nvStaffCT.id, action: 'CREATE', entity: 'bien_nhan', entityId: allBienNhan[5]?.id, days: 4 },
    { nv: nvAdmin.id, action: 'UPDATE', entity: 'bien_nhan', entityId: allBienNhan[0]?.id, days: 5, old: { gia_cuoc: 50000 }, new_: { gia_cuoc: 80000 } },
    { nv: nvKeToan.id, action: 'CREATE', entity: 'phieu_thu', entityId: 1, days: 1 },
    { nv: nvKeToan.id, action: 'CREATE', entity: 'phieu_thu', entityId: 2, days: 2 },
    { nv: nvAdmin.id, action: 'CREATE', entity: 'phieu_chi', entityId: 1, days: 2 },
    { nv: nvKeToan.id, action: 'DELETE', entity: 'phieu_thu', entityId: 20, days: 4, old: { doi_tuong: 'Cty TNHH ABC', so_tien: 500000 } },
    { nv: nvStaffRG.id, action: 'CREATE', entity: 'bien_nhan', entityId: allBienNhan[8]?.id, days: 3 },
  ];
  for (const a of auditEntries) {
    await prisma.auditLog.create({
      data: {
        nhan_vien_id: a.nv,
        action: a.action,
        entity: a.entity,
        entity_id: a.entityId || null,
        old_data: a.old || null,
        new_data: a.new_ || null,
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: daysAgo(a.days),
      },
    });
  }
  console.log('  ✅ 8 audit logs');

  // ══════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════
  const counts = {
    vanPhong: await prisma.vanPhong.count(),
    nhanVien: await prisma.nhanVien.count(),
    khachHang: await prisma.khachHang.count(),
    bienNhan: await prisma.bienNhan.count(),
    lichSuTrangThai: await prisma.lichSuTrangThai.count(),
    congNo: await prisma.congNo.count(),
    phieuThu: await prisma.phieuThu.count(),
    phieuChi: await prisma.phieuChi.count(),
    bangKe: await prisma.bangKe.count(),
    bangKeChiTiet: await prisma.bangKeChiTiet.count(),
    loginLog: await prisma.loginLog.count(),
    auditLog: await prisma.auditLog.count(),
  };

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       📊 DATABASE SUMMARY            ║');
  console.log('╠══════════════════════════════════════╣');
  for (const [model, count] of Object.entries(counts)) {
    console.log(`║  ${model.padEnd(22)} ${String(count).padStart(6)} ║`);
  }
  console.log('╚══════════════════════════════════════╝');

  console.log('\n🔑 Tài khoản đăng nhập:');
  console.log('   ┌──────────────┬──────────┬─────────────┐');
  console.log('   │ Username     │ Role     │ Văn phòng   │');
  console.log('   ├──────────────┼──────────┼─────────────┤');
  console.log('   │ admin        │ admin    │ VP Tp.HCM   │');
  console.log('   │ ketoan       │ kế toán  │ VP Tp.HCM   │');
  console.log('   │ staff_sg     │ staff    │ VP Tp.HCM   │');
  console.log('   │ staff_ct     │ staff    │ VP Cần Thơ  │');
  console.log('   │ ketoan_ct    │ kế toán  │ VP Cần Thơ  │');
  console.log('   │ staff_rg     │ staff    │ VP Rạch Giá │');
  console.log('   └──────────────┴──────────┴─────────────┘');
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
