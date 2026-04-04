import * as phieuChiService from '../services/phieu-chi.service.js';
import { generatePhieuChiPDF } from '../services/pdf.service.js';

export default async function phieuChiRoutes(fastify) {
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const result = await phieuChiService.listPhieuChi(request.query);
      return { success: true, ...result };
    },
  });

  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      body: {
        type: 'object',
        required: ['nguoi_nhan', 'ly_do', 'so_tien'],
        properties: {
          nguoi_nhan: { type: 'string', minLength: 1 },
          ly_do: { type: 'string', minLength: 1 },
          so_tien: { type: 'number', minimum: 1 },
          hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
        },
      },
    },
    handler: async (request) => {
      const data = await phieuChiService.createPhieuChi(request.body, request.user);
      return { success: true, data };
    },
  });

  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          nguoi_nhan: { type: 'string', minLength: 1 },
          ly_do: { type: 'string', minLength: 1 },
          so_tien: { type: 'number', minimum: 1 },
          hinh_thuc: { type: 'string', enum: ['tien_mat', 'chuyen_khoan'] },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await phieuChiService.updatePhieuChi(Number(request.params.id), request.body, request.user);
      return { success: true, data };
    },
  });

  fastify.patch('/:id/huy', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    handler: async (request) => {
      await phieuChiService.huyPhieuChi(Number(request.params.id));
      return { success: true, message: 'Đã hủy phiếu chi' };
    },
  });

  fastify.get('/:id/pdf-preview', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'accountant'])],
    handler: async (request) => {
      const pdfBuffer = await generatePhieuChiPDF(Number(request.params.id));
      return { success: true, data: { base64: pdfBuffer.toString('base64') } };
    },
  });
}
