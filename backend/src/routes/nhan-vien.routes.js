import * as nhanVienService from '../services/nhan-vien.service.js';

export default async function nhanVienRoutes(fastify) {
  // GET /api/nhan-vien
  fastify.get('/', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
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
          username: { type: 'string', minLength: 3 },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['admin', 'staff', 'accountant'] },
          van_phong_id: { type: 'integer' },
        },
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
      body: {
        type: 'object',
        properties: {
          ten: { type: 'string', minLength: 1 },
          role: { type: 'string', enum: ['admin', 'staff', 'accountant'] },
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
    handler: async (request) => {
      const result = await nhanVienService.resetPassword(Number(request.params.id));
      return {
        success: true,
        data: { tempPassword: result.tempPassword },
        message: 'Đã reset mật khẩu. NV sẽ phải đổi khi đăng nhập.',
      };
    },
  });
}
