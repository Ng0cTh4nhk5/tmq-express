import {
  listBNCuocNhan,
  tongHopCuocNhan,
  xacNhanThuCuocNhan, // [B2] thu cước thủ công khi auto-thu đã fail
  listPhieuChuyenCuoc,
  createPhieuChuyenCuoc,
  getChiTietPhieuCuoc,
  xacNhanChuyenCuoc,
  xacNhanNhanCuoc,
} from '../services/cuoc-nhan.service.js';

export default async function cuocNhanRoutes(fastify) {

  // ─── Danh sách BN cước nhận ───────────────────────────────────────────────

  // GET /api/cuoc-nhan
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          trang_thai_cuoc_nhan: { type: 'string', enum: ['cho_thu', 'da_thu', 'cho_chuyen', 'da_nhan'] },
          vp_gui:   { type: 'integer' },
          vp_nhan:  { type: 'integer' },
          from:     { type: 'string', format: 'date' },
          to:       { type: 'string', format: 'date' },
          page:     { type: 'integer', minimum: 1 },
          limit:    { type: 'integer', minimum: 1, maximum: 100 },
          search:   { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await listBNCuocNhan(request.query, request.user);
      return { success: true, ...result };
    },
  });

  // GET /api/cuoc-nhan/tong-hop
  fastify.get('/tong-hop', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          vp_gui:  { type: 'integer' },
          vp_nhan: { type: 'integer' },
          from:    { type: 'string', format: 'date' },
          to:      { type: 'string', format: 'date' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await tongHopCuocNhan(request.query, request.user);
      return { success: true, data };
    },
  });

  // ─── Thu cước thủ công ─────────────────────────────────────────────────────

  // POST /api/cuoc-nhan/:id/thu — [B2] Thu cước khi auto-thu đã fail (BN kẹt cho_thu)
  // Cho phép thu khi BN ở bất kỳ trang_thai vận chuyển (kể cả khach_da_nhan)
  // Chỉ kiểm tra trang_thai_cuoc_nhan === 'cho_thu' + gia_cuoc > 0 (trong service)
  fastify.post('/:id/thu', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
          ghi_chu:   { type: 'string' },
          nguoi_nop: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await xacNhanThuCuocNhan(
        Number(request.params.id),
        request.body || {},
        request.user,
      );
      return { success: true, data: result, message: 'Đã thu cước thành công' };
    },
  });

  // ─── PhieuChuyenCuoc ──────────────────────────────────────────────────────

  // GET /api/cuoc-nhan/phieu
  fastify.get('/phieu', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          vp_nhan:    { type: 'integer' },
          vp_gui:     { type: 'integer' },
          trang_thai: { type: 'string', enum: ['cho_chuyen', 'da_chuyen', 'da_nhan'] },
          from:       { type: 'string', format: 'date' },
          to:         { type: 'string', format: 'date' },
          page:       { type: 'integer', minimum: 1 },
          limit:      { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await listPhieuChuyenCuoc(request.query, request.user);
      return { success: true, ...result };
    },
  });

  // POST /api/cuoc-nhan/phieu — Lập phiếu chuyển cước
  fastify.post('/phieu', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['van_phong_gui_id', 'bien_nhan_ids'],
        properties: {
          van_phong_gui_id: { type: 'integer' },
          bien_nhan_ids:    { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 200 },
          hinh_thuc:        { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
          ghi_chu:          { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await createPhieuChuyenCuoc(request.body, request.user);
      return { success: true, data: result, message: 'Đã lập phiếu chuyển cước' };
    },
  });

  // GET /api/cuoc-nhan/phieu/:id — Chi tiết phiếu
  fastify.get('/phieu/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    },
    handler: async (request) => {
      const data = await getChiTietPhieuCuoc(Number(request.params.id));
      return { success: true, data };
    },
  });

  // PATCH /api/cuoc-nhan/phieu/:id/xac-nhan-chuyen — VP Nhận confirm đã gửi
  fastify.patch('/phieu/:id/xac-nhan-chuyen', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: {
        type: 'object',
        properties: { ghi_chu: { type: 'string' } },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await xacNhanChuyenCuoc(
        Number(request.params.id),
        request.body || {},
        request.user,
      );
      return { success: true, data: result, message: 'Đã xác nhận gửi cước đi' };
    },
  });

  // PATCH /api/cuoc-nhan/phieu/:id/xac-nhan-nhan — VP Gửi confirm đã nhận
  fastify.patch('/phieu/:id/xac-nhan-nhan', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: {
        type: 'object',
        properties: {
          hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await xacNhanNhanCuoc(
        Number(request.params.id),
        request.body || {},
        request.user,
      );
      return { success: true, data: result, message: `Đã xác nhận nhận cước, cập nhật ${result.so_bien_nhan} biên nhận` };
    },
  });
}
