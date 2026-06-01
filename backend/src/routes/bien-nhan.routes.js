import { listBienNhan, getBienNhan, getNextMaSo, createBienNhan, updateBienNhan, deleteBienNhan } from '../services/bien-nhan.service.js';
import { generateBienNhanPDF, generateSoBienNhan, generateSoBienNhanExcel } from '../services/pdf.service.js';
import prisma from '../config/database.js';

// Luồng trạng thái cho phép (phân nhánh theo context)
// da_den_kho có nhiều đích đến — validation chi tiết xử lý trong validateTransitionWithContext
const ALLOWED_TRANSITIONS = {
  cho_vc:        ['dang_vc'],
  dang_vc:       ['da_den_kho'],
  da_den_kho:    ['da_bao_khach', 'khach_da_nhan', 'dang_giao', 'da_giao_chanh'],
  da_bao_khach:  ['khach_da_nhan'],
  dang_giao:     ['khach_da_nhan'],
  da_giao_chanh: [], // Terminal
  khach_da_nhan: [], // Terminal
};

const TRANG_THAI_LABELS = {
  cho_vc: 'Chờ VC', dang_vc: 'Đang VC', da_den_kho: 'Đã đến kho',
  da_bao_khach: 'Đã báo khách', dang_giao: 'Đang giao hàng',
  da_giao_chanh: 'Đã giao Chành', khach_da_nhan: 'Khách đã nhận',
};

/**
 * Validate transition cơ bản (chỉ kiểm tra có trong ALLOWED_TRANSITIONS).
 * Được dùng cho batch (không có context hiều nước).
 */
