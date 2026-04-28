import { listThuHo, tongHopThuHo, xacNhanThuCOD, xacNhanChuyenCOD, xacNhanTraCOD } from '../services/thu-ho.service.js';

const xacNhanBody = {
  type: 'object',
  properties: {
    hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
    ghi_chu: { type: 'string' },
  },
  additionalProperties: false,
};

export default async function thuHoRoutes(fastify) {
  // GET /api/thu-ho — Danh sách COD
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          trang_thai_cod: { type: 'string', enum: ['cho_thu', 'da_thu', 'da_chuyen', 'da_tra'] },
          vp_gui: { type: 'integer' },
          vp_nhan: { type: 'integer' },
          from: { type: 'string', format: 'date' },
          to: { type: 'string', format: 'date' },
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          search: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const result = await listThuHo(request.query);
      return { success: true, ...result };
    },
  });

  // GET /api/thu-ho/tong-hop — Tổng hợp 4 nhóm
  fastify.get('/tong-hop', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          vp_gui: { type: 'integer' },
          vp_nhan: { type: 'integer' },
          from: { type: 'string', format: 'date' },
          to: { type: 'string', format: 'date' },
        },
      },
    },
    handler: async (request) => {
      const data = await tongHopThuHo(request.query);
      return { success: true, data };
    },
  });

  // POST /api/thu-ho/:id/xac-nhan-thu — Staff cũng được phép
  fastify.post('/:id/xac-nhan-thu', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: xacNhanBody,
    },
    handler: async (request) => {
      const result = await xacNhanThuCOD(Number(request.params.id), request.body || {}, request.user);
      return { success: true, data: result, message: 'Đã xác nhận thu COD và tạo phiếu thu' };
    },
  });

  // POST /api/thu-ho/:id/xac-nhan-chuyen — Admin + KT
  fastify.post('/:id/xac-nhan-chuyen', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: xacNhanBody,
    },
    handler: async (request) => {
      const result = await xacNhanChuyenCOD(Number(request.params.id), request.body || {}, request.user);
      return { success: true, data: result, message: 'Đã chuyển COD về VP gửi và tạo phiếu thu/chi' };
    },
  });

  // POST /api/thu-ho/:id/xac-nhan-tra — Admin + KT
  fastify.post('/:id/xac-nhan-tra', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      body: xacNhanBody,
    },
    handler: async (request) => {
      const result = await xacNhanTraCOD(Number(request.params.id), request.body || {}, request.user);
      return { success: true, data: result, message: 'Đã trả COD cho người gửi và tạo phiếu chi' };
    },
  });
}
