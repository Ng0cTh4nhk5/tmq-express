import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper: ngày N ngày trước
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

// Helper: ngày N tháng trước
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(5 + Math.floor(Math.random() * 20));
  d.setHours(9, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🧹 Cleaning database...');
  // Xóa theo thứ tự quan hệ
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

  // Reset auto-increment sequences để ID luôn bắt đầu từ 1
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE van_phong_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE nhan_vien_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE khach_hang_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE bien_nhan_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE lich_su_trang_thai_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE bang_ke_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE bang_ke_chi_tiet_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE phieu_thu_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE phieu_chi_id_seq RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE cong_no_id_seq RESTART WITH 1`);

  console.log('🌱 Seeding database...');

  // ══════════════════════════════════════
  // VĂN PHÒNG (3)
  // ══════════════════════════════════════
  const vpSG = await prisma.vanPhong.create({
    data: { ma_vp: 'SG', ten: 'VP Tp.HCM', dia_chi: '491 Lê Hồng Phong, Q10, HCM', dien_thoai: '(028) 383.338.79' },
  });
  const vpCT = await prisma.vanPhong.create({
    data: { ma_vp: 'CT', ten: 'VP Cần Thơ', dia_chi: '20 Đại lộ Hòa Bình, Q.Ninh Kiều, CT', dien_thoai: '(0292) 222.333' },
  });
  const vpRG = await prisma.vanPhong.create({
    data: { ma_vp: 'RG', ten: 'VP Rạch Giá', dia_chi: '15 Nguyễn Trung Trực, TP Rạch Giá', dien_thoai: '(0297) 444.555' },
  });
  console.log('  ✅ 3 văn phòng');

  // ══════════════════════════════════════
  // NHÂN VIÊN (6)
  // ══════════════════════════════════════
  const hash = await bcrypt.hash('Tmq@1234', 10);
  const nvData = [
    { ma_nv: 'NV-SG-001', ten: 'Admin TMQ', van_phong_id: vpSG.id, role: 'admin', username: 'admin' },
    { ma_nv: 'NV-SG-002', ten: 'Kế Toán TMQ', van_phong_id: vpSG.id, role: 'accountant', username: 'ketoan' },
    { ma_nv: 'NV-CT-001', ten: 'Nhân viên Cần Thơ', van_phong_id: vpCT.id, role: 'staff', username: 'staff_ct' },
    { ma_nv: 'NV-RG-001', ten: 'Nhân viên Rạch Giá', van_phong_id: vpRG.id, role: 'staff', username: 'staff_rg' },
    { ma_nv: 'NV-CT-002', ten: 'Kế Toán Cần Thơ', van_phong_id: vpCT.id, role: 'accountant', username: 'ketoan_ct' },
    { ma_nv: 'NV-SG-003', ten: 'Nhân viên Sài Gòn', van_phong_id: vpSG.id, role: 'staff', username: 'staff_sg' },
  ];
  const nvList = [];
  for (const u of nvData) {
    const nv = await prisma.nhanVien.create({ data: { ...u, password_hash: hash } });
    nvList.push(nv);
  }
  const [nvAdmin, nvKeToan, nvStaffCT, nvStaffRG, nvKeToanCT, nvStaffSG] = nvList;
  console.log('  ✅ 6 nhân viên');

  // ══════════════════════════════════════
  // KHÁCH HÀNG (10)
  // ══════════════════════════════════════
  const customers = [
    { ma_kh: 'KH-001', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Tâm An', nguoi_lien_he: 'Nguyễn Tâm', dien_thoai: '0901234567', dia_chi: '123 Nguyễn Trãi, Q5, HCM' },
    { ma_kh: 'KH-002', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty CP Hoàng Long', nguoi_lien_he: 'Trần Long', dien_thoai: '0912345678', dia_chi: '456 Lê Lợi, Q1, HCM' },
    { ma_kh: 'KH-003', loai_kh: 'doanh_nghiep', ten_don_vi: 'DNTN Minh Phát', nguoi_lien_he: 'Lê Minh', dien_thoai: '0923456789', dia_chi: '789 3/2, Q10, HCM' },
    { ma_kh: 'KH-004', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Phú Quốc Express', nguoi_lien_he: 'Phạm Quốc', dien_thoai: '0934567890', dia_chi: '12 Trần Hưng Đạo, PQ' },
    { ma_kh: 'KH-005', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cửa Hàng Thanh Bình', nguoi_lien_he: 'Võ Bình', dien_thoai: '0945678901', dia_chi: '34 Nguyễn Huệ, CT' },
    { ma_kh: 'KH-006', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Đại Phong', nguoi_lien_he: 'Đặng Phong', dien_thoai: '0956789012', dia_chi: '56 CMT8, Q3, HCM' },
    { ma_kh: 'KH-007', loai_kh: 'doanh_nghiep', ten_don_vi: 'DNTN Hòa Phát Logistics', nguoi_lien_he: 'Trương Hòa', dien_thoai: '0967890123', dia_chi: '78 Hùng Vương, RG' },
    { ma_kh: 'KH-008', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty CP Sao Việt', nguoi_lien_he: 'Lý Việt', dien_thoai: '0978901234', dia_chi: '90 Pasteur, Q1, HCM', ma_so_thue: '0312345678' },
    { ma_kh: 'KH-009', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cửa Hàng Vật Tư Nông Nghiệp Cần Thơ', nguoi_lien_he: 'Huỳnh Nông', dien_thoai: '0989012345', dia_chi: '12 30/4, CT' },
    { ma_kh: 'KH-010', loai_kh: 'doanh_nghiep', ten_don_vi: 'Cty TNHH Thiên Phú', nguoi_lien_he: 'Ngô Phú', dien_thoai: '0990123456', dia_chi: '34 Lê Duẩn, Q1, HCM', ma_so_thue: '0398765432' },
  ];
  for (const c of customers) {
    await prisma.khachHang.create({ data: c });
  }
  console.log('  ✅ 10 khách hàng');

  // ══════════════════════════════════════
  // BIÊN NHẬN (30) - 6 tuyến × 5 BN
  // ══════════════════════════════════════
  const trangThaiFlow = ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'];

  // Mỗi tuyến: [vpGui, vpNhan, nvNhap]
  const routes = [
    { vpGui: vpSG, vpNhan: vpCT, nv: nvStaffSG },
    { vpGui: vpCT, vpNhan: vpSG, nv: nvStaffCT },
    { vpGui: vpSG, vpNhan: vpRG, nv: nvAdmin },
    { vpGui: vpRG, vpNhan: vpSG, nv: nvStaffRG },
    { vpGui: vpCT, vpNhan: vpRG, nv: nvStaffCT },
    { vpGui: vpRG, vpNhan: vpCT, nv: nvStaffRG },
  ];

  const hangHoaList = [
    'Linh kiện điện tử', 'Vải may mặc', 'Phụ tùng xe máy', 'Mỹ phẩm', 'Thực phẩm khô',
    'Đồ gia dụng', 'Sách vở văn phòng phẩm', 'Thuốc tây', 'Giày dép', 'Nông sản',
    'Thiết bị y tế', 'Quần áo thời trang', 'Phụ kiện điện thoại', 'Đồ chơi trẻ em', 'Hàng tạp hóa',
    'Máy tính xách tay', 'Dụng cụ cơ khí', 'Hóa chất công nghiệp', 'Đồ nội thất', 'Hải sản đông lạnh',
    'Gạo nếp cẩm', 'Trái cây miền Tây', 'Kẹo bánh Tết', 'Rượu vang nhập khẩu', 'Đèn LED trang trí',
    'Áo mưa', 'Giỏ trái cây', 'Hạt điều rang muối', 'Dây cáp điện', 'Nước mắm Phú Quốc',
  ];

  const cuocList = [50000, 80000, 120000, 150000, 200000, 250000, 350000, 500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000];

  const allBienNhan = [];
  let bnIndex = 0;

  for (let r = 0; r < routes.length; r++) {
    const { vpGui, vpNhan, nv } = routes[r];
    const prefix = `${vpGui.ma_vp}${vpNhan.ma_vp}`;

    for (let i = 0; i < 5; i++) {
      const idx = bnIndex++;
      const trangThaiIdx = i; // 0-4 maps to 5 statuses
      const trangThai = trangThaiFlow[trangThaiIdx];
      const ngayNhan = daysAgo(6 - i); // spread across 7 days
      const cuoc = cuocList[idx % cuocList.length];
      const khIdx = idx % customers.length;

      // Thanh toán: index 3,4 trong mỗi tuyến = công nợ, còn lại = đã thu
      const isCongNo = i >= 3 && (r % 3 === 0 || i === 4);
      const trangThaiThu = isCongNo ? 'cong_no' : 'da_thu';

      // 5-6 BN cần xuất HĐĐT (cho test bảng kê)
      const canXuatHddt = idx < 8;

      const bn = await prisma.bienNhan.create({
        data: {
          ma_so: `${prefix}-${String(i + 1).padStart(4, '0')}`,
          ngay_nhan: ngayNhan,
          van_phong_gui_id: vpGui.id,
          van_phong_nhan_id: vpNhan.id,
          nhan_vien_nhap_id: nv.id,
          don_vi_gui: customers[khIdx].ten_don_vi,
          nguoi_gui: customers[khIdx].nguoi_lien_he,
          dien_thoai_gui: customers[khIdx].dien_thoai,
          dia_chi_gui: customers[khIdx].dia_chi,
          don_vi_nhan: customers[(khIdx + 3) % 10].ten_don_vi,
          nguoi_nhan: customers[(khIdx + 3) % 10].nguoi_lien_he,
          dien_thoai_nhan: customers[(khIdx + 3) % 10].dien_thoai,
          dia_chi_nhan: customers[(khIdx + 3) % 10].dia_chi,
          ten_hang_hoa: hangHoaList[idx],
          gia_tri_hang: cuoc * 5,
          trong_luong: (1 + Math.random() * 50).toFixed(2),
          thu_ho: i % 3 === 0 ? cuoc * 2 : 0,
          gia_cuoc: cuoc,
          trang_thai: trangThai,
          trang_thai_thu: trangThaiThu,
          can_xuat_hddt: canXuatHddt,
          da_vao_bang_ke: false,
          hinh_thuc_giao: ['tan_noi', 'goi_dien', 'tu_toi'][i % 3],
          created_at: ngayNhan,
          updated_at: ngayNhan,
        },
      });

      allBienNhan.push(bn);

      // Lịch sử trạng thái: ghi log từ cho_vc đến trạng thái hiện tại
      for (let s = 0; s <= trangThaiIdx; s++) {
        const logDate = new Date(ngayNhan);
        logDate.setHours(logDate.getHours() + s * 4);
        await prisma.lichSuTrangThai.create({
          data: {
            bien_nhan_id: bn.id,
            trang_thai_cu: s === 0 ? null : trangThaiFlow[s - 1],
            trang_thai_moi: trangThaiFlow[s],
            nhan_vien_id: nv.id,
            phuong_thuc: s === 0 ? 'manual' : (s > 2 ? 'manual' : 'batch'),
            ghi_chu: s === 0 ? 'Tạo biên nhận mới' : `Cập nhật trạng thái`,
            created_at: logDate,
          },
        });
      }

      // Tạo CongNo nếu là công nợ
      if (isCongNo) {
        await prisma.congNo.create({
          data: {
            bien_nhan_id: bn.id,
            doi_tuong: customers[khIdx].ten_don_vi,
            so_tien_no: cuoc,
            ngay_phat_sinh: ngayNhan,
            trang_thai: 'chua_thu',
          },
        });
      }
    }
  }
  console.log(`  ✅ ${allBienNhan.length} biên nhận + lịch sử trạng thái + công nợ`);

  // ══════════════════════════════════════
  // PHIẾU THU (10)
  // ══════════════════════════════════════
  const ptData = [
    { doi_tuong: 'Cty TNHH Tâm An', ly_do: 'Thu cước vận chuyển', so_tien: 500000, vp: vpSG.id, nv: nvKeToan.id, bn: allBienNhan[0].id },
    { doi_tuong: 'Cty CP Hoàng Long', ly_do: 'Thu cước BN SGCT-0002', so_tien: 800000, vp: vpSG.id, nv: nvKeToan.id, bn: allBienNhan[1].id },
    { doi_tuong: 'DNTN Minh Phát', ly_do: 'Thu tiền hàng gửi', so_tien: 1200000, vp: vpSG.id, nv: nvAdmin.id },
    { doi_tuong: 'Cửa Hàng Thanh Bình', ly_do: 'Thu cước tuyến CT-SG', so_tien: 350000, vp: vpCT.id, nv: nvKeToanCT.id, bn: allBienNhan[5].id },
    { doi_tuong: 'Cty TNHH Đại Phong', ly_do: 'Thu nợ cước tháng trước', so_tien: 2500000, vp: vpSG.id, nv: nvKeToan.id },
    { doi_tuong: 'DNTN Hòa Phát Logistics', ly_do: 'Thu cước BN RGSSG', so_tien: 750000, vp: vpRG.id, nv: nvStaffRG.id, bn: allBienNhan[15].id },
    { doi_tuong: 'Cty CP Sao Việt', ly_do: 'Thu phí dịch vụ', so_tien: 1000000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan' },
    { doi_tuong: 'Nguyễn Tâm', ly_do: 'Thu tiền thu hộ', so_tien: 3000000, vp: vpSG.id, nv: nvAdmin.id },
    { doi_tuong: 'Cty TNHH Thiên Phú', ly_do: 'Thu cước vận chuyển hàng hóa', so_tien: 5000000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan' },
    { doi_tuong: 'Cửa Hàng Vật Tư Nông Nghiệp CT', ly_do: 'Thu cước gửi hàng', so_tien: 200000, vp: vpCT.id, nv: nvKeToanCT.id },
  ];

  for (let i = 0; i < ptData.length; i++) {
    const pt = ptData[i];
    await prisma.phieuThu.create({
      data: {
        ma_phieu: `PT-${String(i + 1).padStart(4, '0')}`,
        ngay_thu: daysAgo(6 - (i % 7)),
        doi_tuong: pt.doi_tuong,
        ly_do: pt.ly_do,
        so_tien: pt.so_tien,
        hinh_thuc: pt.hinh_thuc || 'tien_mat',
        van_phong_id: pt.vp,
        nhan_vien_id: pt.nv,
        bien_nhan_id: pt.bn || null,
      },
    });
  }
  console.log('  ✅ 10 phiếu thu');

  // ══════════════════════════════════════
  // PHIẾU CHI (6)
  // ══════════════════════════════════════
  const pcData = [
    { nguoi_nhan: 'Nhà xe Phương Trang', ly_do: 'Chi phí vận chuyển tuyến SG-CT', so_tien: 1500000, vp: vpSG.id, nv: nvAdmin.id },
    { nguoi_nhan: 'Nhà xe Kumho', ly_do: 'Chi phí vận chuyển tuyến SG-RG', so_tien: 2000000, vp: vpSG.id, nv: nvKeToan.id },
    { nguoi_nhan: 'FPT Telecom', ly_do: 'Chi phí Internet tháng 3', so_tien: 500000, vp: vpSG.id, nv: nvKeToan.id, hinh_thuc: 'chuyen_khoan' },
    { nguoi_nhan: 'Chủ nhà VP Cần Thơ', ly_do: 'Tiền thuê mặt bằng tháng 4', so_tien: 8000000, vp: vpCT.id, nv: nvKeToanCT.id, hinh_thuc: 'chuyen_khoan' },
    { nguoi_nhan: 'Nhân viên bốc xếp', ly_do: 'Tiền công bốc xếp hàng hóa', so_tien: 300000, vp: vpRG.id, nv: nvStaffRG.id },
    { nguoi_nhan: 'Cửa hàng văn phòng phẩm', ly_do: 'Mua giấy in, mực in', so_tien: 150000, vp: vpSG.id, nv: nvAdmin.id },
  ];

  for (let i = 0; i < pcData.length; i++) {
    const pc = pcData[i];
    await prisma.phieuChi.create({
      data: {
        ma_phieu: `PC-${String(i + 1).padStart(4, '0')}`,
        ngay_chi: daysAgo(5 - (i % 6)),
        nguoi_nhan: pc.nguoi_nhan,
        ly_do: pc.ly_do,
        so_tien: pc.so_tien,
        hinh_thuc: pc.hinh_thuc || 'tien_mat',
        van_phong_id: pc.vp,
        nhan_vien_id: pc.nv,
      },
    });
  }
  console.log('  ✅ 6 phiếu chi');

  // ══════════════════════════════════════
  // BẢNG KÊ HĐĐT (1) – chỉ tạo record, không tạo file Excel
  // ══════════════════════════════════════
  // Lấy 3 BN đầu tiên có can_xuat_hddt=true để đánh dấu đã vào bảng kê
  const bnForBK = allBienNhan.filter(bn => bn.id <= allBienNhan[2].id);
  const tongCuocBK = bnForBK.reduce((sum, bn) => sum + Number(bn.gia_cuoc), 0);

  const bangKe = await prisma.bangKe.create({
    data: {
      ma_bang_ke: 'BK-0001',
      so_bien_nhan: bnForBK.length,
      tong_cuoc: tongCuocBK,
      ten_file: 'BK-0001_seed.xlsx',
      chi_tiet: {
        create: bnForBK.map(bn => ({ bien_nhan_id: bn.id })),
      },
    },
  });

  // Đánh dấu BN đã vào bảng kê
  await prisma.bienNhan.updateMany({
    where: { id: { in: bnForBK.map(bn => bn.id) } },
    data: { da_vao_bang_ke: true },
  });

  console.log('  ✅ 1 bảng kê (3 BN)');

  // ══════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════
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
  };
  console.log('\n📊 Database summary:');
  for (const [model, count] of Object.entries(counts)) {
    console.log(`   ${model}: ${count}`);
  }
  console.log('\n🔑 Accounts: admin / staff_ct / staff_rg / staff_sg / ketoan / ketoan_ct — Password: Tmq@1234');
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
