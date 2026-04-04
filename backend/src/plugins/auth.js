import fp from 'fastify-plugin';
import prisma from '../config/database.js';

async function authPlugin(fastify) {
  // Decorator to verify JWT and check token_version (S-04)
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();

      // S-04: Verify token has not been revoked via token_version
      const dbUser = await prisma.nhanVien.findUnique({
        where: { id: request.user.id },
        select: { token_version: true, active: true, ten: true },
      });

      if (!dbUser || !dbUser.active) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Tài khoản đã bị vô hiệu hóa.',
          },
        });
      }

      if (dbUser.token_version !== request.user.tv) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'TOKEN_REVOKED',
            message: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
          },
        });
      }

      // Attach ten (name) for PDF watermark and audit log
      request.user.ten = dbUser.ten;
    } catch (err) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
        },
      });
    }
  });
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['@fastify/jwt'],
});
