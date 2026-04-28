// tests/helpers/setup.js
// ─────────────────────────────────────────────────────────
// Helper dùng chung cho tất cả file test.
// Tạo 1 Fastify app instance và gọi API qua inject()
// (không cần mở HTTP server thật).
// ─────────────────────────────────────────────────────────
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';

import errorHandler from '../../src/plugins/error-handler.js';
import requestContextPlugin from '../../src/plugins/request-context.js';
import authPlugin from '../../src/plugins/auth.js';
import rbacPlugin from '../../src/plugins/rbac.js';

import authRoutes from '../../src/routes/auth.routes.js';
import vanPhongRoutes from '../../src/routes/van-phong.routes.js';
import khachHangRoutes from '../../src/routes/khach-hang.routes.js';
import bienNhanRoutes from '../../src/routes/bien-nhan.routes.js';
import scanRoutes from '../../src/routes/scan.routes.js';
import nhanVienRoutes from '../../src/routes/nhan-vien.routes.js';
import chanhRoutes from '../../src/routes/chanh.routes.js';
import congNoRoutes from '../../src/routes/cong-no.routes.js';
import doanhThuRoutes from '../../src/routes/doanh-thu.routes.js';
import bangKeRoutes from '../../src/routes/bang-ke.routes.js';
import doanhNghiepHDDTRoutes from '../../src/routes/doanh-nghiep-hddt.routes.js';
import thuHoRoutes from '../../src/routes/thu-ho.routes.js';

/**
 * Tạo Fastify app cho test (KHÔNG listen port).
 * Rate limit disabled hoàn toàn để test lockout không bị 429.
 */
export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-secret-key-1234567890',
  });
  // Vô hiệu hóa rate limit bằng cách dùng key ngẫu nhiên mỗi request
  // → mỗi request có bucket riêng, không bao giờ bị 429
  await app.register(rateLimit, {
    max: 1,
    timeWindow: '1 minute',
    keyGenerator: () => Math.random().toString(36), // key unique → không bao giờ cộng dồn
  });

  await app.register(errorHandler);
  await app.register(requestContextPlugin);
  await app.register(authPlugin);
  await app.register(rbacPlugin);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(vanPhongRoutes, { prefix: '/api/van-phong' });
  await app.register(khachHangRoutes, { prefix: '/api/khach-hang' });
  await app.register(bienNhanRoutes, { prefix: '/api/bien-nhan' });
  await app.register(scanRoutes, { prefix: '/api/scan' });
  await app.register(nhanVienRoutes, { prefix: '/api/nhan-vien' });
  await app.register(chanhRoutes, { prefix: '/api/chanh' });
  await app.register(congNoRoutes, { prefix: '/api/cong-no' });
  await app.register(doanhThuRoutes, { prefix: '/api/doanh-thu' });
  await app.register(bangKeRoutes, { prefix: '/api/bang-ke' });
  await app.register(doanhNghiepHDDTRoutes, { prefix: '/api/doanh-nghiep-hddt' });
  await app.register(thuHoRoutes, { prefix: '/api/thu-ho' });

  await app.ready();
  return app;
}

/**
 * Đăng nhập và lấy JWT token.
 * @returns {string|null} JWT token hoặc null nếu login thất bại
 */
export async function getToken(app, username = 'admin', password = 'Tmq@1234') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });
  const body = JSON.parse(res.body);
  return body.data?.token || null;
}

/**
 * Gọi API có kèm token auth.
 */
export async function authRequest(app, { method, url, payload, token }) {
  return app.inject({
    method,
    url,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });
}
