// tests/van-phong.test.js
// ─────────────────────────────────────────────────────────
// Unit Test cho Module Văn phòng — 8 TC
// Tham chiếu: UT-VP-01 → UT-VP-08
//
// Chiến lược: tạo VP test riêng trong beforeAll, xóa trong afterAll
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

const TEST_MA_VP = 'TS';   // Mã VP test (2 ký tự, không trùng SG/CT/RG)
const TEST_MA_VP2 = 'T2';  // Dùng để test trùng mã

describe('1.2 Module Văn phòng — /api/van-phong (8 TC)', () => {
  let app, adminToken;
  let createdVpId;  // ID của VP test được tạo

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');

    // Dọn VP test từ lần chạy trước (nếu còn sót)
    await prisma.vanPhong.deleteMany({
      where: { ma_vp: { in: [TEST_MA_VP, TEST_MA_VP2] } },
    });
  });

  afterAll(async () => {
    // Dọn dẹp: xóa VP test
    await prisma.vanPhong.deleteMany({
      where: { ma_vp: { in: [TEST_MA_VP, TEST_MA_VP2] } },
    });
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-01: Danh sách tất cả VP
  // ════════════════════════════════════════════════════════

  it('UT-VP-01: GET /van-phong → 200, trả danh sách array', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/van-phong',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    // Kiểm tra cấu trúc một phần tử
    const vp = body.data[0];
    expect(vp.id).toBeDefined();
    expect(vp.ma_vp).toBeDefined();
    expect(vp.ten).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-02: Lọc active only
  // ════════════════════════════════════════════════════════

  it('UT-VP-02: GET /van-phong?active=true → chỉ trả VP active', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/van-phong?active=true',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    // Tất cả phần tử phải active = true
    body.data.forEach((vp) => {
      expect(vp.active).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-03: Tạo VP mới → 201
  // ════════════════════════════════════════════════════════

  it('UT-VP-03: POST /van-phong → 201, mã và tên đúng', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/van-phong',
      token: adminToken,
      payload: {
        ma_vp: TEST_MA_VP,
        ten: 'VP Test Unit',
        dia_chi: '123 Đường Test',
        dien_thoai: '028 1234567',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ma_vp).toBe(TEST_MA_VP);
    expect(body.data.ten).toBe('VP Test Unit');
    expect(body.data.active).toBe(true);

    // Lưu ID để dùng cho các test sau
    createdVpId = body.data.id;
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-04: Tạo VP trùng ma_vp → 409 Conflict
  // ════════════════════════════════════════════════════════

  it('UT-VP-04: POST /van-phong — ma_vp trùng → 409 CONFLICT', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/van-phong',
      token: adminToken,
      payload: { ma_vp: TEST_MA_VP, ten: 'VP Trùng Mã' }, // ma_vp đã tồn tại từ UT-VP-03
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-05: Tạo VP thiếu ma_vp → 400
  // ════════════════════════════════════════════════════════

  it('UT-VP-05: POST /van-phong — thiếu ma_vp → 400 VALIDATION_ERROR', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/van-phong',
      token: adminToken,
      payload: { ten: 'VP Thiếu Mã' }, // Không có ma_vp
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-06: ma_vp > 10 ký tự → 400
  // ════════════════════════════════════════════════════════

  it('UT-VP-06: POST /van-phong — ma_vp > 10 ký tự → 400', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/van-phong',
      token: adminToken,
      payload: { ma_vp: 'ABCDEFGHIJK', ten: 'VP Mã Dài' }, // 11 ký tự
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-07: Cập nhật VP → 200
  // ════════════════════════════════════════════════════════

  it('UT-VP-07: PUT /van-phong/:id → 200, trường đã cập nhật', async () => {
    // Phụ thuộc UT-VP-03: cần createdVpId
    if (!createdVpId) {
      const existing = await prisma.vanPhong.findFirst({ where: { ma_vp: TEST_MA_VP } });
      createdVpId = existing?.id;
    }

    const res = await authRequest(app, {
      method: 'PUT',
      url: `/api/van-phong/${createdVpId}`,
      token: adminToken,
      payload: {
        ten: 'VP Test Unit — Updated',
        dia_chi: '456 Đường Updated',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ten).toBe('VP Test Unit — Updated');
    expect(body.data.dia_chi).toBe('456 Đường Updated');
  });

  // ════════════════════════════════════════════════════════
  // UT-VP-08: Toggle active → false
  // ════════════════════════════════════════════════════════

  it('UT-VP-08: PATCH /van-phong/:id/active — active=false → 200, VP bị vô hiệu', async () => {
    if (!createdVpId) {
      const existing = await prisma.vanPhong.findFirst({ where: { ma_vp: TEST_MA_VP } });
      createdVpId = existing?.id;
    }

    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/van-phong/${createdVpId}/active`,
      token: adminToken,
      payload: { active: false },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.active).toBe(false);

    // Verify: VP không xuất hiện trong danh sách active
    const listRes = await authRequest(app, {
      method: 'GET',
      url: '/api/van-phong?active=true',
      token: adminToken,
    });
    const listBody = JSON.parse(listRes.body);
    const found = listBody.data.find((vp) => vp.id === createdVpId);
    expect(found).toBeUndefined();
  });
});
