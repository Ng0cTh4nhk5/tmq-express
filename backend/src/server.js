import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import prisma from './config/database.js';

import env from './config/env.js';
import errorHandler from './plugins/error-handler.js';
import requestContextPlugin from './plugins/request-context.js';
import authPlugin from './plugins/auth.js';
import rbacPlugin from './plugins/rbac.js';

import authRoutes from './routes/auth.routes.js';
import vanPhongRoutes from './routes/van-phong.routes.js';
import khachHangRoutes from './routes/khach-hang.routes.js';
import bienNhanRoutes from './routes/bien-nhan.routes.js';
import scanRoutes from './routes/scan.routes.js';
import bangKeRoutes from './routes/bang-ke.routes.js';
import nhanVienRoutes from './routes/nhan-vien.routes.js';
import phieuThuRoutes from './routes/phieu-thu.routes.js';
import phieuChiRoutes from './routes/phieu-chi.routes.js';
import congNoRoutes from './routes/cong-no.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import baoCaoRoutes from './routes/bao-cao.routes.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// ---- Plugins ----
await fastify.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await fastify.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: env.JWT_EXPIRES_IN },
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await fastify.register(errorHandler);
await fastify.register(requestContextPlugin);
await fastify.register(authPlugin);
await fastify.register(rbacPlugin);

// ---- Routes ----
fastify.get('/api/health', async () => ({
  success: true,
  data: { status: 'ok', timestamp: new Date().toISOString() },
}));

await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(vanPhongRoutes, { prefix: '/api/van-phong' });
await fastify.register(khachHangRoutes, { prefix: '/api/khach-hang' });
await fastify.register(bienNhanRoutes, { prefix: '/api/bien-nhan' });
await fastify.register(scanRoutes, { prefix: '/api/scan' });
await fastify.register(bangKeRoutes, { prefix: '/api/bang-ke' });
await fastify.register(nhanVienRoutes, { prefix: '/api/nhan-vien' });
await fastify.register(phieuThuRoutes, { prefix: '/api/phieu-thu' });
await fastify.register(phieuChiRoutes, { prefix: '/api/phieu-chi' });
await fastify.register(congNoRoutes, { prefix: '/api/cong-no' });
await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
await fastify.register(baoCaoRoutes, { prefix: '/api/bao-cao' });

// ---- Graceful Shutdown ----
const shutdown = async (signal) => {
  fastify.log.info(`${signal} received. Shutting down gracefully...`);
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
};
['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));

// ---- Start ----
try {
  await fastify.listen({ port: env.PORT, host: env.HOST });
  fastify.log.info(`🚀 TMQ Express API running at http://${env.HOST}:${env.PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
