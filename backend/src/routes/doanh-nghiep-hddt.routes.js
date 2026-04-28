import { listDoanhNghiep, createDoanhNghiep, updateDoanhNghiep, toggleDoanhNghiep } from '../services/doanh-nghiep-hddt.service.js';

export default async function doanhNghiepHDDTRoutes(fastify) {
  // GET /api/doanh-nghiep-hddt
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    handler: async (request) => {
      const data = await listDoanhNghiep(request.query);
      return { success: true, data };
    },
  });

  // POST /api/doanh-nghiep-hddt
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['ten'],
        properties: {
          ten: { type: 'string', minLength: 1 },
          ma_so_thue: { type: 'string' },
          dia_chi: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const data = await createDoanhNghiep(request.body);
      return reply.status(201).send({ success: true, data });
    },
  });

  // PUT /api/doanh-nghiep-hddt/:id
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          ten: { type: 'string', minLength: 1 },
          ma_so_thue: { type: 'string' },
          dia_chi: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await updateDoanhNghiep(Number(request.params.id), request.body);
      return { success: true, data };
    },
  });

  // PATCH /api/doanh-nghiep-hddt/:id/active
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
      const data = await toggleDoanhNghiep(Number(request.params.id), request.body.active);
      return { success: true, data };
    },
  });
}
