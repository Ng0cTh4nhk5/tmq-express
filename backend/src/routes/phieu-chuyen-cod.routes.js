import {
  listPhieuChuyenCOD,
  createPhieuChuyenCOD,
  xacNhanChuyen,
  xacNhanNhan,
  getChiTiet,
} from '../services/phieu-chuyen-cod.service.js';

export default async function phieuChuyenCodRoutes(fastify) {
  // GET /api/phieu-chuyen-cod
  fastify.get('/', {
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
      },
    },
    handler: async (request) => {
      const result = await listPhieuChuyenCOD(request.query);
      return { success: true, ...result };
    },
  });

  // POST /api/phieu-chuyen-cod — Lập phiếu chuyển COD (gom lô)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['van_phong_gui_id', 'bien_nhan_ids'],
        properties: {
          van_phong_gui_id: { type: 'integer' },
          bien_nhan_ids:    { type: 'array', items: { type: 'integer' }, minItems: 1 },
          hinh_thuc:        { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
          ghi_chu:          { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await createPhieuChuyenCOD(request.body, request.user);
      return { success: true, data: result, message: 'Đã lập phiếu chuyển COD' };
    },
  });

  // GET /api/phieu-chuyen-cod/:id — Chi tiết
  fastify.get('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    },
    handler: async (request) => {
      const data = await getChiTiet(Number(request.params.id));
      return { success: true, data };
    },
  });

  // PATCH /api/phieu-chuyen-cod/:id/xac-nhan-chuyen — VP Nhận xác nhận đã gửi tiền
  fastify.patch('/:id/xac-nhan-chuyen', {
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
      const result = await xacNhanChuyen(Number(request.params.id), request.body || {}, request.user);
      return { success: true, data: result, message: 'Đã xác nhận gửi tiền đi' };
    },
  });

  // PATCH /api/phieu-chuyen-cod/:id/xac-nhan-nhan — VP Gửi xác nhận đã nhận tiền
  fastify.patch('/:id/xac-nhan-nhan', {
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
      const result = await xacNhanNhan(Number(request.params.id), request.body || {}, request.user);
      return { success: true, data: result, message: `Đã xác nhận nhận tiền, cập nhật ${result.so_bien_nhan} biên nhận → Đã chuyển` };
    },
  });
}
