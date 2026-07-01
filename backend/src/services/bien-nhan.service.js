import prisma from '../config/database.js';
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
  'hinh_thuc_giao', 'chanh_id', 'dia_chi_giao', // chanh_id handled specially below
  'hang_hu_khong_den', 'gio_tao',
  'kh_gui_id', 'kh_nhan_id', // [NV-3b] liên kết KH tùy chọn
];

/**
 * [NT-01] Kiểm tra đơn nội thành: VP gửi và VP nhận là cùng một văn phòng.
 * Khi đúng → sinh prefix NT{VP}, set trang_thai ban đầu = 'da_den_kho'.
 */
function _isNoiThanh(vpGuiId, vpNhanId) {
  return Number(vpGuiId) === Number(vpNhanId);
}

/**
 * Danh sách biên nhận (filter, search, pagination)
 */
export async function listBienNhan({ van_phong_id, role, search, trang_thai, vp_gui, vp_nhan, from, to, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' }) {
  const safeSortBy    = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  const p = parseInt(page, 10) || 1;
  const l = Math.min(parseInt(limit, 10) || 20, 100);
  const where = {};

  // Staff: chỉ thấy BN liên quan đến VP mình — scope được enforce qua OR condition
  if (role === 'staff' && van_phong_id) {
    const staffScope = { OR: [
      { van_phong_gui_id: van_phong_id },
      { van_phong_nhan_id: van_phong_id },
    ] };

    // [N-H01 FIX] Kết hợp staff scope với filter vp_gui/vp_nhan (nếu user chọn)
    // bằng AND — đảm bảo staff không thể xem BN ngoài phạm vi VP mình,
    // đồng thời filter VP gửi/VP nhận vẫn có hiệu lực.
    const extraFilters = [];
    if (vp_gui)  extraFilters.push({ van_phong_gui_id:  Number(vp_gui) });
    if (vp_nhan) extraFilters.push({ van_phong_nhan_id: Number(vp_nhan) });

    if (extraFilters.length > 0) {
      where.AND = [staffScope, ...extraFilters];
    } else {
      where.OR = staffScope.OR;
    }
  } else {
    // Admin / accountant: áp dụng filter từ query trực tiếp
    if (vp_gui)  where.van_phong_gui_id  = Number(vp_gui);
    if (vp_nhan) where.van_phong_nhan_id = Number(vp_nhan);
  }

  // Filters áp dụng cho tất cả roles
  if (trang_thai) where.trang_thai = trang_thai;

  if (from || to) {
    where.ngay_bien_nhan = {};
    // [SVC-01] Dùng +07:00 để khớp với giờ VN, tránh lệch 7h khi server chạy UTC
    if (from) where.ngay_bien_nhan.gte = new Date(from + 'T00:00:00.000+07:00');
    if (to)   where.ngay_bien_nhan.lte = new Date(to   + 'T23:59:59.999+07:00');
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

    if (where.AND) {
      // Staff với VP filter: where.AND đã có [staffScope, ...extraFilters]
      // Thêm search condition vào AND
      where.AND.push({ OR: searchOr });
    } else if (where.OR) {
      // Staff không có VP filter: where.OR là staffScope
      const staffFilter = where.OR;
      delete where.OR;
      where.AND = [
        { OR: staffFilter },
        { OR: searchOr },
      ];
    } else {
      // Admin/accountant: set OR trực tiếp
      where.OR = searchOr;
    }
  }

  const [data, total] = await Promise.all([
    prisma.bienNhan.findMany({
      where,
      skip: (p - 1) * l,
      take: l,
      // [S-01] Array orderBy: primary sort theo user chọn, tiebreaker là created_at DESC
      // → đảm bảo BN tạo sau luôn nằm trên khi cùng ngày/cùng giá trị sort field
      orderBy: safeSortBy === 'created_at'
        ? [{ created_at: safeSortOrder }]
        : [{ [safeSortBy]: safeSortOrder }, { created_at: 'desc' }],
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
        // [M-02 FIX] Giới hạn 20 bản ghi lịch sử gần nhất để tránh load
        // quá nhiều dữ liệu cho BN lâu năm qua nhiều tay
        take: 20,
        include: { nhan_vien: { select: { ten: true } } },
      },
      // [View] Trả về thông tin công nợ để hiển thị "nợ bên nào"
      cong_no: {
        select: { id: true, vai_tro: true, doi_tuong: true, trang_thai: true, so_tien_no: true },
        take: 1,
      },
    },
  });
}

/**
 * Helper nội bộ: đếm BN cùng prefix + cùng ngày (để tính số thứ tự tiếp theo).
 * Tách ra để getNextMaSo và createBienNhan dùng chung — tránh drift khi sửa business rule.
 * @param {PrismaClient|TransactionClient} client  — prisma hoặc tx bên trong transaction
 * @param {string} prefix  — VD: "SGCT"
 * @param {Date}   date    — ngày biên nhận
 */
async function _countBNByPrefixAndDate(client, prefix, date) {
  // [C-02] Extract ngày theo VN timezone (+07:00) — tránh sai 1 ngày khi server chạy UTC
  // VD: BN tạo lúc 17:30 UTC = 00:30 VN ngày hôm sau → phải tính là ngày hôm sau VN
  const d = date instanceof Date ? date : new Date(date);
  // Lấy date string theo giờ VN bằng cách dùng toLocaleDateString với timeZone
  const vnDateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }); // "YYYY-MM-DD"
  const startOfDay = new Date(`${vnDateStr}T00:00:00.000+07:00`);
  const endOfDay   = new Date(`${vnDateStr}T23:59:59.999+07:00`);
  return client.bienNhan.count({
    where: {
      ma_so: { startsWith: `${prefix}-` },
      ngay_bien_nhan: { gte: startOfDay, lte: endOfDay },
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
  // [NT-01] Đơn nội thành dùng prefix NT{VP} để tránh nhầm lẫn với tuyến liên VP
  const prefix = _isNoiThanh(vpGuiId, vpNhanId)
    ? `NT${vpGui.ma_vp}`
    : `${vpGui.ma_vp}${vpNhan.ma_vp}`;
  const count = await _countBNByPrefixAndDate(prisma, prefix, date);
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

  const ma_kh = generateKHCode(); // [H-06] sync call — generateKHCode không còn là async
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
/**
 * @param {boolean} noiThanh - true khi VP gửi = VP nhận (đơn nội thành)
 *   → override trang_thai = 'da_den_kho' (bỏ qua giai đoạn vận chuyển liên tỉnh)
 */
function _buildBienNhanFields(ma_so, ngayBN, data, userId, noiThanh = false) {
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
    // [CuocNhan] Nếu cước chưa thu thì khởi tạo state máy trạng thái thu cước
    trang_thai_cuoc_nhan: (data.trang_thai_thu === 'chua_thu') ? 'cho_thu' : null,
    can_xuat_hddt: data.can_xuat_hddt || false,
    hang_hu_khong_den: data.hang_hu_khong_den || false,
    hinh_thuc_giao: data.hinh_thuc_giao ?? undefined, // enum with @default; null not allowed
    // chanh_id is a relation FK — must use connect/disconnect syntax
    ...(data.chanh_id && Number(data.chanh_id) > 0
      ? { chanh: { connect: { id: Number(data.chanh_id) } } }
      : {}),
    dia_chi_giao: data.dia_chi_giao || null,
    // [NT-01] Đơn nội thành: bỏ qua giai đoạn xe liên tỉnh, tiếp nhận thẳng vào kho
    ...(noiThanh ? { trang_thai: 'da_den_kho' } : {}),
    // [NV-3b] Liên kết KH tùy chọn
    ...(data.kh_gui_id  ? { kh_gui:  { connect: { id: Number(data.kh_gui_id)  } } } : {}),
    ...(data.kh_nhan_id ? { kh_nhan: { connect: { id: Number(data.kh_nhan_id) } } } : {}),
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
  // [NT-01] Phát hiện đơn nội thành để dùng prefix NT và trạng thái ban đầu phù hợp
  const noiThanh = _isNoiThanh(data.van_phong_gui_id, data.van_phong_nhan_id);
  const prefix = noiThanh
    ? `NT${vpGui.ma_vp}`
    : `${vpGui.ma_vp}${vpNhan.ma_vp}`;

  // Nếu có mã custom → nhúng create vào transaction, catch P2002 thay vì check-then-act (TOCTOU fix)
  if (data.ma_so_custom?.trim()) {
    const customCode = data.ma_so_custom.trim();
    // [RC-01] TOCTOU fix: bỏ findFirst + tạo, thay bằng try-create-catch-P2002
    // DB constraint bien_nhan_ma_so_date_uidx đảm bảo duy nhất tại DB level
    try {
      const result = await prisma.$transaction(async (tx) => {
        const bn = await tx.bienNhan.create({ data: _buildBienNhanFields(customCode, ngayBN, data, userId, noiThanh) });
        await _createBienNhanSideEffects(tx, bn, data, userId, noiThanh);
        return { bn, autoCreated: await _autoCreateKH(tx, data) };
      });
      writeAuditLog({ action: 'CREATE', entity: 'bien_nhan', entityId: result.bn.id, newData: result.bn });
      return result;
    } catch (err) {
      if (err.code === 'P2002') {
        throw Object.assign(
          new Error(`Mã biên nhận "${customCode}" đã tồn tại trong ngày này`),
          { statusCode: 409 },
        );
      }
      throw err;
    }
  }

  // [RC-02] Auto-gen mã: retry loop — mỗi attempt re-count để lấy số mới nhất
  // Lý do: count bên ngoài transaction có thể stale khi có concurrent request
  const MAX_RETRIES = 10;
  let result;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      result = await prisma.$transaction(async (tx) => {
        // Re-count bên trong transaction → snapshot mới nhất tại thời điểm lock
        const count = await _countBNByPrefixAndDate(tx, prefix, ngayBN);
        const ma_so = `${prefix}-${String(count + 1).padStart(4, '0')}`;
        const bn = await tx.bienNhan.create({ data: _buildBienNhanFields(ma_so, ngayBN, data, userId, noiThanh) });
        await _createBienNhanSideEffects(tx, bn, data, userId, noiThanh);
        return { bn, autoCreated: await _autoCreateKH(tx, data) };
      });
      break; // Tạo thành công
    } catch (err) {
      // P2002 = unique constraint violation từ DB (bien_nhan_ma_so_date_uidx)
      if (err.code === 'P2002' && attempt < MAX_RETRIES - 1) continue; // Retry
      throw err;
    }
  }
  if (!result) throw new Error(`Không thể tạo mã ${prefix} sau ${MAX_RETRIES} lần thử`);

  writeAuditLog({ action: 'CREATE', entity: 'bien_nhan', entityId: result.bn.id, newData: result.bn });
  return result;
}

/**
 * Side effects: lịch sử trạng thái + công nợ
 * @param {boolean} noiThanh - true khi VP gửi = VP nhận
 *   → lịch sử ban đầu ghi nhận thẳng tại da_den_kho với ghi chú nội thành
 */
async function _createBienNhanSideEffects(tx, bn, data, userId, noiThanh = false) {
  // [NT-01] Lịch sử trạng thái đầu tiên
  // - Liên VP: bắt đầu tại cho_vc (hàng chờ xếp xe)
  // - Nội thành: bắt đầu tại da_den_kho (hàng tiếp nhận ngay tại VP, không có xe liên tỉnh)
  await tx.lichSuTrangThai.create({
    data: {
      bien_nhan_id: bn.id,
      trang_thai_moi: noiThanh ? 'da_den_kho' : 'cho_vc',
      nhan_vien_id: userId,
      phuong_thuc: 'manual',
      ghi_chu: noiThanh
        ? 'Đơn nội thành — hàng tiếp nhận tại VP, sẵn sàng giao'
        : 'Tạo biên nhận mới',
    },
  });
  // Tự tạo công nợ nếu cần
  if (data.trang_thai_thu === 'cong_no') {
    // [NV-3b] Resolve khach_hang_id & doanh_nghiep_id từ vai trò người nợ
    const vaiTro = data.vai_tro_cong_no === 'nguoi_nhan' ? 'nguoi_nhan' : 'nguoi_gui';
    const linkedKhId = vaiTro === 'nguoi_nhan' ? (data.kh_nhan_id || null) : (data.kh_gui_id || null);

    // Nếu có KH liên kết → lookup doanh_nghiep_id từ KhachHang
    let linkedDnId = null;
    if (linkedKhId) {
      const kh = await tx.khachHang.findUnique({
        where: { id: Number(linkedKhId) },
        select: { doanh_nghiep_id: true },
      });
      linkedDnId = kh?.doanh_nghiep_id || null;
    }

    // doi_tuong: ưu tiên tên đơn vị theo vai trò
    const doiTuong = vaiTro === 'nguoi_nhan'
      ? (data.don_vi_nhan || data.nguoi_nhan || 'N/A')
      : (data.don_vi_gui  || data.nguoi_gui  || 'N/A');

    await tx.congNo.create({
      data: {
        bien_nhan_id:     bn.id,
        doi_tuong:        doiTuong,
        so_tien_no:       data.gia_cuoc || 0,
        trang_thai:       'chua_thu',
        vai_tro:          vaiTro,
        khach_hang_id:    linkedKhId  ? Number(linkedKhId)  : undefined,
        doanh_nghiep_id:  linkedDnId  ? Number(linkedDnId)  : undefined,
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
    // [H-06] Đọc counter một lần duy nhất TRƯỚC loop — tránh 2 KH cùng mã trong cùng tx
    // (PostgreSQL read isolation: lần 2 không thấy KH lần 1 vừa tạo trong cùng tx)
    const lastKH = await tx.khachHang.findFirst({
      where: { ma_kh: { startsWith: 'KH-' } },
      orderBy: { id: 'desc' },
      select: { ma_kh: true },
    });
    let khCounter = 1;
    if (lastKH) {
      const n = parseInt(lastKH.ma_kh.split('-').pop(), 10);
      if (!isNaN(n)) khCounter = n + 1;
    }
    // Sync closure — tự tăng counter mỗi lần gọi, không cần async
    const generateKHCode = () => `KH-${String(khCounter++).padStart(4, '0')}`;
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
export async function updateBienNhan(id, data, userId, userRole, userVpId) {
  const existing = await prisma.bienNhan.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });

  // [H-SEC-01] IDOR: Staff chỉ sửa BN thuộc VP của mình (gửi hoặc nhận)
  // Đây là VP-level check — mạnh hơn chỉ check người tạo
  if (userRole === 'staff' && userVpId) {
    const belongsToVp = (
      existing.van_phong_gui_id === userVpId ||
      existing.van_phong_nhan_id === userVpId
    );
    if (!belongsToVp) {
      throw Object.assign(
        new Error('Bạn không có quyền sửa biên nhận này'),
        { statusCode: 403 },
      );
    }
    // Trong phạm vi VP: chỉ sửa BN mình tạo
    if (existing.nhan_vien_nhap_id !== userId) {
      throw Object.assign(new Error('Bạn chỉ được sửa biên nhận do mình tạo'), { statusCode: 403 });
    }
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
    if (key === 'chanh_id') continue; // handled separately as relation
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  // chanh_id → convert to Prisma relation syntax
  if (data.chanh_id !== undefined) {
    const chanhId = Number(data.chanh_id);
    if (chanhId > 0) {
      updateData.chanh = { connect: { id: chanhId } };
    } else {
      updateData.chanh = { disconnect: true };
    }
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

  // [CuocNhan] Sync trang_thai_cuoc_nhan khi đổi trang_thai_thu
  if (updateData.trang_thai_thu !== undefined) {
    const oldTTThu = existing.trang_thai_thu;
    const newTTThu = updateData.trang_thai_thu;
    if (oldTTThu !== 'chua_thu' && newTTThu === 'chua_thu') {
      // Chuyển sang chua_thu → khởi tạo state
      updateData.trang_thai_cuoc_nhan = 'cho_thu';
    } else if (oldTTThu === 'chua_thu' && newTTThu !== 'chua_thu') {
      // Bỏ chua_thu → chỉ cho phép nếu chưa thu cước
      if (existing.trang_thai_cuoc_nhan && existing.trang_thai_cuoc_nhan !== 'cho_thu') {
        throw Object.assign(
          new Error('Không thể thay đổi trạng thái thu khi cước đang được xử lý'),
          { statusCode: 400 },
        );
      }
      updateData.trang_thai_cuoc_nhan = null;
    }
  }

  const updated = await prisma.bienNhan.update({ where: { id }, data: updateData });

  // [H-SEC-03] Audit log: UPDATE — ghi userId để có đầy đủ trail
  writeAuditLog({
    action: 'UPDATE',
    entity: 'bien_nhan',
    entityId: id,
    userId,
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
export async function deleteBienNhan(id, userId, userRole, userVpId) {
  const existing = await prisma.bienNhan.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });

  // [H-SEC-01] IDOR: Staff chỉ xóa BN thuộc VP của mình
  // DELETE chỉ dành cho admin (preHandler đã enforce), nhưng phòng khi logic thay đổi
  if (userRole === 'staff' && userVpId) {
    const belongsToVp = (
      existing.van_phong_gui_id === userVpId ||
      existing.van_phong_nhan_id === userVpId
    );
    if (!belongsToVp) {
      throw Object.assign(new Error('Bạn không có quyền xóa biên nhận này'), { statusCode: 403 });
    }
    if (existing.nhan_vien_nhap_id !== userId) {
      throw Object.assign(new Error('Bạn chỉ được xóa biên nhận do mình tạo'), { statusCode: 403 });
    }
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

  // M-06: Không cho xóa BN đã có Biên nhận thu hộ (BNTH) — tránh orphan records
  const bnth = await prisma.bienNhanThuHo.findUnique({
    where: { bien_nhan_id: id },
    select: { id: true, ma_bnth: true },
  });
  if (bnth) {
    throw Object.assign(
      new Error(`Biên nhận đã có biên nhận thu hộ (${bnth.ma_bnth}), không thể xóa. Liên hệ Admin.`),
      { statusCode: 400 },
    );
  }

  // Không cho xóa BN có COD đang xử lý (đã thu/đã chuyển có PhieuThu/PhieuChi liên quan)
  if (['da_thu', 'da_chuyen', 'da_tra', 'da_thu_chanh'].includes(existing.trang_thai_cod)) {
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

  // [H-SEC-03] Audit log DELETE — ghi userId để có đầy đủ trail
  writeAuditLog({ action: 'DELETE', entity: 'bien_nhan', entityId: id, userId, oldData: existing });
}
