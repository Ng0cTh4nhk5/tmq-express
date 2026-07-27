import {
  listDoanhNghiep, autocompleteDoanhNghiep, getDoanhNghiep,
  createDoanhNghiep, updateDoanhNghiep, toggleDoanhNghiepActive,
  addThanhVien, removeThanhVien, tongHopCongNoDoanhNghiep,
} from '../services/doanh-nghiep.service.js';

export default async function doanhNghiepRoutes(fastify) {
  // GET /api/doanh-nghiep
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          active: { type: 'string', enum: ['true', 'false'] },
          page:   { type: 'integer', minimum: 1 },
          limit:  { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await listDoanhNghiep(request.query);
      return { success: true, ...result };
    },
  });

  // GET /api/doanh-nghiep/autocomplete
  fastify.get('/autocomplete', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: { q: { type: 'string' } },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await autocompleteDoanhNghiep(request.query.q);
      return { success: true, data };
    },
  });

  // GET /api/doanh-nghiep/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    },
    handler: async (request) => {
      const data = await getDoanhNghiep(Number(request.params.id));
      return { success: true, data };
    },
  });

  // GET /api/doanh-nghiep/:id/cong-no
  fastify.get('/:id/cong-no', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const data = await tongHopCongNoDoanhNghiep(Number(request.params.id));
      return { success: true, data };
    },
  });

  // POST /api/doanh-nghiep
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['ten'],
        properties: {
          ten:        { type: 'string', minLength: 1 },
          ma_so_thue: { type: 'string' },
          dia_chi:    { type: 'string' },
          dien_thoai: { type: 'string' },
          ghi_chu:    { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const data = await createDoanhNghiep(request.body);
      return reply.status(201).send({ success: true, data, message: 'Tạo doanh nghiệp thành công' });
    },
  });

  // PUT /api/doanh-nghiep/:id
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          ten:        { type: 'string', minLength: 1 },
          ma_so_thue: { type: 'string' },
          dia_chi:    { type: 'string' },
          dien_thoai: { type: 'string' },
          ghi_chu:    { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await updateDoanhNghiep(Number(request.params.id), request.body);
      return { success: true, data, message: 'Cập nhật thành công' };
    },
  });

  // PATCH /api/doanh-nghiep/:id/active
  fastify.patch('/:id/active', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['active'],
        properties: { active: { type: 'boolean' } },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await toggleDoanhNghiepActive(Number(request.params.id), request.body.active);
      return { success: true, data };
    },
  });

  // POST /api/doanh-nghiep/:id/thanh-vien — thêm KhachHang vào DN
  fastify.post('/:id/thanh-vien', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['khach_hang_id'],
        properties: { khach_hang_id: { type: 'integer' } },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await addThanhVien(Number(request.params.id), request.body.khach_hang_id);
      return { success: true, data, message: 'Thêm thành viên thành công' };
    },
  });

  // DELETE /api/doanh-nghiep/:id/thanh-vien/:khId — gỡ KhachHang khỏi DN
  fastify.delete('/:id/thanh-vien/:khId', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'integer' }, khId: { type: 'integer' } },
        required: ['id', 'khId'],
      },
    },
    handler: async (request) => {
      const data = await removeThanhVien(Number(request.params.id), Number(request.params.khId));
      return { success: true, data, message: 'Gỡ thành viên thành công' };
    },
  });
}
