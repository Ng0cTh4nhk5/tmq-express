import * as congNoService from '../services/cong-no.service.js';

export default async function congNoRoutes(fastify) {
  // GET /api/cong-no
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const result = await congNoService.listCongNo(request.query);
      return { success: true, ...result };
    },
  });

  // POST /api/cong-no/:id/xac-nhan-thanh-toan
  fastify.post('/:id/xac-nhan-thanh-toan', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
          ghi_chu: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const data = await congNoService.xacNhanThanhToan(
        Number(request.params.id),
        request.body,
        request.user,
      );
      return { success: true, data, message: 'Đã xác nhận thanh toán và tạo phiếu thu' };
    },
  });
}
