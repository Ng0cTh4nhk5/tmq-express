import fp from 'fastify-plugin';

async function authPlugin(fastify) {
  // Decorator to verify JWT and attach user to request
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
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
