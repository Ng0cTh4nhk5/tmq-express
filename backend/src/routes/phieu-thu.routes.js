import { generatePhieuThuPDF } from '../services/pdf.service.js';
import prisma from '../config/database.js';

export default async function phieuThuRoutes(fastify) {
  // GET /api/phieu-thu/:id/pdf-preview
  // Trả base64 PDF của PhieuThu — dùng để in xác nhận thu cước nhận / thu công nợ
  fastify.get('/:id/pdf-preview', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly', 'staff'])],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
      },
    },
    handler: async (request) => {
      const phieuThu = await prisma.phieuThu.findUnique({
        where: { id: Number(request.params.id) },
        select: { id: true, van_phong_id: true, nhan_vien_id: true },
      });
      if (!phieuThu) {
        throw Object.assign(new Error('Không tìm thấy phiếu thu'), { statusCode: 404 });
      }
      // [FIX-VP] Staff chỉ xem phiếu của VP mình
      if (
        request.user.role !== 'admin' && request.user.role !== 'quan_ly' &&
        phieuThu.van_phong_id !== request.user.van_phong_id
      ) {
        throw Object.assign(new Error('Không có quyền xem phiếu này'), { statusCode: 403 });
      }
      const buffer = await generatePhieuThuPDF(
        Number(request.params.id),
        { nhan_vien_ten: request.user.ten },
      );
      return {
        success: true,
        data: { base64: buffer.toString('base64') },
      };
    },
  });
}
