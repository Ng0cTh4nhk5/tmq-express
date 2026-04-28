import { listBienNhan, getBienNhan, getNextMaSo, createBienNhan, updateBienNhan, deleteBienNhan } from '../services/bien-nhan.service.js';
import { generateBienNhanPDF, generateSoBienNhan, generateSoBienNhanExcel } from '../services/pdf.service.js';
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

  if (vpGuiId === vpNhanId) {
    throw Object.assign(
      new Error('VP gửi và VP nhận không được trùng nhau'),
      { statusCode: 400 },
    );
  }

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

  // GET /api/bien-nhan/:id — Chi tiết
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
          trang_thai: { type: 'string', enum: ['cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'] },
          ghi_chu: { type: 'string' },
          phuong_thuc: { type: 'string', enum: ['manual', 'scan'] },
        },
      },
    },
    handler: async (request) => {
      const id = Number(request.params.id);
      const { trang_thai, ghi_chu, phuong_thuc } = request.body;

      // Validate transition — bổ sung select thu_ho + trang_thai_cod
      const existing = await prisma.bienNhan.findUnique({
        where: { id },
        select: {
          trang_thai: true, thu_ho: true, trang_thai_cod: true,
          van_phong_nhan_id: true, don_vi_nhan: true, nguoi_nhan: true, ma_so: true,
        },
      });
      if (!existing) throw Object.assign(new Error('Không tìm thấy biên nhận'), { statusCode: 404 });
      validateTransition(existing.trang_thai, trang_thai);

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
            ghi_chu: ghi_chu || null,
          },
        }),
      ]);

      // *** AUTO-THU COD khi khach_da_nhan ***
      if (trang_thai === 'khach_da_nhan'
          && Number(existing.thu_ho) > 0
          && existing.trang_thai_cod === 'cho_thu') {
        try {
          const { xacNhanThuCODAuto } = await import('../services/thu-ho.service.js');
          const codResult = await xacNhanThuCODAuto(id, request.user);
          return {
            success: true,
            data: codResult.bn,
            message: 'Cập nhật trạng thái thành công. Đã tự động thu COD.',
            auto_thu_cod: true,
            phieu_thu: codResult.phieu_thu,
          };
        } catch (err) {
          // Auto-thu thất bại không block việc cập nhật trạng thái
          console.warn(`[Auto-COD] BN ${existing.ma_so}: ${err.message}`);
        }
      }

      return { success: true, data: bn, message: 'Cập nhật trạng thái thành công' };
    },
  });


  // DELETE /api/bien-nhan/:id — Xóa biên nhận
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    handler: async (request) => {
      const id = Number(request.params.id);
      await deleteBienNhan(id, request.user.id, request.user.role);
      return { success: true, message: 'Đã xóa biên nhận' };
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
        select: { id: true, ma_so: true, trang_thai: true, thu_ho: true, trang_thai_cod: true },
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
        // Map id → trạng thái cũ để lưu vào lịch sử
        const ttCuMap = Object.fromEntries(existingBNs.map(bn => [bn.id, bn.trang_thai]));
        await tx.lichSuTrangThai.createMany({
          data: ids.map((id) => ({
            bien_nhan_id: id,
            trang_thai_cu: ttCuMap[id] || null,
            trang_thai_moi: trang_thai,
            nhan_vien_id: request.user.id,
            phuong_thuc: 'manual',
            ghi_chu: ghi_chu || `Batch: ${ids.length} biên nhận`,
          })),
        });
      });

      // Auto-thu COD cho các BN có thu_ho > 0 && cho_thu khi chuyển sang khach_da_nhan
      let autoCodResult;
      if (trang_thai === 'khach_da_nhan') {
        const { xacNhanThuCODAuto } = await import('../services/thu-ho.service.js');
        const codBNs = existingBNs.filter(bn => Number(bn.thu_ho) > 0 && bn.trang_thai_cod === 'cho_thu');
        const codSuccess = [];
        const codErrors = [];
        for (const bn of codBNs) {
          try {
            await xacNhanThuCODAuto(bn.id, request.user);
            codSuccess.push(bn.ma_so);
          } catch (err) {
            codErrors.push({ ma_so: bn.ma_so, error: err.message });
            console.warn(`[Auto-COD Batch] BN ${bn.ma_so}: ${err.message}`);
          }
        }
        if (codBNs.length > 0) {
          autoCodResult = { success: codSuccess, errors: codErrors };
        }
      }

      return {
        success: true,
        message: `Đã cập nhật ${ids.length} biên nhận`,
        ...(autoCodResult ? { auto_thu_cod: autoCodResult } : {}),
      };
    },
  });
}
