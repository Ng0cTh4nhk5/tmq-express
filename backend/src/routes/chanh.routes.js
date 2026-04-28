import { getAllChanh, getChanhById, createChanh, updateChanh, toggleChanhActive } from '../services/chanh.service.js';

export default async function chanhRoutes(fastify) {
  // GET /api/chanh — Danh sách chành (lọc theo ?van_phong_id=&active=true)
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const opts = {};
      if (request.query.van_phong_id) opts.van_phong_id = request.query.van_phong_id;
      if (request.query.active === 'true') opts.active = true;
      if (request.query.active === 'false') opts.active = false;
      const data = await getAllChanh(opts);
      return { success: true, data };
    },
  });

  // GET /api/chanh/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const data = await getChanhById(Number(request.params.id));
      return { success: true, data };
    },
  });

  // POST /api/chanh — Tạo chành mới
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['ten', 'van_phong_id'],
        properties: {
          ten: { type: 'string', minLength: 1 },
          dia_chi: { type: 'string' },
          dien_thoai: { type: 'string' },
          nguoi_lien_he: { type: 'string' },
          van_phong_id: { type: 'integer' },
          ghi_chu: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = await createChanh(request.body);
      return reply.status(201).send({ success: true, data, message: 'Tạo chành thành công' });
    },
  });

  // PUT /api/chanh/:id — Cập nhật chành
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          ten: { type: 'string', minLength: 1 },
          dia_chi: { type: 'string' },
          dien_thoai: { type: 'string' },
          nguoi_lien_he: { type: 'string' },
          van_phong_id: { type: 'integer' },
          ghi_chu: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await updateChanh(Number(request.params.id), request.body);
      return { success: true, data, message: 'Cập nhật chành thành công' };
    },
  });

  // PATCH /api/chanh/:id/active — Bật/tắt trạng thái
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
      const data = await toggleChanhActive(Number(request.params.id), request.body.active);
      return { success: true, data };
    },
  });
}
