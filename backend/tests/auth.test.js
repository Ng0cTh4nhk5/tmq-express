// tests/auth.test.js
// ─────────────────────────────────────────────────────────
// Unit Test cho Module Xác thực (Auth) — 13 TC
// Tham chiếu: UT-AUTH-01 → UT-AUTH-13
//
// Chiến lược: tạo user test riêng trong beforeAll, xóa trong afterAll
// → không phụ thuộc seed data, idempotent
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken } from './helpers/setup.js';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';

// ── Test accounts ────────────────────────────────────────────────
const TEST_USER = 'test_auth_lock_user';   // Dùng cho lockout test
const TEST_PASS = 'Tmq@Test123';
let TEST_USER_VP_ID;  // VP ID sẽ được set trong beforeAll

describe('1.1 Module Auth — /api/auth (13 TC)', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();

    // Lấy VP đầu tiên (bất kỳ) để tạo NV test
    const vp = await prisma.vanPhong.findFirst();
    TEST_USER_VP_ID = vp.id;

    // Xóa nếu tồn tại từ lần chạy trước
    await prisma.nhanVien.deleteMany({ where: { username: TEST_USER } });

    // Tạo NV test với role staff
    const hash = await bcrypt.hash(TEST_PASS, 10);
    await prisma.nhanVien.create({
      data: {
        ma_nv: 'NV-TEST-AUTH',
        ten: 'Test Auth User',
        van_phong_id: TEST_USER_VP_ID,
        role: 'staff',
        username: TEST_USER,
        password_hash: hash,
        active: true,
        failed_login_count: 0,
      },
    });
  });

  afterAll(async () => {
    // Dọn dẹp: xóa NV test
    await prisma.nhanVien.deleteMany({ where: { username: TEST_USER } });
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // NEGATIVE — Test sai trước (không tăng token_version admin)
  // ════════════════════════════════════════════════════════

  it('UT-AUTH-02: Username không tồn tại → 401 UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'khong_ton_tai_xyz_999', password: 'abc123' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBeDefined();
  });

  it('UT-AUTH-03: Password sai → 401, failed_login_count tăng trong DB', async () => {
    // Reset count trước
    await prisma.nhanVien.updateMany({
      where: { username: TEST_USER },
      data: { failed_login_count: 0 },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_USER, password: 'sai_mat_khau_xyz' },
    });

    expect(res.statusCode).toBe(401);

    // Verify DB: failed_login_count tăng lên 1
    const updated = await prisma.nhanVien.findFirst({ where: { username: TEST_USER } });
    expect(updated.failed_login_count).toBe(1);
  });

  it('UT-AUTH-07: Tài khoản active=false → 401', async () => {
    // Deactivate test user
    await prisma.nhanVien.updateMany({
      where: { username: TEST_USER },
      data: { active: false },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_USER, password: TEST_PASS },
    });

    // Restore ngay
    await prisma.nhanVien.updateMany({
      where: { username: TEST_USER },
      data: { active: true, failed_login_count: 0 },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // SECURITY — Không có token / token giả
  // ════════════════════════════════════════════════════════

  it('UT-AUTH-12 (a) / SEC-01: Gọi API không token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('UT-AUTH-12 (b): Token giả (chữ ký sai) → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODg4fQ.bad_signature',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ════════════════════════════════════════════════════════
  // ACCOUNT LOCKOUT — test trên TEST_USER
  // ════════════════════════════════════════════════════════

  it('UT-AUTH-04: Sai password 5 lần → tài khoản bị khóa 15 phút', async () => {
    // Reset trước
    await prisma.nhanVien.updateMany({
      where: { username: TEST_USER },
      data: { failed_login_count: 0, locked_until: null, active: true },
    });

    // Login sai 5 lần (rate limit = random key → không bao giờ 429)
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_USER, password: 'wrong_password_attempt_' + i },
      });
    }

    // Verify DB: bị khóa
    const user = await prisma.nhanVien.findFirst({ where: { username: TEST_USER } });
    expect(user.failed_login_count).toBeGreaterThanOrEqual(5);
    expect(user.locked_until).not.toBeNull();
    // locked_until phải ở tương lai (khoảng 15 phút)
    expect(new Date(user.locked_until) > new Date()).toBe(true);
  });

  it('UT-AUTH-05: Login khi đang bị khóa → 423 ACCOUNT_LOCKED + locked_until', async () => {
    // TEST_USER phải đang bị khóa từ UT-AUTH-04
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_USER, password: TEST_PASS }, // Đúng MK vẫn bị block
    });

    expect(res.statusCode).toBe(423);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ACCOUNT_LOCKED');
    expect(body.error.locked_until).toBeDefined();
    expect(new Date(body.error.locked_until) > new Date()).toBe(true);
  });

  it('UT-AUTH-06: Admin mở khóa → đăng nhập lại thành công', async () => {
    // Simulate admin/hết thời gian: reset trong DB
    await prisma.nhanVien.updateMany({
      where: { username: TEST_USER },
      data: { failed_login_count: 0, locked_until: null },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_USER, password: TEST_PASS },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // HAPPY PATH
  // ════════════════════════════════════════════════════════

  it('UT-AUTH-01: Đăng nhập đúng → 200, JWT hợp lệ + user info đầy đủ', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'Tmq@1234' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    // JWT: 3 phần header.payload.signature
    expect(body.data.token).toBeDefined();
    expect(body.data.token.split('.').length).toBe(3);
    // User info đầy đủ
    expect(body.data.user.id).toBeDefined();
    expect(body.data.user.ma_nv).toBeDefined();
    expect(body.data.user.ten).toBeDefined();
    expect(body.data.user.role).toBe('admin');
    expect(body.data.user.van_phong).toBeDefined();
    expect(body.data.user.van_phong.ma_vp).toBeDefined();
    expect(body.data.user.require_password_change).toBeDefined();
    // Không lộ thông tin nhạy cảm
    expect(body.data.user.password_hash).toBeUndefined();
  });

  it('UT-AUTH-11: GET /me → 200, profile đầy đủ, không lộ password_hash', async () => {
    const token = await getToken(app, 'admin', 'Tmq@1234');
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.ma_nv).toBeDefined();
    expect(body.data.ten).toBeDefined();
    expect(body.data.role).toBe('admin');
    expect(body.data.van_phong.ma_vp).toBeDefined();
    // An toàn: không lộ
    expect(body.data.password_hash).toBeUndefined();
  });

  // ════════════════════════════════════════════════════════
  // ĐỔI MẬT KHẨU
  // ════════════════════════════════════════════════════════

  it('UT-AUTH-10: Đổi MK — new_password < 6 ký tự → 400 (schema validation)', async () => {
    const token = await getToken(app, 'admin', 'Tmq@1234');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { authorization: `Bearer ${token}` },
      payload: { current_password: 'Tmq@1234', new_password: 'abc' }, // 3 ký tự < 6
    });

    expect(res.statusCode).toBe(400);
  });

  it('UT-AUTH-09: Đổi MK — current_password sai → 400', async () => {
    const token = await getToken(app, 'admin', 'Tmq@1234');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { authorization: `Bearer ${token}` },
      payload: { current_password: 'sai_hoan_toan_xyz', new_password: 'NewPass123' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    // Error handler wrap trong body.error.message
    expect(body.error?.message || body.message).toContain('không đúng');
  });

  it('UT-AUTH-08: Đổi MK hợp lệ → 200, token cũ bị revoke (401)', async () => {
    // Dùng TEST_USER — đã được mở khóa từ UT-AUTH-06
    // Reset để đảm bảo active
    await prisma.nhanVien.updateMany({
      where: { username: TEST_USER },
      data: { active: true, failed_login_count: 0, locked_until: null },
    });

    const oldToken = await getToken(app, TEST_USER, TEST_PASS);
    expect(oldToken).not.toBeNull();

    // Đổi thành công
    const changeRes = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { authorization: `Bearer ${oldToken}` },
      payload: { current_password: TEST_PASS, new_password: 'NewPass@456' },
    });
    expect(changeRes.statusCode).toBe(200);
    expect(JSON.parse(changeRes.body).success).toBe(true);

    // Token cũ bị từ chối ngay (token_version đã tăng)
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${oldToken}` },
    });
    expect(meRes.statusCode).toBe(401);

    // ── RESTORE ──
    const newToken = await getToken(app, TEST_USER, 'NewPass@456');
    await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { authorization: `Bearer ${newToken}` },
      payload: { current_password: 'NewPass@456', new_password: TEST_PASS },
    });
  });

  // ════════════════════════════════════════════════════════
  // LOGIN LOG
  // ════════════════════════════════════════════════════════

  it('UT-AUTH-13: Login thành công → ghi LoginLog (action=login_success)', async () => {
    // Đếm log của admin trước
    const countBefore = await prisma.loginLog.count({
      where: { username: 'admin', action: 'login_success' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'Tmq@1234' },
    });
    expect(res.statusCode).toBe(200);

    const countAfter = await prisma.loginLog.count({
      where: { username: 'admin', action: 'login_success' },
    });
    expect(countAfter).toBe(countBefore + 1);
  });
});
