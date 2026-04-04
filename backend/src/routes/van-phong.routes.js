import { getAllVanPhong, createVanPhong, updateVanPhong, toggleVanPhongActive } from '../services/van-phong.service.js';

export default async function vanPhongRoutes(fastify) {
  // GET /api/van-phong
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const active = request.query.active === 'true' ? true : undefined;
      const data = await getAllVanPhong(active);
      return { success: true, data };
    },
  });

  // POST /api/van-phong
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['ma_vp', 'ten'],
        properties: {
          ma_vp: { type: 'string', minLength: 2, maxLength: 10 },
          ten: { type: 'string', minLength: 1 },
          dia_chi: { type: 'string' },
          dien_thoai: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const data = await createVanPhong(request.body);
      return reply.status(201).send({ success: true, data, message: 'Tạo văn phòng thành công' });
    },
  });

  // PUT /api/van-phong/:id
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          ten: { type: 'string', minLength: 1 },
          dia_chi: { type: 'string' },
          dien_thoai: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await updateVanPhong(Number(request.params.id), request.body);
      return { success: true, data, message: 'Cập nhật thành công' };
    },
  });

  // PATCH /api/van-phong/:id/active
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
      const data = await toggleVanPhongActive(Number(request.params.id), request.body.active);
      return { success: true, data };
    },
  });
}
