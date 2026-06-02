import { listKhachHang, autocompleteKhachHang, getKhachHang, createKhachHang, updateKhachHang, toggleKhachHangActive } from '../services/khach-hang.service.js';

export default async function khachHangRoutes(fastify) {
  // GET /api/khach-hang
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          search:  { type: 'string' },
          active:  { type: 'string', enum: ['true', 'false'] },
          loai_kh: { type: 'string', enum: ['doanh_nghiep', 'ca_nhan'] },
          page:    { type: 'integer', minimum: 1 },
          limit:   { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const { search, active, loai_kh, page, limit } = request.query;
      const result = await listKhachHang({
        search,
        active: active === 'true' ? true : active === 'false' ? false : undefined,
        loai_kh,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      });
      return { success: true, ...result };
    },
  });

  // GET /api/khach-hang/autocomplete
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
      const data = await autocompleteKhachHang(request.query.q);
      return { success: true, data };
    },
  });

  // GET /api/khach-hang/:id
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
      const data = await getKhachHang(Number(request.params.id));
      if (!data) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy khách hàng' } });
      return { success: true, data };
    },
  });

  // POST /api/khach-hang
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        required: ['ten_don_vi'],
        properties: {
          ten_don_vi: { type: 'string', minLength: 1 },
          loai_kh: { type: 'string', enum: ['doanh_nghiep', 'ca_nhan'] },
          nguoi_lien_he: { type: 'string' },
          dien_thoai: { type: 'string', pattern: '^0[2-9]\\d{8,9}$' },
          email: { type: 'string', format: 'email' },
          ma_so_thue: { type: 'string' },
          so_cccd: { type: 'string' },
          dia_chi: { type: 'string' },
          ghi_chu: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const data = await createKhachHang(request.body);
      return reply.status(201).send({ success: true, data, message: 'Tạo khách hàng thành công' });
    },
  });

  // PUT /api/khach-hang/:id
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          ten_don_vi: { type: 'string', minLength: 1 },
          loai_kh: { type: 'string', enum: ['doanh_nghiep', 'ca_nhan'] },
          nguoi_lien_he: { type: 'string' },
          dien_thoai: { type: 'string', pattern: '^0[2-9]\\d{8,9}$' },
          email: { type: 'string', format: 'email' },
          ma_so_thue: { type: 'string' },
          so_cccd: { type: 'string' },
          dia_chi: { type: 'string' },
          ghi_chu: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await updateKhachHang(Number(request.params.id), request.body);
      return { success: true, data, message: 'Cập nhật thành công' };
    },
  });

  // PATCH /api/khach-hang/:id/active
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
      const data = await toggleKhachHangActive(Number(request.params.id), request.body.active);
      return { success: true, data };
    },
  });
}
