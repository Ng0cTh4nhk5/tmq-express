import * as phieuThuService from '../services/phieu-thu.service.js';
import { generatePhieuThuPDF } from '../services/pdf.service.js';

export default async function phieuThuRoutes(fastify) {
  // GET /api/phieu-thu
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const result = await phieuThuService.listPhieuThu(request.query);
      return { success: true, ...result };
    },
  });

  // GET /api/phieu-thu/:id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const data = await phieuThuService.getPhieuThu(Number(request.params.id));
      return { success: true, data };
    },
  });

  // POST /api/phieu-thu
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      body: {
        type: 'object',
        required: ['doi_tuong', 'ly_do', 'so_tien'],
        properties: {
          doi_tuong: { type: 'string', minLength: 1 },
          ly_do: { type: 'string', minLength: 1 },
          so_tien: { type: 'number', minimum: 1 },
          hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
          bien_nhan_id: { type: 'integer' },
        },
      },
    },
    handler: async (request) => {
      const data = await phieuThuService.createPhieuThu(request.body, request.user);
      return { success: true, data };
    },
  });

  // PUT /api/phieu-thu/:id
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          doi_tuong: { type: 'string', minLength: 1 },
          ly_do: { type: 'string', minLength: 1 },
          so_tien: { type: 'number', minimum: 1 },
          hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await phieuThuService.updatePhieuThu(Number(request.params.id), request.body, request.user);
      return { success: true, data };
    },
  });

  // PATCH /api/phieu-thu/:id/huy
  fastify.patch('/:id/huy', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    handler: async (request) => {
      await phieuThuService.huyPhieuThu(Number(request.params.id));
      return { success: true, message: 'Đã hủy phiếu thu' };
    },
  });

  // GET /api/phieu-thu/:id/pdf
  fastify.get('/:id/pdf-preview', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const pdfBuffer = await generatePhieuThuPDF(Number(request.params.id), {
        nhan_vien_ten: request.user.ten || 'N/A',
      });
      return { success: true, data: { base64: pdfBuffer.toString('base64') } };
    },
  });
}
