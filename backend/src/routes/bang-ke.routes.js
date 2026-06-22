import { getBienNhanCho, createBangKe, listBangKe, downloadBangKe } from '../services/bang-ke.service.js';

// [H-SEC-04] Date pattern: YYYY-MM-DD — bắt buộc để tránh dump toàn bộ lịch sử
const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$';

export default async function bangKeRoutes(fastify) {
  // GET /api/bang-ke/bien-nhan-cho?ngay=YYYY-MM-DD
  fastify.get('/bien-nhan-cho', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      querystring: {
        type: 'object',
        required: ['ngay'],
        properties: {
          ngay: { type: 'string', pattern: DATE_PATTERN },
          vp_gui: { type: 'integer' },
          vp_nhan: { type: 'integer' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await getBienNhanCho(request.query);
      return { success: true, data };
    },
  });

  // POST /api/bang-ke — Tạo bảng kê (Case A + B)
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['items'],
        properties: {
          bien_so_xe: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                bien_nhan_id: { type: ['integer', 'null'] },
                // Overrides cho Case A
                hang_hoa:    { type: 'string' },
                gia_cuoc:    { type: 'number', minimum: 0 },
                // Required cho Case B
                ngay:        { type: 'string' },
                tuyen:       { type: 'string' },
                nguoi_gui:   { type: 'string' },
                dia_chi_gui: { type: 'string' },
              },
            },
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const { bangKe, buffer, ten_file } = await createBangKe(request.body);
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

  // GET /api/bang-ke — Lịch sử
  // [H-SEC-04] Thêm date guard bắt buộc để tránh load toàn bộ lịch sử
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      querystring: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: { type: 'string', pattern: DATE_PATTERN },
          to:   { type: 'string', pattern: DATE_PATTERN },
          page:  { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await listBangKe(request.query);
      return { success: true, ...result };
    },
  });

  // GET /api/bang-ke/:id/download
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
