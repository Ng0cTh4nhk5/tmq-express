import * as baoCaoService from '../services/bao-cao.service.js';

export default async function baoCaoRoutes(fastify) {
  fastify.get('/doanh-thu', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const data = await baoCaoService.baoCaoDoanhThu(request.query);
      return { success: true, data };
    },
  });

  fastify.get('/so-quy', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const data = await baoCaoService.baoCaoSoQuy(request.query);
      return { success: true, data };
    },
  });

  fastify.get('/bien-nhan', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const data = await baoCaoService.baoCaoBienNhan(request.query);
      return { success: true, data };
    },
  });

  fastify.get('/cong-no', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const data = await baoCaoService.baoCaoCongNo();
      return { success: true, data };
    },
  });
}
