// tests/doanh-nghiep-hddt.test.js
// ─────────────────────────────────────────────────────────
// Unit Test 1.10 — Doanh nghiệp HĐDT — 6 TC
// Tham chiếu: UT-DN-01 → UT-DN-06
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.10 Doanh nghiệp HĐDT — /api/doanh-nghiep-hddt (6 TC)', () => {
  let app, adminToken;
  let createdDnId;

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');

    // Dọn DN test cũ
    await prisma.doanhNghiepHDDT.deleteMany({
      where: { ten: { contains: '[DN-TEST]' } },
    });
  });

  afterAll(async () => {
    await prisma.doanhNghiepHDDT.deleteMany({
      where: { ten: { contains: '[DN-TEST]' } },
    });
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-DN-01: GET danh sách → 200
  // ════════════════════════════════════════════════════════

  it('UT-DN-01: GET /doanh-nghiep-hddt → 200, array', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/doanh-nghiep-hddt',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ════════════════════════════════════════════════════════
  // UT-DN-02: POST tạo DN → 201
  // ════════════════════════════════════════════════════════

  it('UT-DN-02: POST /doanh-nghiep-hddt → 201, DN được tạo', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/doanh-nghiep-hddt',
      token: adminToken,
      payload: {
        ten: 'Công ty Test HĐDT [DN-TEST]',
        ma_so_thue: '0123456789',
        dia_chi: '123 Đường Test, Q1',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ten).toBe('Công ty Test HĐDT [DN-TEST]');
    expect(body.data.ma_so_thue).toBe('0123456789');
    expect(body.data.active).toBe(true); // Default active

    createdDnId = body.data.id;
  });

  // ════════════════════════════════════════════════════════
  // UT-DN-03: POST thiếu ten → 400
  // ════════════════════════════════════════════════════════

  it('UT-DN-03: POST — thiếu ten → 400 schema validation', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/doanh-nghiep-hddt',
      token: adminToken,
      payload: {
        ma_so_thue: '9999999999', // Không có ten (required)
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-DN-04: PUT cập nhật → 200
  // ════════════════════════════════════════════════════════

  it('UT-DN-04: PUT /doanh-nghiep-hddt/:id → 200, thông tin cập nhật', async () => {
    if (!createdDnId) {
      const dn = await prisma.doanhNghiepHDDT.findFirst({ where: { ten: { contains: '[DN-TEST]' } } });
      createdDnId = dn?.id;
    }

    const res = await authRequest(app, {
      method: 'PUT',
      url: `/api/doanh-nghiep-hddt/${createdDnId}`,
      token: adminToken,
      payload: {
        ten: 'Công ty Test HĐDT UPDATED [DN-TEST]',
        dia_chi: '456 Đường Updated, Q2',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ten).toBe('Công ty Test HĐDT UPDATED [DN-TEST]');
    expect(body.data.dia_chi).toBe('456 Đường Updated, Q2');
  });

  // ════════════════════════════════════════════════════════
  // UT-DN-05: PATCH toggle active=false → 200
  // ════════════════════════════════════════════════════════

  it('UT-DN-05: PATCH /doanh-nghiep-hddt/:id/active → 200, active=false', async () => {
    if (!createdDnId) {
      const dn = await prisma.doanhNghiepHDDT.findFirst({ where: { ten: { contains: '[DN-TEST]' } } });
      createdDnId = dn?.id;
    }

    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/doanh-nghiep-hddt/${createdDnId}/active`,
      token: adminToken,
      payload: { active: false },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.active).toBe(false);

    // Verify DB
    const dn = await prisma.doanhNghiepHDDT.findUnique({ where: { id: createdDnId } });
    expect(dn.active).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-DN-06: PATCH toggle active=true → 200 (bật lại)
  // ════════════════════════════════════════════════════════

  it('UT-DN-06: PATCH active=true → 200 (bật lại sau khi tắt)', async () => {
    if (!createdDnId) {
      const dn = await prisma.doanhNghiepHDDT.findFirst({ where: { ten: { contains: '[DN-TEST]' } } });
      createdDnId = dn?.id;
    }

    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/doanh-nghiep-hddt/${createdDnId}/active`,
      token: adminToken,
      payload: { active: true },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.active).toBe(true);
  });
});
