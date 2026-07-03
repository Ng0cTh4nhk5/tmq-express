import {
  listThuHo,
  tongHopThuHo,
  xacNhanThuCOD,
  xacNhanThuChanh,
  xacNhanNhanTuChanh,
  traLo,
} from '../services/thu-ho.service.js';

const xacNhanBody = {
  type: 'object',
  properties: {
    hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
    ghi_chu:   { type: 'string' },
    nguoi_nop: { type: 'string' },
  },
  additionalProperties: false,
};

export default async function thuHoRoutes(fastify) {
  // GET /api/thu-ho
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          trang_thai_cod: { type: 'string', enum: ['cho_thu', 'da_thu_chanh', 'da_thu', 'cho_chuyen_pending', 'da_chuyen', 'da_tra'] },
          vp_gui:  { type: 'integer' },
          vp_nhan: { type: 'integer' },
          from:    { type: 'string', format: 'date' },
          to:      { type: 'string', format: 'date' },
          page:    { type: 'integer', minimum: 1 },
          limit:   { type: 'integer', minimum: 1, maximum: 500 },
          search:  { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await listThuHo(request.query, request.user);
      return { success: true, ...result };
    },
  });

  // GET /api/thu-ho/tong-hop
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
      const data = await tongHopThuHo(request.query, request.user);
      return { success: true, data };
    },
  });

  // POST /api/thu-ho/:id/xac-nhan-thu — Thu COD thủ công khi auto-thu đã fail
  // Cho phép thu khi BN ở bất kỳ trang_thai vận chuyển (kể cả khach_da_nhan)
  // Chỉ kiểm tra trang_thai_cod === 'cho_thu' + thu_ho > 0 (trong service)
  fastify.post('/:id/xac-nhan-thu', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: xacNhanBody,
    },
    handler: async (request) => {
      const result = await xacNhanThuCOD(Number(request.params.id), request.body || {}, request.user);
      return { success: true, data: result, message: 'Đã thu COD thành công' };
    },
  });

  // POST /api/thu-ho/:id/xac-nhan-thu-chanh — Ghi nhận chành đã thu
  fastify.post('/:id/xac-nhan-thu-chanh', {
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
      const result = await xacNhanThuChanh(Number(request.params.id), request.body || {}, request.user);
      return { success: true, data: result, message: 'Đã ghi nhận chành thu COD' };
    },
  });

  // POST /api/thu-ho/:id/xac-nhan-nhan-tu-chanh — VP Nhận nhận tiền từ chành
  fastify.post('/:id/xac-nhan-nhan-tu-chanh', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: xacNhanBody,
    },
    handler: async (request) => {
      const result = await xacNhanNhanTuChanh(Number(request.params.id), request.body || {}, request.user);
      const messages = ['VP Nhận đã xác nhận nhận tiền từ chành và tạo biên nhận thu hộ'];
      // [CHANH-CUOC] Thông báo nếu đã tự động thu cước luôn
      if (result.phieu_thu_cuoc) {
        messages.push(`Đã tự động thu cước (${result.phieu_thu_cuoc.ma_phieu})`);
      }
      return {
        success: true,
        data: result,
        message: messages.join('. '),
        ...(result.phieu_thu_cuoc ? { auto_thu_cuoc: true, phieu_thu_cuoc: result.phieu_thu_cuoc } : {}),
      };
    },
  });

  // POST /api/thu-ho/tra-lo — Trả nhiều BN cho người gửi (gom lô)
  fastify.post('/tra-lo', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['bien_nhan_ids'],
        properties: {
          bien_nhan_ids: { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 200 },
          hinh_thuc:     { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
          ghi_chu:       { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await traLo(request.body, request.user);
      return { success: true, data: result, message: `Đã trả COD cho ${result.count} biên nhận` };
    },
  });
}
