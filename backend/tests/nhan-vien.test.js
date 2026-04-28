// tests/nhan-vien.test.js
// ─────────────────────────────────────────────────────────
// Unit Test cho Module Nhân viên — 8 TC
// Tham chiếu: UT-NV-01 → UT-NV-08
//
// Chiến lược: tạo NV test riêng, xóa trong afterAll
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

const TEST_USERNAME = 'nv_test_unit_1234';
const TEST_MA_NV    = 'NV-TEST-UNIT';

describe('1.3 Module Nhân viên — /api/nhan-vien (8 TC)', () => {
  let app, adminToken, adminId;
  let createdNvId;
  let vpId;

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');

    // Lấy admin ID để test UT-NV-07
    const admin = await prisma.nhanVien.findFirst({ where: { username: 'admin' } });
    adminId = admin.id;

    // Lấy VP ID đầu tiên để tạo NV
    const vp = await prisma.vanPhong.findFirst();
    vpId = vp.id;

    // Dọn NV test từ lần chạy trước
    await prisma.nhanVien.deleteMany({ where: { username: TEST_USERNAME } });
  });

  afterAll(async () => {
    await prisma.nhanVien.deleteMany({ where: { username: TEST_USERNAME } });
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-01: Danh sách NV (admin only)
  // ════════════════════════════════════════════════════════

  it('UT-NV-01: GET /nhan-vien (admin) → 200, data + pagination', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/nhan-vien',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    // Không lộ password_hash trong danh sách
    body.data.forEach((nv) => {
      expect(nv.password_hash).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-02: Tạo NV mới
  // ════════════════════════════════════════════════════════

  it('UT-NV-02: POST /nhan-vien → 200, NV được tạo đúng', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/nhan-vien',
      token: adminToken,
      payload: {
        ma_nv: TEST_MA_NV,
        ten: 'Nhân Viên Test',
        username: TEST_USERNAME,
        password: 'Test@1234',
        role: 'staff',
        van_phong_id: vpId,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.username).toBe(TEST_USERNAME);
    expect(body.data.role).toBe('staff');
    // Service select không trả active → verify qua DB
    const nv = await prisma.nhanVien.findFirst({ where: { username: TEST_USERNAME } });
    expect(nv.active).toBe(true);
    // Không lộ password_hash trong response
    expect(body.data.password_hash).toBeUndefined();

    createdNvId = body.data.id;
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-03: Tạo NV trùng username → lỗi unique
  // ════════════════════════════════════════════════════════

  it('UT-NV-03: POST /nhan-vien — username trùng → 409 CONFLICT', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/nhan-vien',
      token: adminToken,
      payload: {
        ma_nv: 'NV-DUP',
        ten: 'Nhân Viên Trùng',
        username: TEST_USERNAME, // Đã tồn tại từ UT-NV-02
        password: 'Test@1234',
        van_phong_id: vpId,
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    // Service throw custom error (không phải Prisma P2002)
    // error handler gán statusCode=409 đúng
    expect(body.error).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-04: Tạo NV — password < 6 ký tự → 400
  // ════════════════════════════════════════════════════════

  it('UT-NV-04: POST /nhan-vien — password < 6 ký tự → 400', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/nhan-vien',
      token: adminToken,
      payload: {
        ma_nv: 'NV-PASS',
        ten: 'NV Pass Ngắn',
        username: 'nv_short_pass_test',
        password: 'abc', // 3 ký tự < 6
        van_phong_id: vpId,
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-05: Cập nhật role
  // ════════════════════════════════════════════════════════

  it('UT-NV-05: PUT /nhan-vien/:id — cập nhật role → 200', async () => {
    if (!createdNvId) {
      const nv = await prisma.nhanVien.findFirst({ where: { username: TEST_USERNAME } });
      createdNvId = nv?.id;
    }

    const res = await authRequest(app, {
      method: 'PUT',
      url: `/api/nhan-vien/${createdNvId}`,
      token: adminToken,
      payload: { role: 'accountant' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.role).toBe('accountant');
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-06: Toggle NV active → false
  // ════════════════════════════════════════════════════════

  it('UT-NV-06: PATCH /nhan-vien/:id/active — active=false → 200', async () => {
    if (!createdNvId) {
      const nv = await prisma.nhanVien.findFirst({ where: { username: TEST_USERNAME } });
      createdNvId = nv?.id;
    }

    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/nhan-vien/${createdNvId}/active`,
      token: adminToken,
      payload: { active: false },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);

    // Verify DB
    const nv = await prisma.nhanVien.findUnique({ where: { id: createdNvId } });
    expect(nv.active).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-07: Admin tự deactivate chính mình → 400
  // ════════════════════════════════════════════════════════

  it('UT-NV-07: PATCH admin self-deactivate → 400', async () => {
    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/nhan-vien/${adminId}/active`,
      token: adminToken,
      payload: { active: false }, // Admin tự vô hiệu hoá mình
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('đang đăng nhập');
  });

  // ════════════════════════════════════════════════════════
  // UT-NV-08: Reset password → trả tempPassword
  // ════════════════════════════════════════════════════════

  it('UT-NV-08: POST /nhan-vien/:id/reset-password → 200, tempPassword trả về', async () => {
    if (!createdNvId) {
      const nv = await prisma.nhanVien.findFirst({ where: { username: TEST_USERNAME } });
      createdNvId = nv?.id;
    }
    // Reactivate trước nếu đang inactive
    await prisma.nhanVien.update({ where: { id: createdNvId }, data: { active: true } });

    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/nhan-vien/${createdNvId}/reset-password`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.tempPassword).toBeDefined();
    expect(typeof body.data.tempPassword).toBe('string');
    expect(body.data.tempPassword.length).toBeGreaterThanOrEqual(8);

    // Verify DB: require_password_change = true
    const nv = await prisma.nhanVien.findUnique({ where: { id: createdNvId } });
    expect(nv.require_password_change).toBe(true);
  });
});
