import * as nhanVienService from '../services/nhan-vien.service.js';

// Schema dùng chung cho params :id
const paramsIdSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'integer', minimum: 1 } },
};

export default async function nhanVienRoutes(fastify) {
  // GET /api/nhan-vien
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          van_phong_id: { type: 'integer' },
          active:       { type: 'string', enum: ['true', 'false'] },
          page:         { type: 'integer', minimum: 1 },
          limit:        { type: 'integer', minimum: 1, maximum: 100 },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const result = await nhanVienService.listNhanVien(request.query);
      return { success: true, ...result };
    },
  });

  // POST /api/nhan-vien
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['ma_nv', 'ten', 'username', 'password', 'van_phong_id'],
        properties: {
          ma_nv: { type: 'string', minLength: 1 },
          ten: { type: 'string', minLength: 1 },
          // [FE-04] username: chỉ cho phép chữ thường, số, gạch dưới/ngang/chấm
          username: { type: 'string', minLength: 3, pattern: '^[a-z0-9_.\\-]+$' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['admin', 'quan_ly', 'staff'] },
          van_phong_id: { type: 'integer' },
          require_password_change: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await nhanVienService.createNhanVien(request.body);
      return { success: true, data };
    },
  });

  // PUT /api/nhan-vien/:id
  fastify.put('/:id', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      // [ROUTE-02] Validate params :id là integer
      params: paramsIdSchema,
      body: {
        type: 'object',
        properties: {
          ten: { type: 'string', minLength: 1 },
          role: { type: 'string', enum: ['admin', 'quan_ly', 'staff'] },
          van_phong_id: { type: 'integer' },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const data = await nhanVienService.updateNhanVien(Number(request.params.id), request.body);
      return { success: true, data };
    },
  });

  // PATCH /api/nhan-vien/:id/active
  fastify.patch('/:id/active', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      // [ROUTE-02] Validate params :id là integer
      params: paramsIdSchema,
      body: {
        type: 'object',
        required: ['active'],
        properties: { active: { type: 'boolean' } },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const targetId = Number(request.params.id);
      // Không cho admin tự deactivate chính mình
      if (targetId === request.user.id && !request.body.active) {
        throw Object.assign(
          new Error('Không thể vô hiệu hóa tài khoản đang đăng nhập'),
          { statusCode: 400 },
        );
      }
      await nhanVienService.toggleActive(targetId, request.body.active);
      return { success: true };
    },
  });

  // POST /api/nhan-vien/:id/reset-password
  fastify.post('/:id/reset-password', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    // [ROUTE-04] Per-route rate limit chặt hơn cho thao tác nhạy cảm
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      // [ROUTE-02] Validate params :id là integer
      params: paramsIdSchema,
    },
    handler: async (request) => {
      await nhanVienService.resetPassword(Number(request.params.id));
      // [H-SEC-02] Không trả tempPassword qua API — plain-text password trong network log là rui ro bảo mật.
      // NV sẽ được yêu cầu đặt mật khẩu mới khi đăng nhập (require_password_change = true).
      return {
        success: true,
        message: 'Đã reset mật khẩu. Nhân viên sẽ được yêu cầu đặt mật khẩu mới khi đăng nhập lần tiếp theo.',
      };
    },
  });

  // PATCH /api/nhan-vien/:id/unlock — L-07: Mở khóa tài khoản bị lock do brute force
  fastify.patch('/:id/unlock', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      params: paramsIdSchema,
    },
    handler: async (request) => {
      await nhanVienService.unlockAccount(Number(request.params.id));
      return { success: true, message: 'Đã mở khóa tài khoản thành công.' };
    },
  });
}
