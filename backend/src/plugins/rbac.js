import fp from 'fastify-plugin';

async function rbacPlugin(fastify) {
  /**
   * Route-level role check. Usage:
   *   { preHandler: [fastify.authenticate, fastify.authorize(['admin'])] }
   */
  fastify.decorate('authorize', (allowedRoles) => {
    return async (request, reply) => {
      const userRole = request.user?.role;
      if (!userRole || !allowedRoles.includes(userRole)) {
        reply.status(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Bạn không có quyền thực hiện thao tác này.',
          },
        });
      }
    };
  });
}

export default fp(rbacPlugin, { name: 'rbac' });
