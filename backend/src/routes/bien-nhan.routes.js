import { listBienNhan, getBienNhan, getNextMaSo, createBienNhan, updateBienNhan } from '../services/bien-nhan.service.js';
import { generateBienNhanPDF } from '../services/pdf.service.js';
import prisma from '../config/database.js';

// Luồng trạng thái cho phép (chỉ chuyển tiếp tuần tự)
const ALLOWED_TRANSITIONS = {
  cho_vc: ['dang_vc'],
  dang_vc: ['da_den_kho'],
  da_den_kho: ['da_bao_khach'],
  da_bao_khach: ['khach_da_nhan'],
  khach_da_nhan: [], // Terminal state
};

const TRANG_THAI_LABELS = {
  cho_vc: 'Chờ VC', dang_vc: 'Đang VC', da_den_kho: 'Đã đến kho',
  da_bao_khach: 'Đã báo khách', khach_da_nhan: 'Khách đã nhận',
};

function validateTransition(currentStatus, newStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Không thể chuyển từ "${TRANG_THAI_LABELS[currentStatus]}" sang "${TRANG_THAI_LABELS[newStatus]}"`),
      { statusCode: 400 },
    );
  }
}

export default async function bienNhanRoutes(fastify) {
  // GET /api/bien-nhan — Danh sách (filter, pagination)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const { search, trang_thai, vp_gui, vp_nhan, from, to, page, limit } = request.query;
      const result = await listBienNhan({
        van_phong_id: request.user.van_phong_id,
        role: request.user.role,
        search, trang_thai, vp_gui, vp_nhan, from, to,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return { success: true, ...result };
    },
  });

  // GET /api/bien-nhan/next-ma-so — Preview mã BN
  fastify.get('/next-ma-so', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const { vp_gui_id, vp_nhan_id } = request.query;
      if (!vp_gui_id || !vp_nhan_id) {
        return { success: true, data: null };
      }
      const ma_so = await getNextMaSo(Number(vp_gui_id), Number(vp_nhan_id));
      return { success: true, data: ma_so };
    },
  });

  // GET /api/bien-nhan/:id — Chi tiết
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const data = await getBienNhan(Number(request.params.id));
      if (!data) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy biên nhận' } });
      return { success: true, data };
    },
  });

  // POST /api/bien-nhan — Tạo mới
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['van_phong_gui_id', 'van_phong_nhan_id', 'ten_hang_hoa'],
        properties: {
          van_phong_gui_id: { type: 'integer' },
          van_phong_nhan_id: { type: 'integer' },
          don_vi_gui: { type: 'string' },
          nguoi_gui: { type: 'string' },
          dien_thoai_gui: { type: 'string' },
          dia_chi_gui: { type: 'string' },
          don_vi_nhan: { type: 'string' },
          nguoi_nhan: { type: 'string' },
          dien_thoai_nhan: { type: 'string' },
          dia_chi_nhan: { type: 'string' },
          so_cccd: { type: 'string' },
          ten_hang_hoa: { type: 'string', minLength: 1 },
          gia_tri_hang: { type: 'number' },
          trong_luong: { type: 'number' },
          thu_ho: { type: 'number' },
          gia_cuoc: { type: 'number' },
          trang_thai_thu: { type: 'string', enum: ['da_thu', 'chua_thu', 'cong_no'] },
          can_xuat_hddt: { type: 'boolean' },
          hang_hu_khong_den: { type: 'boolean' },
          hinh_thuc_giao: { type: 'string', enum: ['tan_noi', 'goi_dien', 'tu_toi'] },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      // Validate: VP gửi phải khác VP nhận
      if (request.body.van_phong_gui_id === request.body.van_phong_nhan_id) {
        throw Object.assign(
          new Error('Văn phòng gửi và văn phòng nhận không được trùng nhau'),
          { statusCode: 400 },
        );
      }
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
          dia_chi_gui: { type: 'string' },
          don_vi_nhan: { type: 'string' },
          nguoi_nhan: { type: 'string' },
          dien_thoai_nhan: { type: 'string' },
          dia_chi_nhan: { type: 'string' },
          so_cccd: { type: 'string' },
          ten_hang_hoa: { type: 'string', minLength: 1 },
          gia_tri_hang: { type: 'number' },
          trong_luong: { type: 'number' },
          thu_ho: { type: 'number' },
          gia_cuoc: { type: 'number' },
          trang_thai_thu: { type: 'string', enum: ['da_thu', 'chua_thu', 'cong_no'] },
          can_xuat_hddt: { type: 'boolean' },
          hang_hu_khong_den: { type: 'boolean' },
          hinh_thuc_giao: { type: 'string', enum: ['tan_noi', 'goi_dien', 'tu_toi'] },
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
          trang_thai: { type: 'string', enum: ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'] },
          ghi_chu: { type: 'string' },
          phuong_thuc: { type: 'string', enum: ['manual', 'scan'] },
        },
      },
    },
    handler: async (request) => {
      const id = Number(request.params.id);
      const { trang_thai, ghi_chu, phuong_thuc } = request.body;

      // Validate transition
      const existing = await prisma.bienNhan.findUnique({ where: { id }, select: { trang_thai: true } });
      if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
      validateTransition(existing.trang_thai, trang_thai);

      const [bn] = await prisma.$transaction([
        prisma.bienNhan.update({ where: { id }, data: { trang_thai } }),
        prisma.lichSuTrangThai.create({
          data: {
            bien_nhan_id: id,
            trang_thai_moi: trang_thai,
            nhan_vien_id: request.user.id,
            phuong_thuc: phuong_thuc || 'manual',
            ghi_chu: ghi_chu || null,
          },
        }),
      ]);

      return { success: true, data: bn, message: 'Cập nhật trạng thái thành công' };
    },
  });

  // PATCH /api/bien-nhan/batch-trang-thai — Batch (gửi xe)
  fastify.patch('/batch-trang-thai', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['ids', 'trang_thai'],
        properties: {
          ids: { type: 'array', items: { type: 'integer' }, minItems: 1 },
          trang_thai: { type: 'string', enum: ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'] },
          ghi_chu: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const { ids, trang_thai, ghi_chu } = request.body;

      // Validate all transitions before executing
      const existingBNs = await prisma.bienNhan.findMany({
        where: { id: { in: ids } },
        select: { id: true, ma_so: true, trang_thai: true },
      });

      const errors = [];
      for (const bn of existingBNs) {
        const allowed = ALLOWED_TRANSITIONS[bn.trang_thai] || [];
        if (!allowed.includes(trang_thai)) {
          errors.push(`${bn.ma_so}: không thể chuyển từ "${TRANG_THAI_LABELS[bn.trang_thai]}" sang "${TRANG_THAI_LABELS[trang_thai]}"`);
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
        await tx.lichSuTrangThai.createMany({
          data: ids.map((id) => ({
            bien_nhan_id: id,
            trang_thai_moi: trang_thai,
            nhan_vien_id: request.user.id,
            phuong_thuc: 'manual',
            ghi_chu: ghi_chu || `Batch: ${ids.length} biên nhận`,
          })),
        });
      });
      return { success: true, message: `Đã cập nhật ${ids.length} biên nhận` };
    },
  });
}
