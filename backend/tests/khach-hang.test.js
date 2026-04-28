// tests/khach-hang.test.js
// ─────────────────────────────────────────────────────────
// Unit Test cho Module Khách hàng — 10 TC
// Tham chiếu: UT-KH-01 → UT-KH-10
//
// Chiến lược: tạo KH test riêng, xóa trong afterAll
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.4 Module Khách hàng — /api/khach-hang (10 TC)', () => {
  let app, adminToken;
  let createdKhId;
  const STAFF_TEST_USER = 'kh_test_staff_9876';

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');

    // Tạo staff test user riêng cho UT-KH-10
    await prisma.nhanVien.deleteMany({ where: { username: STAFF_TEST_USER } });
    const vp = await prisma.vanPhong.findFirst();
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash('Test@1234', 10);
    await prisma.nhanVien.create({
      data: {
        ma_nv: 'NV-KH-STAFF-TEST',
        ten: 'KH Staff Test',
        van_phong_id: vp.id,
        role: 'staff',
        username: STAFF_TEST_USER,
        password_hash: hash,
        active: true,
      },
    });

    // Dọn KH test từ lần chạy trước
    await prisma.khachHang.deleteMany({
      where: { ten_don_vi: { contains: '[UNIT-TEST]' } },
    });
  });

  afterAll(async () => {
    await prisma.khachHang.deleteMany({
      where: { ten_don_vi: { contains: '[UNIT-TEST]' } },
    });
    await prisma.nhanVien.deleteMany({ where: { username: STAFF_TEST_USER } });
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-01: Danh sách KH → 200 + pagination
  // ════════════════════════════════════════════════════════

  it('UT-KH-01: GET /khach-hang → 200, data array + pagination', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/khach-hang',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.total).toBeGreaterThanOrEqual(0);
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-02: Autocomplete search
  // ════════════════════════════════════════════════════════

  it('UT-KH-02: GET /khach-hang/autocomplete?q=... → 200, array ≤ 10', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/khach-hang/autocomplete?q=a',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(10);
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-03: Tạo KH mới → 201
  // ════════════════════════════════════════════════════════

  it('UT-KH-03: POST /khach-hang → 201, ma_kh auto-gen', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/khach-hang',
      token: adminToken,
      payload: {
        ten_don_vi: 'Cty Test [UNIT-TEST]',
        loai_kh: 'doanh_nghiep',
        nguoi_lien_he: 'Nguyễn Test',
        dien_thoai: '0901234567',
        email: 'test@example.com',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ma_kh).toBeDefined();             // Auto-generated
    expect(body.data.ten_don_vi).toBe('Cty Test [UNIT-TEST]');
    expect(body.data.loai_kh).toBe('doanh_nghiep');
    expect(body.data.active).toBe(true);

    createdKhId = body.data.id;
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-04: Lấy KH theo ID → 200
  // ════════════════════════════════════════════════════════

  it('UT-KH-04: GET /khach-hang/:id → 200, đầy đủ thông tin', async () => {
    if (!createdKhId) {
      const kh = await prisma.khachHang.findFirst({ where: { ten_don_vi: { contains: '[UNIT-TEST]' } } });
      createdKhId = kh?.id;
    }

    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/khach-hang/${createdKhId}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdKhId);
    expect(body.data.ma_kh).toBeDefined();
    expect(body.data.ten_don_vi).toBe('Cty Test [UNIT-TEST]');
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-05: Lấy KH ID không tồn tại → 404
  // ════════════════════════════════════════════════════════

  it('UT-KH-05: GET /khach-hang/99999 → 404 NOT_FOUND', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/khach-hang/99999999',
      token: adminToken,
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-06: Tạo KH thiếu ten_don_vi → 400
  // ════════════════════════════════════════════════════════

  it('UT-KH-06: POST /khach-hang — thiếu ten_don_vi → 400', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/khach-hang',
      token: adminToken,
      payload: { loai_kh: 'ca_nhan' }, // Không có ten_don_vi (required)
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-07: SĐT sai format → 400
  // ════════════════════════════════════════════════════════

  it('UT-KH-07: POST /khach-hang — SĐT sai format → 400', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/khach-hang',
      token: adminToken,
      payload: {
        ten_don_vi: 'KH SĐT Sai [UNIT-TEST]',
        dien_thoai: '12345', // Không khớp pattern ^0[2-9]\d{8,9}$
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-08: Cập nhật KH → 200
  // ════════════════════════════════════════════════════════

  it('UT-KH-08: PUT /khach-hang/:id → 200, trường đã cập nhật', async () => {
    if (!createdKhId) {
      const kh = await prisma.khachHang.findFirst({ where: { ten_don_vi: { contains: '[UNIT-TEST]' } } });
      createdKhId = kh?.id;
    }

    const res = await authRequest(app, {
      method: 'PUT',
      url: `/api/khach-hang/${createdKhId}`,
      token: adminToken,
      payload: {
        ten_don_vi: 'Cty Test Updated [UNIT-TEST]',
        nguoi_lien_he: 'Người Updated',
        ghi_chu: 'Đã cập nhật qua unit test',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ten_don_vi).toBe('Cty Test Updated [UNIT-TEST]');
    expect(body.data.nguoi_lien_he).toBe('Người Updated');
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-09: Toggle active → false
  // ════════════════════════════════════════════════════════

  it('UT-KH-09: PATCH /khach-hang/:id/active — active=false → 200', async () => {
    if (!createdKhId) {
      const kh = await prisma.khachHang.findFirst({ where: { ten_don_vi: { contains: '[UNIT-TEST]' } } });
      createdKhId = kh?.id;
    }

    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/khach-hang/${createdKhId}/active`,
      token: adminToken,
      payload: { active: false },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.active).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-KH-10: Staff không được toggle active (admin only) → 403
  // ════════════════════════════════════════════════════════

  it('UT-KH-10: PATCH /khach-hang/:id/active bởi staff → 403 FORBIDDEN', async () => {
    if (!createdKhId) {
      const kh = await prisma.khachHang.findFirst({ where: { ten_don_vi: { contains: '[UNIT-TEST]' } } });
      createdKhId = kh?.id;
    }

    // Lấy fresh token của staff test user
    const freshStaffToken = await getToken(app, STAFF_TEST_USER, 'Test@1234');
    expect(freshStaffToken).not.toBeNull();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/khach-hang/${createdKhId}/active`,
      headers: { authorization: `Bearer ${freshStaffToken}` },
      payload: { active: true },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