function validateTransition(currentStatus, newStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Không thể chuyển từ "${TRANG_THAI_LABELS[currentStatus]}" sang "${TRANG_THAI_LABELS[newStatus] || newStatus}"`),
      { statusCode: 400 },
    );
  }
}

/**
 * Validate transition có context: kiểm tra luồng phân nhánh theo hinh_thuc_giao và chanh_id.
 * Chỉ áp dụng cho chuyển truyết từ da_den_kho.
 */
function validateTransitionWithContext(existing, newTrangThai) {
  // Bước 1: kiểm tra cơ bản (có trong ALLOWED_TRANSITIONS)
  validateTransition(existing.trang_thai, newTrangThai);

  // Bước 2: kiểm tra context nếu đang ở da_den_kho
  if (existing.trang_thai !== 'da_den_kho') return;

  const hasChanh = !!existing.chanh_id;
  const htGiao   = existing.hinh_thuc_giao;

  if (hasChanh) {
    // Nếu có chành: chỉ cho phép da_giao_chanh
    if (newTrangThai !== 'da_giao_chanh') {
      throw Object.assign(
        new Error('Biên nhận này có Chành — phải bàn giao cho Chành (da_giao_chanh)'),
        { statusCode: 400 },
      );
    }
    return;
  }

  // Không có chành: phân nhánh theo hinh_thuc_giao
  const validNextMap = {
    tu_toi:   'khach_da_nhan',
    goi_dien: 'da_bao_khach',
    tan_noi:  'dang_giao',
  };
  const expected = validNextMap[htGiao];
  if (expected && newTrangThai !== expected) {
    const htLabel = { tu_toi: 'Tự đến lấy', goi_dien: 'Gọi điện', tan_noi: 'Giao tận nơi' }[htGiao];
    throw Object.assign(
      new Error(`Hình thức giao "${htLabel}" phải chuyển sang "${TRANG_THAI_LABELS[expected]}"`),
      { statusCode: 400 },
    );
  }
}

// Quy tắc: bước nào thuộc phạm vi VP nào
const VP_TRANSITION_RULE = {
  'cho_vc→dang_vc':             'gui',
  'dang_vc→da_den_kho':         'nhan',
  'da_den_kho→da_bao_khach':    'nhan',
  'da_den_kho→khach_da_nhan':   'nhan',
  'da_den_kho→dang_giao':       'nhan',
  'da_den_kho→da_giao_chanh':   'nhan',
  'da_bao_khach→khach_da_nhan': 'nhan',
  'dang_giao→khach_da_nhan':    'nhan',
};

/**
 * Kiểm tra quyền chuyển trạng thái theo VP.
 * - Admin: bypass hoàn toàn.
 * - Staff: chỉ được thực hiện bước thuộc VP mình.
 */
function validateVpPermission(existing, newTrangThai, user) {
  if (user.role === 'admin') return;

  const key = `${existing.trang_thai}→${newTrangThai}`;
  const side = VP_TRANSITION_RULE[key];
  if (!side) return; // unknown key — không restrict

  const requiredVpId = side === 'gui'
    ? existing.van_phong_gui_id
    : existing.van_phong_nhan_id;

  if (user.van_phong_id !== requiredVpId) {
    const msg = side === 'gui'
      ? 'Chỉ văn phòng gửi mới có thể thực hiện bước này'
      : 'Chỉ văn phòng nhận mới có thể thực hiện bước này';
    throw Object.assign(new Error(msg), { statusCode: 403 });
  }
}


/**
 * Parse & validate query params cho các route sổ biên nhận.
 * @throws 400 nếu thiếu/sai params
 */
function parseSoBienNhanParams(query) {
  const { ngay_tu, ngay_den, ngay, vp_gui_id, vp_nhan_id } = query;
  const from = ngay_tu || ngay;
  const to   = ngay_den || ngay_tu || ngay;

  if (!from || !vp_gui_id || !vp_nhan_id) {
    throw Object.assign(
      new Error('Thiếu tham số: ngay_tu (hoặc ngay), vp_gui_id, vp_nhan_id'),
      { statusCode: 400 },
    );
  }
  if (from > to) {
    throw Object.assign(
      new Error('Ngày bắt đầu không được lớn hơn ngày kết thúc'),
      { statusCode: 400 },
    );
  }

  const vpGuiId  = Number(vp_gui_id);
  const vpNhanId = Number(vp_nhan_id);

  // [NT-01] Cho phép VP gửi = VP nhận (đơn nội thành).
  // BN nội thành có prefix NT{VP} và trang_thai bắt đầu tại da_den_kho.
  // Query theo van_phong_gui_id + van_phong_nhan_id hoạt động đúng kể cả khi 2 cột bằng nhau.

  return { from, to, vpGuiId, vpNhanId };
}

export default async function bienNhanRoutes(fastify) {
  // GET /api/bien-nhan — Danh sách (filter, pagination)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const { search, trang_thai, vp_gui, vp_nhan, from, to, page, limit, sortBy, sortOrder } = request.query;
      const result = await listBienNhan({
        van_phong_id: request.user.van_phong_id,
        role: request.user.role,
        search, trang_thai, vp_gui, vp_nhan, from, to,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'desc',
      });
      return { success: true, ...result };
    },
  });

  // GET /api/bien-nhan/next-ma-so — Preview mã BN (format mới: SGCT-0414-0001)
  fastify.get('/next-ma-so', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const { vp_gui_id, vp_nhan_id, ngay } = request.query;
      if (!vp_gui_id || !vp_nhan_id) {
        return { success: true, data: null };
      }
      const ma_so = await getNextMaSo(Number(vp_gui_id), Number(vp_nhan_id), ngay || null);
      return { success: true, data: ma_so };
    },
  });

  // GET /api/bien-nhan/so-bien-nhan — Xuất PDF sổ biên nhận hàng gửi
  // QUAN TRỌNG: Phải đặt TRƯỚC /:id để tránh Fastify match nhầm
  fastify.get('/so-bien-nhan', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { from, to, vpGuiId, vpNhanId } = parseSoBienNhanParams(request.query);
      const pdfBuffer = await generateSoBienNhan(from, to, vpGuiId, vpNhanId);
      const fileLabel = from === to ? from : `${from}_den_${to}`;
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Length', pdfBuffer.length);
      reply.header('Content-Disposition', `inline; filename="so-bien-nhan-${fileLabel}.pdf"`);
      reply.send(pdfBuffer);
      return reply;
    },
  });

  // GET /api/bien-nhan/so-bien-nhan-preview — Trả base64 JSON để frontend dùng blob URL
  fastify.get('/so-bien-nhan-preview', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const { from, to, vpGuiId, vpNhanId } = parseSoBienNhanParams(request.query);
      const pdfBuffer = await generateSoBienNhan(from, to, vpGuiId, vpNhanId);
      return { success: true, data: { base64: pdfBuffer.toString('base64') } };
    },
  });

  // GET /api/bien-nhan/so-bien-nhan-excel — Xuất Excel sổ biên nhận (tải trực tiếp)
  fastify.get('/so-bien-nhan-excel', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { from, to, vpGuiId, vpNhanId } = parseSoBienNhanParams(request.query);
      const buffer = await generateSoBienNhanExcel(from, to, vpGuiId, vpNhanId);
      const fileLabel = from === to ? from : `${from}_den_${to}`;
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Length', buffer.length);
      reply.header('Content-Disposition', `attachment; filename="so-bien-nhan-${fileLabel}.xlsx"`);
      reply.send(Buffer.from(buffer));
      return reply;
    },
  });

  // GET /api/bien-nhan/so-bien-nhan-excel-preview — Trả base64 JSON để frontend tải
  fastify.get('/so-bien-nhan-excel-preview', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const { from, to, vpGuiId, vpNhanId } = parseSoBienNhanParams(request.query);
      const buffer = await generateSoBienNhanExcel(from, to, vpGuiId, vpNhanId);
      return { success: true, data: { base64: Buffer.from(buffer).toString('base64') } };
    },
  });

  // GET /api/bien-nhan/hang-den — Danh sách hàng về VP nhận (inbox 3 tab)
  // Staff: auto-scope theo VP mình; Admin/Accountant: truyền ?vp_nhan_id=
  // Query params:
  //   trang_thai = dang_vc (default) | da_den_kho | da_bao_khach
  //   count_all  = true → chỉ trả tab_counts (badge sidebar, không query data)
  // QUAN TRỌNG: phải đặt TRƯỚC /:id
  fastify.get('/hang-den', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      let vpNhanId;
      if (request.user.role === 'staff') {
        vpNhanId = request.user.van_phong_id;
      } else {
        // [FIX-ADMIN] Admin: optional VP filter — null = xem tất cả VP
        vpNhanId = request.query.vp_nhan_id ? Number(request.query.vp_nhan_id) : null;
      }

      const EMPTY = { success: true, data: [], stats: { total: 0, tong_cuoc: 0, so_co_cod: 0 }, tab_counts: { dang_vc: 0, da_den_kho: 0, da_bao_khach: 0, dang_giao: 0, da_giao_chanh: 0 } };
      // [FIX-ADMIN] Chỉ chặn staff không có VP, admin được phép null (= tất cả)
      if (!vpNhanId && request.user.role === 'staff') return EMPTY;

      const ALLOWED_TABS = ['dang_vc', 'da_den_kho', 'da_bao_khach', 'dang_giao', 'da_giao_chanh'];
      const trangThai = ALLOWED_TABS.includes(request.query.trang_thai)
        ? request.query.trang_thai
        : 'dang_vc';

      // [FIX-ADMIN] Build where: chỉ thêm VP filter khi có giá trị cụ thể
      const vpFilter = vpNhanId ? { van_phong_nhan_id: vpNhanId } : {};

      // count_all=true: chỉ đếm tổng cho badge sidebar
      if (request.query.count_all === 'true') {
        const counts = await Promise.all(
          ALLOWED_TABS.map(tt => prisma.bienNhan.count({ where: { ...vpFilter, trang_thai: tt } }))
        );
        const tab_counts = Object.fromEntries(ALLOWED_TABS.map((tt, i) => [tt, counts[i]]));
        return { success: true, tab_counts, total: counts.reduce((s, c) => s + c, 0) };
      }

      const page  = Number(request.query.page)  || 1;
      const limit = Number(request.query.limit) || 50;
      const skip  = (page - 1) * limit;

      const where = { ...vpFilter, trang_thai: trangThai };

      // [HD-01] Query data tab hiện tại + count chính xác + counts tất cả tab song song
      const [data, totalCount, ...tabCountResults] = await Promise.all([
        prisma.bienNhan.findMany({
          where,
          orderBy: [{ ngay_bien_nhan: 'asc' }, { id: 'asc' }],
          skip,
          take: limit,
          include: {
            van_phong_gui:  { select: { ma_vp: true, ten: true } },
            van_phong_nhan: { select: { ma_vp: true, ten: true } },
            nhan_vien_nhap: { select: { ten: true } },
            chanh:          { select: { id: true, ten: true, dien_thoai: true, dia_chi: true, nguoi_lien_he: true } },
          },
        }),

        prisma.bienNhan.count({ where }),
        ...ALLOWED_TABS.map(tt => prisma.bienNhan.count({ where: { ...vpFilter, trang_thai: tt } })),
      ]);

      const tab_counts = Object.fromEntries(ALLOWED_TABS.map((tt, i) => [tt, tabCountResults[i]]));
      const stats = {
        total:     totalCount,
        tong_cuoc: data.reduce((s, b) => s + Number(b.gia_cuoc || 0), 0),
        so_co_cod: data.filter(b => Number(b.thu_ho) > 0).length,
      };

      const pagination = { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) };

      return { success: true, data, stats, tab_counts, pagination };
    },
  });

  // GET /api/bien-nhan/cho-van-chuyen — Hàng đợi chờ giao xe tại VP Gửi
  // Staff: auto-scope theo van_phong_gui_id; Admin/Accountant: ?vp_gui_id=
  // count_all=true → chỉ trả count cho badge sidebar
  // QUAN TRỌNG: phải đặt TRƯỚC /:id
  fastify.get('/cho-van-chuyen', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      let vpGuiId;
      if (request.user.role === 'staff') {
        vpGuiId = request.user.van_phong_id;
      } else {
        // [FIX-ADMIN] Admin: optional VP filter — null = xem tất cả VP
        vpGuiId = request.query.vp_gui_id ? Number(request.query.vp_gui_id) : null;
      }

      const EMPTY = {
        success: true, data: [],
        stats: { total: 0, tong_cuoc: 0, so_co_cod: 0 },
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      };
      // [FIX-ADMIN] Chỉ chặn staff không có VP, admin được phép null (= tất cả)
      if (!vpGuiId && request.user.role === 'staff') return EMPTY;

      const page  = Number(request.query.page)  || 1;
      const limit = Number(request.query.limit) || 50;
      const skip  = (page - 1) * limit;

      // [FIX-ADMIN] Build where: chỉ thêm VP filter khi có giá trị cụ thể
      const vpFilter = vpGuiId ? { van_phong_gui_id: vpGuiId } : {};

      // count_all=true: chỉ đếm cho badge sidebar, không cần trả data
      if (request.query.count_all === 'true') {
        const count = await prisma.bienNhan.count({
          where: { ...vpFilter, trang_thai: 'cho_vc' },
        });
        return { success: true, count };
      }

      // [BE-W1] Query đầy đủ — count song song để stats luôn chính xác
      const where = { ...vpFilter, trang_thai: 'cho_vc' };
      const [data, totalCount] = await Promise.all([
        prisma.bienNhan.findMany({
          where,
          orderBy: { ngay_bien_nhan: 'asc' },
          skip,
          take: limit,
          include: {
            van_phong_gui:  { select: { ma_vp: true, ten: true } },
            van_phong_nhan: { select: { ma_vp: true, ten: true } },
            nhan_vien_nhap: { select: { ten: true } },
            chanh:          { select: { id: true, ten: true } },
          },
        }),
        prisma.bienNhan.count({ where }),
      ]);

      const stats = {
        total:     totalCount,
        tong_cuoc: data.reduce((s, b) => s + Number(b.gia_cuoc || 0), 0),
        so_co_cod: data.filter(b => Number(b.thu_ho) > 0).length,
      };

      const pagination = { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) };

      return { success: true, data, stats, pagination };
    },
  });



  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
    },
    handler: async (request, reply) => {
      const data = await getBienNhan(Number(request.params.id));
      if (!data) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy biên nhận' } });
      // Fix 2.3: Staff chỉ xem BN liên quan đến VP mình
      if (request.user.role === 'staff') {
        const vp = request.user.van_phong_id;
        if (data.van_phong_gui_id !== vp && data.van_phong_nhan_id !== vp) {
          return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Không có quyền xem biên nhận này' } });
        }
      }
      return { success: true, data };
    },
  });

  // POST /api/bien-nhan — Tạo mới
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['van_phong_gui_id', 'van_phong_nhan_id'],
        properties: {
          van_phong_gui_id: { type: 'integer' },
          van_phong_nhan_id: { type: 'integer' },
          ma_so_custom: { type: 'string' },
          ngay_bien_nhan: { type: 'string', format: 'date' },
          don_vi_gui: { type: 'string' },
          nguoi_gui: { type: 'string' },
          dien_thoai_gui: { type: 'string' },
          so_cccd_gui: { type: 'string' },
          don_vi_nhan: { type: 'string' },
          nguoi_nhan: { type: 'string' },
          dien_thoai_nhan: { type: 'string' },
          so_cccd_nhan: { type: 'string' },
          hang_hoa_json: {
            type: 'array',
            items: {
              type: 'object',
              required: ['don_vi', 'so_luong'],
              properties: {
                don_vi: { type: 'string' },
                so_luong: { type: 'number', minimum: 0 },
                ghi_chu: { type: 'string' },
              },
            },
          },
          gia_tri_hang: { type: 'number', minimum: 0 },
          trong_luong:  { type: 'number', minimum: 0 },
          thu_ho:       { type: 'number', minimum: 0 },
          gia_cuoc:     { type: 'number', minimum: 0 },
          trang_thai_thu: { type: 'string', enum: ['da_thu', 'chua_thu', 'cong_no'] },
          can_xuat_hddt: { type: 'boolean' },
          hang_hu_khong_den: { type: 'boolean' },
          hinh_thuc_giao: { type: 'string', enum: ['tan_noi', 'goi_dien', 'tu_toi'] },
          chanh_id: { type: 'integer' },
          dia_chi_giao: { type: 'string' },
          gio_tao: { type: 'string' },
          dia_chi_gui: { type: 'string' },
          dia_chi_nhan: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const { bn, autoCreated } = await createBienNhan(request.body, request.user.id);
      const response = { success: true, data: bn, message: 'Tạo biên nhận thành công' };
      if (autoCreated?.length > 0) {
        response.auto_created_kh = autoCreated;
      }
      return reply.status(201).send(response);
    },
  });

  // PUT /api/bien-nhan/:id — Cập nhật
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          don_vi_gui: { type: 'string' },
          nguoi_gui: { type: 'string' },
          dien_thoai_gui: { type: 'string' },
          so_cccd_gui: { type: 'string' },
          don_vi_nhan: { type: 'string' },
          nguoi_nhan: { type: 'string' },
          dien_thoai_nhan: { type: 'string' },
          so_cccd_nhan: { type: 'string' },
          hang_hoa_json: {
            type: 'array',
            items: {
              type: 'object',
              required: ['don_vi', 'so_luong'],
              properties: {
                don_vi: { type: 'string' },
                so_luong: { type: 'number', minimum: 0 },
                ghi_chu: { type: 'string' },
              },
            },
          },
          gia_tri_hang: { type: 'number' },
          trong_luong: { type: 'number' },
          thu_ho: { type: 'number' },
          gia_cuoc: { type: 'number' },
          trang_thai_thu: { type: 'string', enum: ['da_thu', 'chua_thu', 'cong_no'] },
          can_xuat_hddt: { type: 'boolean' },
          hang_hu_khong_den: { type: 'boolean' },
          hinh_thuc_giao: { type: 'string', enum: ['tan_noi', 'goi_dien', 'tu_toi'] },
          chanh_id: { type: ['integer', 'null'] },
          dia_chi_giao: { type: 'string' },
          gio_tao: { type: 'string' },
          dia_chi_gui: { type: 'string' },
          dia_chi_nhan: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await updateBienNhan(
        Number(request.params.id),
        request.body,
        request.user.id,
        request.user.role,
      );
      return { success: true, data, message: 'Cập nhật thành công' };
    },
  });

  // GET /api/bien-nhan/:id/pdf — Tải PDF (binary)
  fastify.get('/:id/pdf', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const pdfBuffer = await generateBienNhanPDF(Number(request.params.id), {
        nhan_vien_ten: request.user.ten || 'N/A',
      });
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Length', pdfBuffer.length);
      reply.header('Content-Disposition', `inline; filename="bien-nhan-${request.params.id}.pdf"`);
      reply.send(pdfBuffer);
      return reply;
    },
  });

  // GET /api/bien-nhan/:id/pdf-preview — PDF dạng base64 JSON (tránh IDM chặn)
  fastify.get('/:id/pdf-preview', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const pdfBuffer = await generateBienNhanPDF(Number(request.params.id), {
        nhan_vien_ten: request.user.ten || 'N/A',
      });
      return {
        success: true,
        data: { base64: pdfBuffer.toString('base64') },
      };
    },
  });

  // PATCH /api/bien-nhan/:id/trang-thai — Cập nhật trạng thái
  fastify.patch('/:id/trang-thai', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['trang_thai'],
        properties: {
          trang_thai: { type: 'string', enum: ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'dang_giao', 'da_giao_chanh', 'khach_da_nhan'] },
          ghi_chu: { type: 'string' },
          phuong_thuc: { type: 'string', enum: ['manual', 'scan'] },
        },
      },
    },

    handler: async (request) => {
      const id = Number(request.params.id);
      const { trang_thai, ghi_chu, phuong_thuc } = request.body;

      // Fetch BN kèm context (hinh_thuc_giao, chanh_id, chanh info) để validate context-aware
      const existing = await prisma.bienNhan.findUnique({
        where: { id },
        select: {
          trang_thai: true, thu_ho: true, trang_thai_cod: true,
          gia_cuoc: true,             // [B1] cần để pre-check auto-thu cước
          trang_thai_thu: true,       // [B1] cần để pre-check auto-thu cước
          trang_thai_cuoc_nhan: true, // [B1] cần để trigger auto-thu
          van_phong_gui_id: true, van_phong_nhan_id: true,
          hinh_thuc_giao: true, chanh_id: true,
          don_vi_nhan: true, nguoi_nhan: true, ma_so: true,
          chanh: { select: { ten: true, dien_thoai: true, dia_chi: true, nguoi_lien_he: true } },
        },
      });
      if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
      validateTransitionWithContext(existing, trang_thai);
      validateVpPermission(existing, trang_thai, request.user);

      // Pre-fill ghi chú khi bàn giao chành nếu NV không nhập
      let finalGhiChu = ghi_chu || null;
      if (trang_thai === 'da_giao_chanh' && !ghi_chu && existing.chanh) {
        const c = existing.chanh;
        const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        finalGhiChu = `Giao cho Chành "${c.ten}" lúc ${now}${c.dien_thoai ? ` — ĐT: ${c.dien_thoai}` : ''}${c.dia_chi ? ` — ĐC: ${c.dia_chi}` : ''}`;
      }

      // Cập nhật trạng thái vận chuyển + lịch sử
      const [bn] = await prisma.$transaction([
        prisma.bienNhan.update({ where: { id }, data: { trang_thai } }),
        prisma.lichSuTrangThai.create({
          data: {
            bien_nhan_id: id,
            trang_thai_cu: existing.trang_thai,
            trang_thai_moi: trang_thai,
            nhan_vien_id: request.user.id,
            phuong_thuc: phuong_thuc || 'manual',
            ghi_chu: finalGhiChu,
          },
        }),
      ]);


      // *** AUTO-THU COD + CƯỚC khi khach_da_nhan ***
      let autoCodResult = null;
      let autoCuocResult = null;
      let autoCuocWarning = null; // [B1] Trả warning về client thay vì nuốt lỗi

      if (trang_thai === 'khach_da_nhan') {
        // Auto-thu COD: chỉ thu khi không qua chành
        // (Nếu BN có chanh_id: tiền COD đang ở chành, phải dùng luồng "chành đã thu" thủ công)
        if (Number(existing.thu_ho) > 0 && existing.trang_thai_cod === 'cho_thu' && !existing.chanh_id) {
          try {
            const { xacNhanThuCODAuto } = await import('../services/thu-ho.service.js');
            const codResult = await xacNhanThuCODAuto(id, request.user);
            autoCodResult = { phieu_thu: codResult.phieu_thu };
          } catch (err) {
            console.warn(`[Auto-COD] BN ${existing.ma_so}: ${err.message}`);
          }
        }

        // [B1] Auto-thu cước: pre-check gia_cuoc trước để tránh kẹt state
        if (existing.trang_thai_cuoc_nhan === 'cho_thu') {
          if (!existing.gia_cuoc || Number(existing.gia_cuoc) <= 0) {
            // BN không có tiền cước → clear state để không kẹt mãi ở cho_thu
            await prisma.bienNhan.update({
              where: { id },
              data: { trang_thai_cuoc_nhan: null },
            });
            autoCuocWarning = 'Biên nhận không có tiền cước (gia_cuoc = 0) — đã xóa trạng thái chờ thu tự động';
            console.warn(`[Auto-Cuớc] BN ${existing.ma_so}: gia_cuoc=0, cleared trang_thai_cuoc_nhan`);
          } else {
            try {
              const { xacNhanThuCuocNhanAuto } = await import('../services/cuoc-nhan.service.js');
              const cuocResult = await xacNhanThuCuocNhanAuto(id, request.user);
              autoCuocResult = { phieu_thu: cuocResult.phieu_thu };
            } catch (err) {
              // [B1] Log đầy đủ + trả warning về client — không nuốt lỗi
              console.error(`[Auto-Cuớc FAIL] BN ${existing.ma_so}: ${err.message}`);
              autoCuocWarning = `Thu cước tự động thất bại: ${err.message}. Vui lòng thu thủ công tại màn hình Cước nhận.`;
            }
          }
        }
      }

      const messages = ['Cập nhật trạng thái thành công'];
      if (autoCodResult) messages.push('Đã tự động thu COD');
      if (autoCuocResult) messages.push('Đã tự động thu cước từ người nhận');
      if (autoCuocWarning) messages.push('⚠ Cần thu cước thủ công');

      return {
        success: true,
        data: bn,
        message: messages.join('. '),
        ...(autoCodResult   ? { auto_thu_cod:  true, phieu_thu_cod:  autoCodResult.phieu_thu  } : {}),
        ...(autoCuocResult  ? { auto_thu_cuoc: true, phieu_thu_cuoc: autoCuocResult.phieu_thu } : {}),
        ...(autoCuocWarning ? { cuoc_warning: autoCuocWarning } : {}), // [B1] warning về client
      };
    },
  });


  // [BE-B1] PATCH /api/bien-nhan/batch-trang-thai — Batch cập nhật trạng thái
  // Lưu ý: PATCH "/batch-trang-thai" không conflict với PATCH "/:id/trang-thai" vì
  // Fastify phân biệt cả method lẫn path structure — không cần đặt thứ tự đặc biệt cho PATCH.
  // (Chỉ GET routes dạng "/hang-den", "/cho-van-chuyen" mới cần đặt TRƯỚC GET "/:id")
  fastify.patch('/batch-trang-thai', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['ids', 'trang_thai'],
        properties: {
          ids: { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 200 },
          trang_thai: { type: 'string', enum: ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'dang_giao', 'da_giao_chanh', 'khach_da_nhan'] },

          ghi_chu: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const { ids, trang_thai, ghi_chu } = request.body;

      // Validate all transitions before executing
      const existingBNs = await prisma.bienNhan.findMany({
        where: { id: { in: ids } },
        select: {
          id: true, ma_so: true, trang_thai: true,
          thu_ho: true, trang_thai_cod: true,
          trang_thai_cuoc_nhan: true,
          gia_cuoc: true,  // [B1] cần để pre-check auto-thu cước
          van_phong_gui_id: true, van_phong_nhan_id: true,
          chanh_id: true,  // cần để skip auto-COD khi giao qua chành
        },
      });

      // [BE-B2] Kiểm tra có IDs nào không tồn tại trong DB không
      if (existingBNs.length !== ids.length) {
        const foundIds = new Set(existingBNs.map(bn => bn.id));
        const missingIds = ids.filter(id => !foundIds.has(id));
        throw Object.assign(
          new Error(`Không tìm thấy biên nhận với ID: ${missingIds.join(', ')}`),
          { statusCode: 404 },
        );
      }

      const errors = [];
      for (const bn of existingBNs) {
        // Kiểm tra transition hợp lệ
        const allowed = ALLOWED_TRANSITIONS[bn.trang_thai] || [];
        if (!allowed.includes(trang_thai)) {
          errors.push(`${bn.ma_so}: không thể chuyển từ "${TRANG_THAI_LABELS[bn.trang_thai]}" sang "${TRANG_THAI_LABELS[trang_thai]}"`);
          continue;
        }
        // Kiểm tra quyền VP
        try {
          validateVpPermission(bn, trang_thai, request.user);
        } catch (err) {
          errors.push(`${bn.ma_so}: ${err.message}`);
        }
      }
      if (errors.length > 0) {
        throw Object.assign(
          new Error(`Có ${errors.length} BN không hợp lệ: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`),
          { statusCode: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.bienNhan.updateMany({ where: { id: { in: ids } }, data: { trang_thai } });
        // Map id → trạng thái cũ để lưu vào lịch sử
        const ttCuMap = Object.fromEntries(existingBNs.map(bn => [bn.id, bn.trang_thai]));
        await tx.lichSuTrangThai.createMany({
          data: ids.map((id) => ({
            bien_nhan_id: id,
            trang_thai_cu: ttCuMap[id] || null,
            trang_thai_moi: trang_thai,
            nhan_vien_id: request.user.id,
            phuong_thuc: 'batch',
            ghi_chu: ghi_chu || `Batch: ${ids.length} biên nhận`,
          })),
        });
      });

      // [B1] Auto-thu COD + cước: pre-check gia_cuoc, warning về client thay vì nuốt lỗi
      let autoCodResult;
      let autoCuocResult;
      const batchCuocWarnings = []; // [B1] collect warnings từng BN

      if (trang_thai === 'khach_da_nhan') {
        const { xacNhanThuCODAuto } = await import('../services/thu-ho.service.js');
        const { xacNhanThuCuocNhanAuto } = await import('../services/cuoc-nhan.service.js');

        // Auto-thu COD: chỉ thu khi không qua chành
        const codBNs  = existingBNs.filter(bn => Number(bn.thu_ho) > 0 && bn.trang_thai_cod === 'cho_thu' && !bn.chanh_id);

        // [B1] Phân nhóm BN cần thu cước:
        // - cuocBNsZero: gia_cuoc = 0 → clear state (không kẹt)
        // - cuocBNsValid: gia_cuoc > 0 → thực hiện auto-thu
        const allCuocBNs = existingBNs.filter(bn => bn.trang_thai_cuoc_nhan === 'cho_thu');
        const cuocBNsZero  = allCuocBNs.filter(bn => !bn.gia_cuoc || Number(bn.gia_cuoc) <= 0);
        const cuocBNsValid = allCuocBNs.filter(bn => bn.gia_cuoc && Number(bn.gia_cuoc) > 0);

        const codSuccess = [], codErrors = [];
        for (const bn of codBNs) {
          try {
            await xacNhanThuCODAuto(bn.id, request.user);
            codSuccess.push(bn.ma_so);
          } catch (err) {
            codErrors.push({ ma_so: bn.ma_so, error: err.message });
            console.warn(`[Auto-COD Batch] BN ${bn.ma_so}: ${err.message}`);
          }
        }
        if (codBNs.length > 0) autoCodResult = { success: codSuccess, errors: codErrors };

        // [B1] Clear state cho BN có gia_cuoc = 0
        if (cuocBNsZero.length > 0) {
          const zeroIds = cuocBNsZero.map(bn => bn.id);
          await prisma.bienNhan.updateMany({
            where: { id: { in: zeroIds } },
            data: { trang_thai_cuoc_nhan: null },
          });
          cuocBNsZero.forEach(bn => {
            console.warn(`[Auto-Cuớc Batch] BN ${bn.ma_so}: gia_cuoc=0, cleared trang_thai_cuoc_nhan`);
            batchCuocWarnings.push(`${bn.ma_so}: không có tiền cước (gia_cuoc=0)`);
          });
        }

        // [B1] Thu cước các BN hợp lệ
        const cuocSuccess = [], cuocErrors = [];
        for (const bn of cuocBNsValid) {
          try {
            await xacNhanThuCuocNhanAuto(bn.id, request.user);
            cuocSuccess.push(bn.ma_so);
          } catch (err) {
            cuocErrors.push({ ma_so: bn.ma_so, error: err.message });
            batchCuocWarnings.push(`${bn.ma_so}: ${err.message}`);
            console.error(`[Auto-Cuớc Batch FAIL] BN ${bn.ma_so}: ${err.message}`);
          }
        }
        if (allCuocBNs.length > 0) autoCuocResult = { success: cuocSuccess, errors: cuocErrors, cleared_zero: cuocBNsZero.map(b => b.ma_so) };
      }

      return {
        success: true,
        message: `Đã cập nhật ${ids.length} biên nhận`,
        ...(autoCodResult  ? { auto_thu_cod:  autoCodResult  } : {}),
        ...(autoCuocResult ? { auto_thu_cuoc: autoCuocResult } : {}),
        ...(batchCuocWarnings.length > 0 ? { cuoc_warnings: batchCuocWarnings } : {}), // [B1]
      };
    },
  });


  // DELETE /api/bien-nhan/:id — Xóa biên nhận
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
    }, // [N-M02] Validate params.id là integer — tránh NaN khi id='abc'
    handler: async (request) => {
      const id = Number(request.params.id);
      await deleteBienNhan(id, request.user.id, request.user.role);
      return { success: true, message: 'Đã xóa biên nhận' };
    },
  });
}
