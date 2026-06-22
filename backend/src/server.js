import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
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
import congNoRoutes from './routes/cong-no.routes.js';
import doanhThuRoutes from './routes/doanh-thu.routes.js';
import chanhRoutes from './routes/chanh.routes.js';
import doanhNghiepHDDTRoutes from './routes/doanh-nghiep-hddt.routes.js';
import thuHoRoutes from './routes/thu-ho.routes.js';
import phieuChuyenCodRoutes from './routes/phieu-chuyen-cod.routes.js';
import bienNhanThuHoRoutes from './routes/bien-nhan-thu-ho.routes.js';
import cuocNhanRoutes from './routes/cuoc-nhan.routes.js';
import phieuThuRoutes from './routes/phieu-thu.routes.js';
import doanhNghiepRoutes from './routes/doanh-nghiep.routes.js';
import baoCaoRoutes from './routes/bao-cao.routes.js';

const fastify = Fastify({
  bodyLimit: 1048576, // L-04: 1 MB — tránh abuse qua payload lớn
  // [M-SEC-02] trustProxy: true để ghi IP thực khi chạy sau Nginx/LB
  // Nếu không có proxy đứng trước, set = false (hoặc xoá dòng này)
  trustProxy: true,
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

// ---- Plugins ----
// L-01: Security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
await fastify.register(helmet, {
  // contentSecurityPolicy tắt để không chặn PDF inline viewer của frontend
  // Nếu API thuần JSON thì có thể bật lại với cấu hình phù hợp
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false, // Cho phép PDF viewer embed cross-origin
});

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
// L-06: /health chỉ trả 200 OK (không expose timestamp/details) — dùng cho load balancer ping
// Authenticated health check có thể dùng /api/auth/me thay thế
fastify.get('/api/health', async (request, reply) => {
  // [Phase3] Ping DB để xác nhận kết nối còn sống
  try {
    await prisma.$queryRaw`SELECT 1`;
    reply.status(200).send({ success: true, db: 'ok' });
  } catch (err) {
    fastify.log.error({ err }, 'Health check DB ping failed');
    reply.status(503).send({ success: false, db: 'error' });
  }
});

fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Không tìm thấy dữ liệu hoặc đường dẫn',
    },
  });
});


await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(vanPhongRoutes, { prefix: '/api/van-phong' });
await fastify.register(khachHangRoutes, { prefix: '/api/khach-hang' });
await fastify.register(bienNhanRoutes, { prefix: '/api/bien-nhan' });
await fastify.register(scanRoutes, { prefix: '/api/scan' });
await fastify.register(bangKeRoutes, { prefix: '/api/bang-ke' });
await fastify.register(nhanVienRoutes, { prefix: '/api/nhan-vien' });
await fastify.register(congNoRoutes, { prefix: '/api/cong-no' });
await fastify.register(doanhThuRoutes, { prefix: '/api/doanh-thu' });
await fastify.register(chanhRoutes, { prefix: '/api/chanh' });
await fastify.register(doanhNghiepHDDTRoutes, { prefix: '/api/doanh-nghiep-hddt' });
await fastify.register(thuHoRoutes, { prefix: '/api/thu-ho' });
await fastify.register(phieuChuyenCodRoutes, { prefix: '/api/phieu-chuyen-cod' });
await fastify.register(bienNhanThuHoRoutes, { prefix: '/api/bien-nhan-thu-ho' });
await fastify.register(cuocNhanRoutes, { prefix: '/api/cuoc-nhan' });
await fastify.register(phieuThuRoutes, { prefix: '/api/phieu-thu' });
await fastify.register(doanhNghiepRoutes, { prefix: '/api/doanh-nghiep' });
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
