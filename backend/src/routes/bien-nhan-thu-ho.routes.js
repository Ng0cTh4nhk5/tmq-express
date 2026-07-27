import prisma from '../config/database.js';
import { generateBienNhanThuHoPDF } from '../services/pdf.service.js';

export default async function bienNhanThuHoRoutes(fastify) {
  // GET /api/bien-nhan-thu-ho/:id — Xem BNTH theo bien_nhan_id
  fastify.get('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    },
    handler: async (request) => {
      const data = await prisma.bienNhanThuHo.findUnique({
        where: { bien_nhan_id: Number(request.params.id) },
        include: {
          bien_nhan:  { select: { ma_so: true, thu_ho: true, nguoi_nhan: true, don_vi_nhan: true, nguoi_gui: true, don_vi_gui: true } },
          van_phong:  { select: { ma_vp: true, ten: true } },
          nhan_vien:  { select: { ten: true } },
        },
      });

      if (!data) throw Object.assign(new Error('Chưa có biên nhận thu hộ cho biên nhận này'), { statusCode: 404 });
      return { success: true, data };
    },
  });

  // GET /api/bien-nhan-thu-ho/:id/pdf-preview — PDF phiếu thu hộ dạng base64
  // :id = bien_nhan_id (nhất quán với route GET /:id)
  fastify.get('/:id/pdf-preview', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
    },
    handler: async (request) => {
      const pdfBuffer = await generateBienNhanThuHoPDF(Number(request.params.id));
      return { success: true, data: { base64: pdfBuffer.toString('base64') } };
    },
  });
}

