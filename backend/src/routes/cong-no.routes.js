import * as congNoService from '../services/cong-no.service.js';

export default async function congNoRoutes(fastify) {
  // GET /api/cong-no
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          thang:     { type: 'integer', minimum: 1, maximum: 12 },
          nam:       { type: 'integer', minimum: 2020, maximum: 2030 },
          doi_tuong: { type: 'string' },
          trang_thai:{ type: 'string' },
          from:      { type: 'string' },
          to:        { type: 'string' },
          page:      { type: 'integer', minimum: 1 },
          limit:     { type: 'integer', minimum: 1, maximum: 100 },
        },
      },
    },
    handler: async (request) => {
      const result = await congNoService.listCongNo(request.query);
      return { success: true, ...result };
    },
  });

  // POST /api/cong-no/:id/xac-nhan-thanh-toan
  fastify.post('/:id/xac-nhan-thanh-toan', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
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

  // GET /api/cong-no/report — Báo cáo công nợ chi tiết
  fastify.get('/report', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          doi_tuong: { type: 'string' },
          from:      { type: 'string' },
          to:        { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const { doi_tuong, from, to } = request.query;
      const result = await congNoService.reportCongNo(doi_tuong, from, to);
      return { success: true, ...result };
    },
  });

  // GET /api/cong-no/doi-soat — Đối soát cước tháng
  fastify.get('/doi-soat', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          doi_tuong: { type: 'string' },
          thang:     { type: 'integer', minimum: 1, maximum: 12 },
          nam:       { type: 'integer', minimum: 2020, maximum: 2030 },
        },
      },
    },
    handler: async (request) => {
      const { doi_tuong, thang, nam } = request.query;
      const result = await congNoService.doiSoatCuoc(doi_tuong, thang, nam);
      return { success: true, data: result };
    },
  });

  // GET /api/cong-no/bang-ke-thang?thang=4&nam=2026
  fastify.get('/bang-ke-thang', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
    schema: {
      querystring: {
        type: 'object',
        required: ['thang', 'nam'],
        properties: {
          thang: { type: 'integer', minimum: 1, maximum: 12 },
          nam:   { type: 'integer', minimum: 2020, maximum: 2030 },
        },
      },
    },
    handler: async (request) => {
      const { thang, nam } = request.query;
      const groups = await congNoService.bangKeCongNoTheoThang(thang, nam);
      // Chỉ trả summary, không trả items chi tiết
      const summary = groups.map(({ items, ...rest }) => rest);
      const tong = {
        so_cong_no: summary.reduce((s, g) => s + g.so_cong_no, 0),
        tong:     summary.reduce((s, g) => s + g.tong, 0),
        da_thu:   summary.reduce((s, g) => s + g.da_thu, 0),
        con_no:   summary.reduce((s, g) => s + g.con_no, 0),
      };
      return { success: true, data: summary, tong };
    },
  });

  // GET /api/cong-no/bang-ke-thang/export?thang=4&nam=2026&doi_tuong=Cty+ABC
  fastify.get('/bang-ke-thang/export', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
    schema: {
      querystring: {
        type: 'object',
        required: ['thang', 'nam'],
        properties: {
          thang:     { type: 'integer', minimum: 1, maximum: 12 },
          nam:       { type: 'integer', minimum: 2020, maximum: 2030 },
          doi_tuong: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const { thang, nam, doi_tuong } = request.query;
      const { buffer, ten_file } = await congNoService.exportBangKeCongNo(thang, nam, doi_tuong || null);
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

  // GET /api/cong-no/bang-ke-thang/export-pdf?thang=4&nam=2026&doi_tuong=CtyABC
  fastify.get('/bang-ke-thang/export-pdf', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
    schema: {
      querystring: {
        type: 'object',
        required: ['thang', 'nam', 'doi_tuong'],
        properties: {
          thang:     { type: 'integer', minimum: 1, maximum: 12 },
          nam:       { type: 'integer', minimum: 2020, maximum: 2030 },
          doi_tuong: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const { thang, nam, doi_tuong } = request.query;
      const { buffer, filename } = await congNoService.exportCongNoPDF(thang, nam, doi_tuong);
      return {
        success: true,
        data: {
          file: {
            name: filename,
            base64: Buffer.from(buffer).toString('base64'),
          },
        },
      };
    },
  });

  // GET /api/cong-no/doi-soat-chi-tiet?thang=4&nam=2026
  fastify.get('/doi-soat-chi-tiet', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin', 'quan_ly'])],
    schema: {
      querystring: {
        type: 'object',
        required: ['thang', 'nam'],
        properties: {
          thang: { type: 'integer', minimum: 1, maximum: 12 },
          nam:   { type: 'integer', minimum: 2020, maximum: 2030 },
        },
      },
    },
    handler: async (request) => {
      const { thang, nam } = request.query;
      const result = await congNoService.doiSoatCuocChiTiet(thang, nam);
      return { success: true, ...result };
    },
  });
}
