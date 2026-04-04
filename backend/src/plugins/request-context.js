import { AsyncLocalStorage } from 'node:async_hooks';
import fp from 'fastify-plugin';

/** 
 * AsyncLocalStorage for passing request context (user, IP, UA) 
 * down to Prisma middleware/extensions without explicit parameter drilling.
 */
export const requestContext = new AsyncLocalStorage();

async function requestContextPlugin(fastify) {
  // Wrap every request in AsyncLocalStorage context
  fastify.addHook('onRequest', (request, reply, done) => {
    const store = {
      userId: null,
      userName: null,
      ip: request.ip,
      userAgent: request.headers['user-agent'] || null,
    };
    requestContext.run(store, done);
  });

  // After authenticate, update the store with user info
  fastify.addHook('preHandler', (request, reply, done) => {
    if (request.user) {
      const store = requestContext.getStore();
      if (store) {
        store.userId = request.user.id;
        store.userName = request.user.ten || null;
      }
    }
    done();
  });
}

export default fp(requestContextPlugin, {
  name: 'request-context',
});
