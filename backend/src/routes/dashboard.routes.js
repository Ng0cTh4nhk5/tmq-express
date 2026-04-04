import * as dashboardService from '../services/dashboard.service.js';

export default async function dashboardRoutes(fastify) {
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const data = await dashboardService.getStats(request.user);
      return { success: true, data };
    },
  });

  fastify.get('/doanh-thu-7-ngay', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const data = await dashboardService.getDoanhThu7Ngay(request.user);
      return { success: true, data };
    },
  });

  fastify.get('/ty-le-tuyen', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const data = await dashboardService.getTyLeTuyen();
      return { success: true, data };
    },
  });

  fastify.get('/thu-chi-theo-thang', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const data = await dashboardService.getThuChiTheoThang();
      return { success: true, data };
    },
  });
}
