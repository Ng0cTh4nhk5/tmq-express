import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed18BienNhan() {
  console.log('🧹 Xóa dữ liệu biên nhận cũ...');
  await prisma.lichSuTrangThai.deleteMany();
  await prisma.bienNhan.deleteMany();
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE bien_nhan_id_seq RESTART WITH 1`);

  // Lấy các tham chiếu cần thiết
  const vpSG = await prisma.vanPhong.findUnique({ where: { ma_vp: 'SG' } });
  const vpCT = await prisma.vanPhong.findUnique({ where: { ma_vp: 'CT' } });
  const nvSG = await prisma.nhanVien.findFirst({ where: { van_phong_id: vpSG.id, role: 'staff' } });
  
  const chanhData = await prisma.chanh.findFirst({ where: { active: true } });
  
  const sender = await prisma.khachHang.findUnique({ where: { ma_kh: 'KH-001' } });
  const recipient = await prisma.khachHang.findUnique({ where: { ma_kh: 'KH-010' } });

  const thu_list = ['da_thu', 'chua_thu', 'cong_no'];
  const giao_list = ['tan_noi', 'goi_dien', 'tu_toi'];
  const cod_list = [false, true];

  const combinations = [];
  
  for (const has_cod of cod_list) {
    let chanh_toggle = has_cod ? 1 : 0;
    for (const thu of thu_list) {
      for (const giao of giao_list) {
        const has_chanh = chanh_toggle % 2 === 1;
        combinations.push({
          thu, giao, has_cod, has_chanh
        });
        chanh_toggle++;
      }
    }
  }

  console.log(`Bắt đầu tạo ${combinations.length} biên nhận...`);
  const today = new Date();
  let index = 1;

  for (const combo of combinations) {
    const ma_so = `TC-${String(index).padStart(2, '0')}`;
    
    // Xây dựng payload dựa trên logic
    const fields = {
      ma_so,
      ngay_bien_nhan: today,
      van_phong_gui_id: vpSG.id,
      van_phong_nhan_id: vpCT.id,
      nhan_vien_nhap_id: nvSG.id,
      
      // Dữ liệu người gửi (từ KH-001)
      don_vi_gui: sender.ten_don_vi,
      nguoi_gui: sender.nguoi_lien_he,
      dien_thoai_gui: sender.dien_thoai,
      dia_chi_gui: sender.dia_chi,
      so_cccd_gui: sender.so_cccd,

      // Dữ liệu người nhận (từ KH-010)
      don_vi_nhan: recipient.ten_don_vi,
      nguoi_nhan: recipient.nguoi_lien_he,
      dien_thoai_nhan: recipient.dien_thoai,
      dia_chi_nhan: recipient.dia_chi,
      so_cccd_nhan: recipient.so_cccd,

      // Thông tin hàng hoá mặc định
      ten_hang_hoa: 'Hàng Test',
      hang_hoa_json: [{ don_vi: 'Thùng', so_luong: 1, ghi_chu: '' }],
      gia_tri_hang: 1000000,
      trong_luong: 10,
      gia_cuoc: 150000,
      trang_thai: 'cho_vc',
      can_xuat_hddt: false,
      da_vao_bang_ke: false,
      hang_hu_khong_den: false,

      // Logic các trường
      trang_thai_thu: combo.thu,
      hinh_thuc_giao: combo.giao,
    };

    // Logic chành
    if (combo.has_chanh && chanhData) {
      fields.chanh_id = chanhData.id;
      if (combo.giao === 'tan_noi') {
        fields.dia_chi_giao = 'Địa chỉ giao chành test';
      }
    }

    // Logic COD
    if (combo.has_cod) {
      fields.thu_ho = 2000000;
      fields.trang_thai_cod = 'cho_thu';
    } else {
      fields.thu_ho = 0;
      fields.trang_thai_cod = 'khong_co';
    }

    // Logic Cước nhận
    if (combo.thu === 'chua_thu') {
      fields.trang_thai_cuoc_nhan = 'cho_thu';
    }

    await prisma.bienNhan.create({ data: fields });
    
    // Nếu là công nợ, tạo bảng ghi công nợ tương ứng như trong seed cũ
    if (combo.thu === 'cong_no') {
      const bn = await prisma.bienNhan.findFirst({ where: { ma_so } });
      await prisma.congNo.create({
        data: {
          bien_nhan_id: bn.id,
          doi_tuong: bn.don_vi_gui,
          so_tien_no: bn.gia_cuoc,
          ngay_phat_sinh: bn.ngay_bien_nhan,
          trang_thai: 'chua_thu',
        }
      });
    }

    console.log(`✅ Đã tạo ${ma_so} | Thu: ${combo.thu} | Giao: ${combo.giao} | Chành: ${combo.has_chanh} | COD: ${combo.has_cod}`);
    index++;
  }

  console.log('🎉 Hoàn tất tạo 18 biên nhận!');
}

seed18BienNhan()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
