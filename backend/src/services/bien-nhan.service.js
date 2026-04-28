import prisma from '../config/database.js';
import { createWithCode } from '../utils/ma-so-generator.js';
import { writeAuditLog } from '../plugins/audit-log.js';

// Whitelist các field được phép sort — tránh injection qua query string
const ALLOWED_SORT_FIELDS = new Set(['created_at', 'ngay_bien_nhan', 'ma_so', 'gia_cuoc']);

// S-02: Whitelist of fields allowed for update
const ALLOWED_UPDATE_FIELDS = [
  'don_vi_gui', 'nguoi_gui', 'dien_thoai_gui', 'so_cccd_gui', 'dia_chi_gui',
  'don_vi_nhan', 'nguoi_nhan', 'dien_thoai_nhan', 'so_cccd_nhan', 'dia_chi_nhan',
  'hang_hoa_json',
  'gia_tri_hang', 'trong_luong',
  'thu_ho', 'gia_cuoc', 'trang_thai_thu', 'can_xuat_hddt',
  'hinh_thuc_giao', 'chanh_id', 'dia_chi_giao',
  'hang_hu_khong_den', 'gio_tao',
];

/**
 * Danh sách biên nhận (filter, search, pagination)
 */
export async function listBienNhan({ van_phong_id, role, search, trang_thai, vp_gui, vp_nhan, from, to, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' }) {
  const safeSortBy    = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const where = {};

  // Staff: chỉ thấy BN liên quan đến VP mình
  if (role === 'staff' && van_phong_id) {
    where.OR = [
      { van_phong_gui_id: van_phong_id },
      { van_phong_nhan_id: van_phong_id },
    ];
  }

  // Filters
  if (trang_thai) where.trang_thai = trang_thai;
  if (vp_gui) where.van_phong_gui_id = Number(vp_gui);
  if (vp_nhan) where.van_phong_nhan_id = Number(vp_nhan);

  if (from || to) {
    where.ngay_bien_nhan = {};
    if (from) where.ngay_bien_nhan.gte = new Date(from);
    if (to)   where.ngay_bien_nhan.lte = new Date(to + 'T23:59:59.999Z');
  }

  if (search) {
    const searchOr = [
      { ma_so: { contains: search, mode: 'insensitive' } },
      { don_vi_gui: { contains: search, mode: 'insensitive' } },
      { don_vi_nhan: { contains: search, mode: 'insensitive' } },
      { nguoi_gui: { contains: search, mode: 'insensitive' } },
      { nguoi_nhan: { contains: search, mode: 'insensitive' } },
      { dien_thoai_gui: { contains: search, mode: 'insensitive' } },
      { dien_thoai_nhan: { contains: search, mode: 'insensitive' } },
      { ten_hang_hoa: { contains: search, mode: 'insensitive' } },
    ];

    if (where.OR) {
      const staffFilter = where.OR;
      delete where.OR;
      where.AND = [
        { OR: staffFilter },
        { OR: searchOr },
      ];
    } else {
      where.OR = searchOr;
    }
  }

  const [data, total] = await Promise.all([
    prisma.bienNhan.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      orderBy: { [safeSortBy]: safeSortOrder },
      include: {
        van_phong_gui: { select: { ma_vp: true, ten: true } },
        van_phong_nhan: { select: { ma_vp: true, ten: true } },
        nhan_vien_nhap: { select: { ten: true } },
        chanh: { select: { id: true, ten: true } },
      },
    }),
    prisma.bienNhan.count({ where }),
  ]);

  return { data, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

/**
 * Chi tiết biên nhận
 */
export async function getBienNhan(id) {
  return prisma.bienNhan.findUnique({
    where: { id },
    include: {
      van_phong_gui: true,
      van_phong_nhan: true,
      nhan_vien_nhap: { select: { ten: true, ma_nv: true } },
      chanh: { select: { id: true, ten: true, dia_chi: true, dien_thoai: true } },
      lich_su_trang_thai: {
        orderBy: { created_at: 'desc' },
        include: { nhan_vien: { select: { ten: true } } },
      },
    },
  });
}

/**
 * Lấy mã biên nhận tiếp theo (preview)
 * Format: SGCT-0001 (tuyến + số thứ tự, reset mỗi ngày)
 * Khoá kết hợp: ngay_bien_nhan + ma_so
 */
export async function getNextMaSo(vpGuiId, vpNhanId, ngayBienNhan) {
  const vpGui = await prisma.vanPhong.findUnique({ where: { id: vpGuiId }, select: { ma_vp: true } });
  const vpNhan = await prisma.vanPhong.findUnique({ where: { id: vpNhanId }, select: { ma_vp: true } });
  if (!vpGui || !vpNhan) throw Object.assign(new Error('VP không tồn tại'), { statusCode: 400 });

  const date = ngayBienNhan ? new Date(ngayBienNhan) : new Date();
  const prefix = `${vpGui.ma_vp}${vpNhan.ma_vp}`;

  // Đếm BN cùng prefix + cùng ngay_bien_nhan để reset số thứ tự theo ngày
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await prisma.bienNhan.count({
    where: {
      ma_so: { startsWith: `${prefix}-` },
      ngay_bien_nhan: { gte: startOfDay, lte: endOfDay },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Tự tạo KH nếu chưa tồn tại.
 */
async function autoCreateKhachHang(tx, tenDonVi, nguoiLienHe, dienThoai, soCccd, diaChi, generateKHCode) {
  if (!tenDonVi?.trim() || !dienThoai?.trim()) return null;

  const normalizedDT = dienThoai.trim();
  const existing = await tx.khachHang.findFirst({
    where: { dien_thoai: normalizedDT },
  });
  if (existing) return null;

  const ma_kh = await generateKHCode();
  // Có đủ 3 trường (Đơn vị + Người LH + SĐT) → doanh nghiệp; chỉ có Tên + SĐT → cá nhân
  const loai_kh = nguoiLienHe?.trim() ? 'doanh_nghiep' : 'ca_nhan';
  await tx.khachHang.create({
    data: {
      ma_kh,
      loai_kh,
      ten_don_vi: tenDonVi.trim(),
      nguoi_lien_he: nguoiLienHe?.trim() || null,
      dien_thoai: normalizedDT,
      so_cccd: soCccd?.trim() || null,
      dia_chi: diaChi?.trim() || null,
    },
  });

  return { ma_kh, ten_don_vi: tenDonVi.trim() };
}

/**
 * Tạo chuỗi mô tả hàng hoá từ hang_hoa_json.
 * VD: [{don_vi:'Kiện', so_luong:2}, {don_vi:'Bao', so_luong:3}] → '2 kiện, 3 bao'
 */
function buildTenHangHoa(hangHoaJson) {
  if (!Array.isArray(hangHoaJson) || hangHoaJson.length === 0) return null;
  return hangHoaJson
    .filter(item => item.so_luong > 0)
    .map(item => `${item.so_luong} ${item.don_vi.toLowerCase()}`)
    .join(', ') || null;
}

/**
 * Build the data object for Prisma bienNhan.create.
 * Extracted to avoid duplication between custom-code and auto-gen paths.
 */
function _buildBienNhanFields(ma_so, ngayBN, data, userId) {
  return {
    ma_so,
    ngay_bien_nhan: ngayBN,
    gio_tao: data.gio_tao || null,
    van_phong_gui:  { connect: { id: data.van_phong_gui_id } },
    van_phong_nhan: { connect: { id: data.van_phong_nhan_id } },
    don_vi_gui: data.don_vi_gui || null,
    nguoi_gui: data.nguoi_gui || null,
    dien_thoai_gui: data.dien_thoai_gui || null,
    dia_chi_gui: data.dia_chi_gui || null,
    so_cccd_gui: data.so_cccd_gui || null,
    don_vi_nhan: data.don_vi_nhan || null,
    nguoi_nhan: data.nguoi_nhan || null,
    dien_thoai_nhan: data.dien_thoai_nhan || null,
    dia_chi_nhan: data.dia_chi_nhan || null,
    so_cccd_nhan: data.so_cccd_nhan || null,
    hang_hoa_json: data.hang_hoa_json || null,
    ten_hang_hoa: buildTenHangHoa(data.hang_hoa_json),
    so_luong: Array.isArray(data.hang_hoa_json)
      ? data.hang_hoa_json.reduce((sum, i) => sum + (Number(i.so_luong) || 0), 0)
      : null,
    nhan_vien_nhap: { connect: { id: userId } },
    gia_tri_hang: data.gia_tri_hang || null,
    trong_luong: data.trong_luong || null,
    thu_ho: data.thu_ho || 0,
    trang_thai_cod: (data.thu_ho && Number(data.thu_ho) > 0) ? 'cho_thu' : 'khong_co',
    gia_cuoc: data.gia_cuoc || 0,
    trang_thai_thu: data.trang_thai_thu || 'da_thu',
    can_xuat_hddt: data.can_xuat_hddt || false,
    hang_hu_khong_den: data.hang_hu_khong_den || false,
    hinh_thuc_giao: data.hinh_thuc_giao ?? undefined, // enum with @default; null not allowed
    chanh_id: data.chanh_id ?? undefined,
    dia_chi_giao: data.dia_chi_giao || null,
  };
}

/**
 * Tạo biên nhận mới
 * Hỗ trợ: ma_so_custom (mã tùy chọn), ngay_bien_nhan (back-dating)
 * B-02: dùng createWithCode pattern để tránh race condition
 */
export async function createBienNhan(data, userId) {
  const vpGui = await prisma.vanPhong.findUnique({ where: { id: data.van_phong_gui_id }, select: { ma_vp: true } });
  const vpNhan = await prisma.vanPhong.findUnique({ where: { id: data.van_phong_nhan_id }, select: { ma_vp: true } });
  if (!vpGui || !vpNhan) throw Object.assign(new Error('VP không tồn tại'), { statusCode: 400 });

  // Ngày biên nhận (cho phép back-dating)
  const ngayBN = data.ngay_bien_nhan ? new Date(data.ngay_bien_nhan) : new Date();
  const prefix = `${vpGui.ma_vp}${vpNhan.ma_vp}`;

  // Nếu có mã custom → validate unique rồi dùng
  if (data.ma_so_custom?.trim()) {
    const customCode = data.ma_so_custom.trim();
    const existing = await prisma.bienNhan.findUnique({ where: { ma_so: customCode } });
    if (existing) {
      throw Object.assign(new Error(`Mã biên nhận "${customCode}" đã tồn tại`), { statusCode: 409 });
    }
    // Tạo trực tiếp với mã custom
    const result = await prisma.$transaction(async (tx) => {
      const bn = await tx.bienNhan.create({ data: _buildBienNhanFields(customCode, ngayBN, data, userId) });
      await _createBienNhanSideEffects(tx, bn, data, userId);
      return { bn, autoCreated: await _autoCreateKH(tx, data) };
    });
    writeAuditLog({ action: 'CREATE', entity: 'bien_nhan', entityId: result.bn.id, newData: result.bn });
    return result;
  }

  // Auto-gen mã: dùng createWithCode pattern
  const result = await createWithCode(
    async (ma_so) => {
      return prisma.$transaction(async (tx) => {
        const bn = await tx.bienNhan.create({ data: _buildBienNhanFields(ma_so, ngayBN, data, userId) });
        await _createBienNhanSideEffects(tx, bn, data, userId);
        return { bn, autoCreated: await _autoCreateKH(tx, data) };
      });
    },
    'bienNhan', 'ma_so', prefix,
  );

  writeAuditLog({ action: 'CREATE', entity: 'bien_nhan', entityId: result.bn.id, newData: result.bn });
  return result;
}

/**
 * Side effects: lịch sử trạng thái + công nợ
 */
async function _createBienNhanSideEffects(tx, bn, data, userId) {
  // Lịch sử trạng thái đầu tiên
  await tx.lichSuTrangThai.create({
    data: {
      bien_nhan_id: bn.id,
      trang_thai_moi: 'cho_vc',
      nhan_vien_id: userId,
      phuong_thuc: 'manual',
      ghi_chu: 'Tạo biên nhận mới',
    },
  });
  // Tự tạo công nợ nếu cần
  if (data.trang_thai_thu === 'cong_no') {
    await tx.congNo.create({
      data: {
        bien_nhan_id: bn.id,
        doi_tuong: data.don_vi_gui || data.nguoi_gui || 'N/A',
        so_tien_no: data.gia_cuoc || 0,
        trang_thai: 'chua_thu',
      },
    });
  }
}

/**
 * Auto-create KH
 */
async function _autoCreateKH(tx, data) {
  const autoCreated = [];
  try {
    // Fix 1.2: dùng id desc thay vì ma_kh desc — sort string không đáng tin
    const generateKHCode = async () => {
      const last = await tx.khachHang.findFirst({
        where: { ma_kh: { startsWith: 'KH-' } },
        orderBy: { id: 'desc' },
        select: { ma_kh: true },
      });
      let nextNum = 1;
      if (last) {
        const num = parseInt(last.ma_kh.split('-').pop(), 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
      return `KH-${String(nextNum).padStart(4, '0')}`;
    };
    // Fix 3.4: loop thay vì duplicate code
    const parties = [
      [data.don_vi_gui,  data.nguoi_gui,  data.dien_thoai_gui,  data.so_cccd_gui,  data.dia_chi_gui],
      [data.don_vi_nhan, data.nguoi_nhan, data.dien_thoai_nhan, data.so_cccd_nhan, data.dia_chi_nhan],
    ];
    for (const [donVi, nguoiLienHe, dienThoai, soCccd, diaChi] of parties) {
      const kh = await autoCreateKhachHang(tx, donVi, nguoiLienHe, dienThoai, soCccd, diaChi, generateKHCode);
      if (kh) autoCreated.push(kh);
    }
  } catch (err) {
    console.warn('[Auto-create KH]', err.message);
  }
  return autoCreated;
}

/**
 * Cập nhật biên nhận
 * S-02: Whitelist fields (no blacklist spread)
 * S-07: Staff chỉ sửa trong 24h
 * Staff: chỉ sửa BN do mình tạo
 */
export async function updateBienNhan(id, data, userId, userRole) {
  const existing = await prisma.bienNhan.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });

  // Staff chỉ sửa BN mình tạo
  if (userRole === 'staff' && existing.nhan_vien_nhap_id !== userId) {
    throw Object.assign(new Error('Bạn chỉ được sửa biên nhận do mình tạo'), { statusCode: 403 });
  }

  // S-07: Staff chỉ sửa trong 24h
  if (userRole === 'staff') {
    const hoursSinceCreated = (Date.now() - new Date(existing.created_at).getTime()) / 3600000;
    if (hoursSinceCreated > 24) {
      throw Object.assign(
        new Error('Biên nhận đã quá 24 giờ. Liên hệ Admin để sửa.'),
        { statusCode: 403 },
      );
    }
  }

  // S-02: Whitelist — only pick allowed fields from request body
  const updateData = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  // Nếu cập nhật hang_hoa_json → rebuild ten_hang_hoa & so_luong
  if (updateData.hang_hoa_json !== undefined) {
    updateData.ten_hang_hoa = buildTenHangHoa(updateData.hang_hoa_json);
    updateData.so_luong = Array.isArray(updateData.hang_hoa_json)
      ? updateData.hang_hoa_json.reduce((sum, i) => sum + (Number(i.so_luong) || 0), 0)
      : null;
  }

  // Auto-update trang_thai_cod khi thu_ho thay đổi
  if (updateData.thu_ho !== undefined) {
    const newThuHo = Number(updateData.thu_ho) || 0;
    const oldThuHo = Number(existing.thu_ho) || 0;
    if (oldThuHo === 0 && newThuHo > 0) {
      updateData.trang_thai_cod = 'cho_thu';
    } else if (oldThuHo > 0 && newThuHo === 0) {
      // Chỉ reset nếu COD chưa bắt đầu xử lý
      if (existing.trang_thai_cod === 'cho_thu') {
        updateData.trang_thai_cod = 'khong_co';
      } else if (['da_thu', 'da_chuyen', 'da_tra'].includes(existing.trang_thai_cod)) {
        // COD đang xử lý → KHÔNG cho xóa thu_ho
        throw Object.assign(
          new Error('Không thể xóa tiền thu hộ khi COD đang được xử lý'),
          { statusCode: 400 },
        );
      }
    }
  }

  const updated = await prisma.bienNhan.update({ where: { id }, data: updateData });

  // Audit log: UPDATE
  writeAuditLog({
    action: 'UPDATE',
    entity: 'bien_nhan',
    entityId: id,
    oldData: existing,
    newData: updateData,
  });

  return updated;
}

/**
 * Xóa biên nhận
 * Staff: chỉ xóa BN mình tạo + trong 24h
 * Admin: xóa bất kỳ
 */
export async function deleteBienNhan(id, userId, userRole) {
  const existing = await prisma.bienNhan.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });

  // Staff: chỉ xóa BN mình tạo
  if (userRole === 'staff' && existing.nhan_vien_nhap_id !== userId) {
    throw Object.assign(new Error('Bạn chỉ được xóa biên nhận do mình tạo'), { statusCode: 403 });
  }

  // Staff: chỉ xóa trong 24h
  if (userRole === 'staff') {
    const hoursSinceCreated = (Date.now() - new Date(existing.created_at).getTime()) / 3600000;
    if (hoursSinceCreated > 24) {
      throw Object.assign(new Error('Biên nhận đã quá 24 giờ. Liên hệ Admin để xóa.'), { statusCode: 403 });
    }
  }

  // Không cho xóa BN đã vào bảng kê
  if (existing.da_vao_bang_ke) {
    throw Object.assign(new Error('Biên nhận đã vào bảng kê, không thể xóa'), { statusCode: 400 });
  }

  // Không cho xóa BN có COD đang xử lý (đã thu/đã chuyển có PhieuThu/PhieuChi liên quan)
  if (['da_thu', 'da_chuyen', 'da_tra'].includes(existing.trang_thai_cod)) {
    throw Object.assign(
      new Error('Biên nhận có COD đang xử lý hoặc đã hoàn tất, không thể xóa. Liên hệ Admin.'),
      { statusCode: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    // Xóa lịch sử trạng thái
    await tx.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: id } });
    // Xóa công nợ liên quan
    await tx.congNo.deleteMany({ where: { bien_nhan_id: id } });
    // Xóa phiếu thu liên quan (COD cho_thu chưa tạo PhieuThu, nhưng phòng trường hợp nhất quán)
    await tx.phieuThu.deleteMany({ where: { bien_nhan_id: id } });
    // Xóa biên nhận
    await tx.bienNhan.delete({ where: { id } });
  });

  writeAuditLog({ action: 'DELETE', entity: 'bien_nhan', entityId: id, oldData: existing });
}
