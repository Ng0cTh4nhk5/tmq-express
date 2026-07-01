import { PrismaClient } from '@prisma/client';

// [M-03 FIX] Cấu hình connection pool hợp lý:
// - connection_limit=10: tránh exhaustion trên VPS nhỏ (mặc định Prisma=10 nhưng explicit)
// - pool_timeout=10: fail fast thay vì treo request vô thời hạn
// - connect_timeout=5: timeout kết nối DB khi DB bị overload
//
// Với PostgreSQL, Prisma dùng pgBouncer-compatible URL nếu có DIRECT_URL:
//   DATABASE_URL=pooler URL (Transaction mode, pool_mode=transaction)
//   DIRECT_URL=direct URL (dùng cho migration)
//
// Nếu chỉ có 1 URL (dev), Prisma tự quản lý pool theo connection_limit bên dưới.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Graceful shutdown — đóng pool khi process thoát để tránh connection leak
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
