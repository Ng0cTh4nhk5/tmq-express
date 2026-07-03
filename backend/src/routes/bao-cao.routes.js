import { baoCaoTheoTuyen, baoCaoTheoChanh } from '../services/bao-cao.service.js';

const querySchema = {
  type: 'object',
  required: ['thang', 'nam'],
  properties: {
    thang: { type: 'integer', minimum: 1, maximum: 12 },
    nam:   { type: 'integer', minimum: 2020 },
  },
  additionalProperties: false,
};

export default async function baoCaoRoutes(fastify) {
  // GET /api/bao-cao/theo-tuyen?thang=6&nam=2026
  fastify.get('/theo-tuyen', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: { querystring: querySchema },
    handler: async (request) => {
      const { thang, nam }      = request.query;
      const { van_phong_id, role } = request.user;
      const data = await baoCaoTheoTuyen({ thang, nam, van_phong_id, role });
      return {
        success: true,
        meta: { thang, nam, so_tuyen: data.length },
        data,
      };
    },
  });

  // GET /api/bao-cao/theo-chanh?thang=6&nam=2026
  fastify.get('/theo-chanh', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: { querystring: querySchema },
    handler: async (request) => {
      const { thang, nam }      = request.query;
      const { van_phong_id, role } = request.user;
      const data = await baoCaoTheoChanh({ thang, nam, van_phong_id, role });
      return {
        success: true,
        meta: { thang, nam, so_chanh: data.length },
        data,
      };
    },
  });
}
