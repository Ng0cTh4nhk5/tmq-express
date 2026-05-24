import { baoCaoDoanhThu } from '../services/doanh-thu.service.js';

export default async function doanhThuRoutes(fastify) {
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'staff'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          from:          { type: 'string' },
          to:            { type: 'string' },
          van_phong_id:  { type: 'integer' },
          nhom:          { type: 'string', enum: ['ngay', 'tuan', 'thang', 'nam'] },
        },
      },
    },
    handler: async (request) => {
      const data = await baoCaoDoanhThu(request.query);
      return { success: true, data };
    },
  });
}
