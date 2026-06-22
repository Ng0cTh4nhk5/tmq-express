import { login, logout, getProfile, changePassword } from '../services/auth.service.js';

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
        additionalProperties: false,
      },
    },
    handler: async (request, reply) => {
      const { username, password } = request.body;
      const result = await login(username, password, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // S-03: Account locked
      if (result && result.error === 'ACCOUNT_LOCKED') {
        return reply.status(423).send({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần.',
            locked_until: result.locked_until,
          },
        });
      }

      // Wrong credentials or inactive
      if (!result) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Sai tài khoản hoặc mật khẩu',
          },
        });
      }

      // S-04: Include token_version in JWT payload
      const token = fastify.jwt.sign({
        id: result.id,
        role: result.role,
        van_phong_id: result.van_phong.id,
        tv: result.token_version,
      });

      return {
        success: true,
        data: { token, user: result },
      };
    },
  });

  // GET /api/auth/me — Thông tin user hiện tại
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      const user = await getProfile(request.user.id);
      if (!user) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy người dùng' } };
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
          // [M-SEC-01] Password policy: tối thiểu 8 ký tự, ít nhất 1 chữ cái và 1 chữ số
          new_password: {
            type: 'string',
            minLength: 8,
            maxLength: 128,
            pattern: '^(?=.*[A-Za-z])(?=.*\\d).{8,}$',
            errorMessage: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm cả chữ cái và chữ số',
          },
        },
        additionalProperties: false,
      },
    },
    handler: async (request) => {
      const { current_password, new_password } = request.body;
      await changePassword(request.user.id, current_password, new_password);
      return { success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' };
    },
  });

  // POST /api/auth/logout — [M-SEC-06] Invalidate token bằng cách increment token_version
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
    handler: async (request) => {
      await logout(request.user.id);
      return { success: true, message: 'Đăng xuất thành công.' };
    },
  });
}
