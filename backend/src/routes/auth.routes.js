import { login, getProfile, changePassword } from '../services/auth.service.js';

export default async function authRoutes(fastify) {
  // POST /api/auth/login — Đăng nhập (rate limited: 5 req/min)
  fastify.post('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: async (request, reply) => {
      const { username, password } = request.body;
      const user = await login(username, password);

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Sai tài khoản hoặc mật khẩu',
          },
        });
      }

      const token = fastify.jwt.sign(
        { id: user.id, role: user.role, van_phong_id: user.van_phong.id },
      );

      return {
        success: true,
        data: { token, user },
      };
    },
  });

  // GET /api/auth/me — Thông tin user hiện tại
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const user = await getProfile(request.user.id);
      if (!user) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } };
      }
      return { success: true, data: user };
    },
  });

  // POST /api/auth/change-password — Đổi mật khẩu
  fastify.post('/change-password', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['current_password', 'new_password'],
        properties: {
          current_password: { type: 'string', minLength: 1 },
          new_password: { type: 'string', minLength: 6 },
        },
      },
    },
    handler: async (request) => {
      const { current_password, new_password } = request.body;
      await changePassword(request.user.id, current_password, new_password);
      return { success: true, message: 'Đổi mật khẩu thành công' };
    },
  });
}
