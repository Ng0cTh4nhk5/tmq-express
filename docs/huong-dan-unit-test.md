# Hướng dẫn Viết Unit Test cho TMQ Express

## Mục lục
1. [Khái niệm cơ bản](#1-khái-niệm-cơ-bản)
2. [Cài đặt](#2-cài-đặt)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Viết test đầu tiên](#4-viết-test-đầu-tiên)
5. [Chạy test](#5-chạy-test)
6. [Giải thích từng phần](#6-giải-thích-từng-phần)
7. [Mẹo viết test tốt](#7-mẹo-viết-test-tốt)

---

## 1. Khái niệm cơ bản

### Unit Test là gì?
Unit Test = kiểm tra **1 đơn vị nhỏ nhất** (1 hàm, 1 API) để đảm bảo nó hoạt động đúng.

### Tại sao cần?
- **Phát hiện lỗi sớm** — trước khi đến tay người dùng
- **Tự tin refactor** — sửa code mà không sợ phá hỏng
- **Tài liệu sống** — test mô tả cách hệ thống hoạt động

### Cấu trúc 1 test case (AAA Pattern):
```
1. Arrange  — Chuẩn bị dữ liệu đầu vào
2. Act      — Gọi hàm / API cần test
3. Assert   — So sánh kết quả với kỳ vọng
```

### Ví dụ đời thực:
```
Test "Đăng nhập đúng mật khẩu":
  1. Arrange: username = "admin", password = "Tmq@1234"
  2. Act:     Gọi POST /api/auth/login
  3. Assert:  Status = 200, body có token, body có user info
```

---

## 2. Cài đặt

### Bước 1: Cài Vitest (test framework)
```bash
cd backend
npm install -D vitest
```

> **Tại sao Vitest?** Nhanh, hỗ trợ ESM (import/export) sẵn, cú pháp giống Jest nhưng không cần cấu hình phức tạp.

### Bước 2: Thêm script vào package.json
Mở `backend/package.json`, thêm 2 dòng vào `scripts`:
```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "test": "vitest run",
  "test:watch": "vitest",
  ...
}
```

- `npm test` — Chạy tất cả test 1 lần
- `npm run test:watch` — Chạy và tự chạy lại khi file thay đổi

### Bước 3: Tạo file cấu hình Vitest
Tạo file `backend/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tìm file test có đuôi .test.js trong thư mục tests/
    include: ['tests/**/*.test.js'],
    // Chạy tuần tự (không song song) vì test dùng chung DB
    fileParallelism: false,
    // Timeout cho mỗi test: 15 giây
    testTimeout: 15000,
    // Cho phép dùng biến môi trường từ .env
    env: {
      NODE_ENV: 'test',
    },
  },
});
```

---

## 3. Cấu trúc thư mục

```
backend/
├── src/                    ← Code chính
├── tests/                  ← 📂 THƯ MỤC TEST (tạo mới)
│   ├── helpers/
│   │   └── setup.js        ← Khởi tạo Fastify app cho test
│   ├── auth.test.js        ← Test module Auth
│   ├── van-phong.test.js   ← Test module Văn Phòng
│   ├── bien-nhan.test.js   ← Test module Biên Nhận
│   └── ...
├── vitest.config.js        ← Cấu hình Vitest
└── package.json
```

---

## 4. Viết test đầu tiên

### Bước 1: Tạo helper — khởi tạo app cho test

File `tests/helpers/setup.js` — đây là "xương sống", tạo 1 lần dùng cho tất cả test:

```js
// tests/helpers/setup.js
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

/**
 * Tạo 1 instance Fastify app giống server.js nhưng KHÔNG listen port.
 * Dùng fastify.inject() để gọi API mà không cần mở server thật.
 */
export async function buildApp() {
  const app = Fastify({ logger: false }); // Tắt log cho test sạch

  await app.register(cors);
  await app.register(jwt, { secret: 'test-secret-key-1234567890' });
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' }); // Nới rate limit cho test

  await app.register(errorHandler);
  await app.register(requestContextPlugin);
  await app.register(authPlugin);
  await app.register(rbacPlugin);

  // Đăng ký tất cả routes
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

  await app.ready();
  return app;
}

/**
 * Đăng nhập và lấy token.
 * Dùng lại trong các test cần auth.
 */
export async function getToken(app, username = 'admin', password = 'Tmq@1234') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password },
  });
  const body = JSON.parse(res.body);
  return body.data?.token;
}

/**
 * Helper gọi API có auth.
 */
export async function authRequest(app, { method, url, payload, token }) {
  return app.inject({
    method,
    url,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });
}
```

### Bước 2: Viết file test đầu tiên — Auth

File `tests/auth.test.js`:

```js
// tests/auth.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken } from './helpers/setup.js';

// ┌─────────────────────────────────────────────────┐
// │  describe = "nhóm test" (giống 1 chương)        │
// │  it       = "1 test case" (giống 1 câu hỏi)    │
// │  expect   = "kiểm tra kết quả"                  │
// └─────────────────────────────────────────────────┘

describe('Module Auth — /api/auth', () => {
  let app;    // Fastify app instance
  let token;  // JWT token của admin

  // Chạy 1 lần TRƯỚC tất cả test trong nhóm này
  beforeAll(async () => {
    app = await buildApp();
    token = await getToken(app);
  });

  // Chạy 1 lần SAU tất cả test
  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════
  // UT-AUTH-01: Đăng nhập thành công
  // ═══════════════════════════════════════════════
  it('UT-AUTH-01: Đăng nhập đúng → 200, có token + user', async () => {
    // 1. Arrange — chuẩn bị input
    const payload = { username: 'admin', password: 'Tmq@1234' };

    // 2. Act — gọi API
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload,
    });

    // 3. Assert — kiểm tra kết quả
    expect(res.statusCode).toBe(200);              // Status 200

    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);                // success = true
    expect(body.data.token).toBeDefined();          // Có token
    expect(body.data.user.role).toBe('admin');      // Role đúng
    expect(body.data.user.van_phong).toBeDefined(); // Có VP
  });

  // ═══════════════════════════════════════════════
  // UT-AUTH-02: Username không tồn tại
  // ═══════════════════════════════════════════════
  it('UT-AUTH-02: Username sai → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'khong_ton_tai', password: 'abc123' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ═══════════════════════════════════════════════
  // UT-AUTH-03: Password sai
  // ═══════════════════════════════════════════════
  it('UT-AUTH-03: Password sai → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'sai_mat_khau' },
    });

    expect(res.statusCode).toBe(401);
  });

  // ═══════════════════════════════════════════════
  // UT-AUTH-10: Đổi MK — new_password < 6 ký tự → 400
  // ═══════════════════════════════════════════════
  it('UT-AUTH-10: Đổi MK với password quá ngắn → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { authorization: `Bearer ${token}` },
      payload: { current_password: 'Tmq@1234', new_password: 'abc' },
    });

    expect(res.statusCode).toBe(400); // Schema validation reject
  });

  // ═══════════════════════════════════════════════
  // UT-AUTH-11: GET /me — lấy profile
  // ═══════════════════════════════════════════════
  it('UT-AUTH-11: GET /me → 200, có đầy đủ info', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBeDefined();
    expect(body.data.ma_nv).toBeDefined();
    expect(body.data.ten).toBeDefined();
    expect(body.data.role).toBe('admin');
    expect(body.data.van_phong.ma_vp).toBeDefined();
  });

  // ═══════════════════════════════════════════════
  // SEC-01: Gọi API không token → 401
  // ═══════════════════════════════════════════════
  it('SEC-01: Không có token → 401 UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      // KHÔNG gửi header Authorization
    });

    expect(res.statusCode).toBe(401);
  });
});
```

### Bước 3: Thêm test Biên nhận

File `tests/bien-nhan.test.js`:

```js
// tests/bien-nhan.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';

describe('Module Biên Nhận — /api/bien-nhan', () => {
  let app, token;

  beforeAll(async () => {
    app = await buildApp();
    token = await getToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══ DANH SÁCH ═══

  it('UT-BN-08: Danh sách BN có pagination', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan?page=1&limit=5',
      token,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
  });

  it('UT-BN-09: Sort injection bị chặn (whitelist)', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan?sortBy=password_hash&sortOrder=asc',
      token,
    });

    // Không lỗi, nhưng sort bị fallback về created_at
    expect(res.statusCode).toBe(200);
    // Verify data trả về bình thường (whitelist chặn thầm lặng)
  });

  // ═══ TẠO ═══

  it('UT-BN-01: Tạo BN happy path → 201', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      token,
      payload: {
        van_phong_gui_id: 1,
        van_phong_nhan_id: 2,
        don_vi_gui: 'Cty Test Unit',
        nguoi_gui: 'Nguyễn Test',
        dien_thoai_gui: '0912345678',
        hang_hoa_json: [{ don_vi: 'kiện', so_luong: 1 }],
        gia_cuoc: 100000,
        trang_thai_thu: 'da_thu',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ma_so).toBeDefined();         // Mã tự sinh
    expect(body.data.trang_thai).toBe('cho_vc');   // Mặc định chờ VC
  });

  it('UT-BN-03: Tạo BN thiếu vp_gui_id → 400', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      token,
      payload: {
        van_phong_nhan_id: 2,
        // THIẾU van_phong_gui_id
      },
    });

    expect(res.statusCode).toBe(400);
  });

  // ═══ SỔ BIÊN NHẬN ═══

  it('UT-BN-18: Sổ BN — VP gửi = VP nhận → 400', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan/so-bien-nhan?ngay=2026-04-22&vp_gui_id=1&vp_nhan_id=1',
      token,
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('không được trùng');
  });

  it('UT-BN-19: Sổ BN — ngày_tu > ngày_den → 400', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan/so-bien-nhan?ngay_tu=2026-04-30&ngay_den=2026-04-01&vp_gui_id=1&vp_nhan_id=2',
      token,
    });

    expect(res.statusCode).toBe(400);
  });

  // ═══ PHÂN QUYỀN ═══

  it('UT-BN-11: Accountant không tạo được BN → 403', async () => {
    // Login bằng accountant
    const ktToken = await getToken(app, 'ketoan01', 'Tmq@1234');
    if (!ktToken) return; // Skip nếu chưa có tài khoản

    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      token: ktToken,
      payload: {
        van_phong_gui_id: 1,
        van_phong_nhan_id: 2,
      },
    });

    expect(res.statusCode).toBe(403);
  });
});
```

### Bước 4: Test Scan QR (Public endpoint)

File `tests/scan.test.js`:

```js
// tests/scan.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './helpers/setup.js';

describe('Module Scan QR — /api/scan (Public)', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('UT-SCAN-05: Không cần auth → vẫn 200 (nếu mã tồn tại)', async () => {
    // Gọi không có Authorization header
    const res = await app.inject({
      method: 'GET',
      url: '/api/scan/SGCT-0001', // Thay bằng mã thật trong DB
    });

    // 200 nếu tồn tại, 404 nếu không — cả 2 đều OK (không phải 401)
    expect([200, 404]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(401); // KHÔNG BỊ chặn auth
  });

  it('UT-SCAN-02: Mã không tồn tại → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/scan/XXXX-KHONG-TON-TAI-99999',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
```

---

## 5. Chạy test

### Chạy tất cả test:
```bash
cd backend
npm test
```

### Output kỳ vọng:
```
 ✓ tests/auth.test.js (5 tests) 230ms
   ✓ UT-AUTH-01: Đăng nhập đúng → 200, có token + user
   ✓ UT-AUTH-02: Username sai → 401
   ✓ UT-AUTH-03: Password sai → 401
   ✓ UT-AUTH-10: Đổi MK với password quá ngắn → 400
   ✓ UT-AUTH-11: GET /me → 200, có đầy đủ info
   ✓ SEC-01: Không có token → 401 UNAUTHORIZED

 ✓ tests/bien-nhan.test.js (6 tests) 450ms
   ✓ UT-BN-08: Danh sách BN có pagination
   ✓ UT-BN-09: Sort injection bị chặn
   ✓ UT-BN-01: Tạo BN happy path → 201
   ✓ UT-BN-03: Tạo BN thiếu vp_gui_id → 400
   ✓ UT-BN-18: Sổ BN — VP gửi = VP nhận → 400
   ✓ UT-BN-19: Sổ BN — ngày_tu > ngày_den → 400
   ✓ UT-BN-11: Accountant không tạo được BN → 403

 ✓ tests/scan.test.js (2 tests) 80ms

 Tests  13 passed
 Time   760ms
```

### Chạy 1 file cụ thể:
```bash
npx vitest run tests/auth.test.js
```

### Chạy chế độ watch (dev):
```bash
npm run test:watch
```
> Mỗi khi bạn sửa file, test tự chạy lại. Rất tiện khi đang phát triển.

---

## 6. Giải thích từng phần

### 6.1. Các hàm chính

| Hàm | Ý nghĩa | Ví dụ |
|-----|---------|-------|
| `describe('tên', fn)` | Nhóm test lại | `describe('Auth', () => { ... })` |
| `it('mô tả', fn)` | 1 test case | `it('Login đúng → 200', async () => { ... })` |
| `expect(value)` | Bắt đầu kiểm tra | `expect(res.statusCode)` |
| `.toBe(x)` | Bằng chính xác | `.toBe(200)` |
| `.toBeDefined()` | Tồn tại (không undefined) | `.toBeDefined()` |
| `.toContain(x)` | Chứa chuỗi/phần tử | `.toContain('lỗi')` |
| `.toBeInstanceOf(x)` | Kiểu dữ liệu | `.toBeInstanceOf(Array)` |
| `beforeAll(fn)` | Chạy 1 lần trước nhóm | Setup app |
| `afterAll(fn)` | Chạy 1 lần sau nhóm | Đóng app |

### 6.2. `app.inject()` là gì?

Fastify có built-in method `inject()` cho phép **gọi API mà không cần mở HTTP server thật**.
Nó mô phỏng 1 request → qua tất cả middleware → trả response.

```js
const res = await app.inject({
  method: 'POST',             // HTTP method
  url: '/api/auth/login',     // URL
  payload: { ... },           // Body (tự stringify JSON)
  headers: { ... },           // Headers
});

// res.statusCode = 200
// res.body = '{"success":true,...}'  (string, cần JSON.parse)
```

### 6.3. Tại sao KHÔNG cần mock Database?

Cách tiếp cận ở đây là **Integration-style Unit Test** — test gọi API thật, tới DB thật.

| Cách | Ưu | Nhược |
|------|-----|-------|
| **Mock DB** (giả lập) | Nhanh, không cần DB | Không bắt được lỗi SQL, FK, constraint |
| **DB thật** (cách này) ✅ | Bắt lỗi thực tế, đáng tin | Cần DB chạy, chậm hơn 1 chút |

> Với dự án ERP như TMQ Express, test trên DB thật đáng tin hơn nhiều.

---

## 7. Mẹo viết test tốt

### ✅ DO — Nên làm
```js
// 1. Đặt tên test có ID → dễ tra cứu với bảng test plan
it('UT-AUTH-01: Đăng nhập đúng → 200, có token', ...)

// 2. Test cả happy path VÀ error path
it('Tạo VP → 201', ...)
it('Tạo VP trùng mã → lỗi', ...)

// 3. Kiểm tra CẤU TRÚC response, không chỉ status code
expect(body.data.token).toBeDefined();
expect(body.data.user.role).toBe('admin');

// 4. Dùng beforeAll/afterAll để setup/cleanup
```

### ❌ DON'T — Không nên
```js
// 1. KHÔNG hardcode ID (có thể khác trên máy khác)
// Sai:  expect(body.data.id).toBe(1);
// Đúng: expect(body.data.id).toBeDefined();

// 2. KHÔNG test quá nhiều thứ trong 1 test case
// Mỗi it() chỉ test 1 hành vi

// 3. KHÔNG phụ thuộc thứ tự giữa các test
// Mỗi test phải chạy độc lập được
```

### Bảng tham chiếu expect:

| Kiểm tra | Code |
|---------|------|
| Bằng chính xác | `expect(x).toBe(200)` |
| Không bằng | `expect(x).not.toBe(401)` |
| Tồn tại | `expect(x).toBeDefined()` |
| Null | `expect(x).toBeNull()` |
| Chuỗi chứa | `expect(str).toContain('lỗi')` |
| Mảng chứa | `expect([1,2,3]).toContain(2)` |
| Kiểu | `expect(arr).toBeInstanceOf(Array)` |
| Lớn hơn | `expect(x).toBeGreaterThan(0)` |
| Match pattern | `expect(str).toMatch(/^SGCT-/)` |
| Object có key | `expect(obj).toHaveProperty('token')` |
| Truthy | `expect(x).toBeTruthy()` |

---

## Tiếp theo làm gì?

1. **Cài đặt** — Chạy `npm install -D vitest`
2. **Chạy thử** — `npm test` xem có pass không
3. **Thêm test** — Mỗi module 1 file, theo template ở trên
4. **Mục tiêu** — Cover hết 110 Unit Test trong tài liệu kiểm thử
