import { getBienNhanCho, createBangKe, listBangKe, downloadBangKe } from '../services/bang-ke.service.js';

export default async function bangKeRoutes(fastify) {
  // GET /api/bang-ke/bien-nhan-cho — DS BN đánh dấu HĐĐT & chưa vào bảng kê
  fastify.get('/bien-nhan-cho', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    handler: async (request) => {
      const data = await getBienNhanCho(request.query);
      return { success: true, data };
    },
  });

  // POST /api/bang-ke — Xuất bảng kê
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['bien_nhan_ids'],
        properties: {
          bien_nhan_ids: { type: 'array', items: { type: 'integer' }, minItems: 1 },
        },
      },
    },
    handler: async (request, reply) => {
      const { bangKe, buffer, ten_file } = await createBangKe(request.body.bien_nhan_ids);

      // Trả JSON với base64 Excel (tránh IDM giống PDF)
      return {
        success: true,
        data: {
          bang_ke: bangKe,
          file: {
            name: ten_file,
            base64: Buffer.from(buffer).toString('base64'),
          },
        },
      };
    },
  });

  // GET /api/bang-ke — Lịch sử bảng kê
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    handler: async (request) => {
      const result = await listBangKe(request.query);
      return { success: true, ...result };
    },
  });

  // GET /api/bang-ke/:id/download — Tải lại file Excel
  fastify.get('/:id/download', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    handler: async (request) => {
      const { buffer, ten_file } = await downloadBangKe(Number(request.params.id));
      return {
        success: true,
        data: {
          file: {
            name: ten_file,
            base64: Buffer.from(buffer).toString('base64'),
          },
        },
      };
    },
  });
}
