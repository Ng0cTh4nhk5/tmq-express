// tests/chanh.test.js
// ─────────────────────────────────────────────────────────
// Unit Test Module Chành — 6 TC
// UT-CH-01 → UT-CH-06
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';

describe('1.5 Module Chành — /api/chanh (6 TC)', () => {
  let app, adminToken, staffToken;
  let vpId;
  let createdChanhId;

  beforeAll(async () => {
    app = await buildApp();

    // Reset admin
    const h = await bcrypt.hash('Tmq@1234', 10);
    await prisma.nhanVien.updateMany({
      where: { username: 'admin' },
      data: { password_hash: h, failed_login_count: 0, locked_until: null, token_version: 0 },
    });
    adminToken = await getToken(app, 'admin', 'Tmq@1234');
    expect(adminToken).not.toBeNull();

    // Staff token (xem nhưng không tạo/sửa)
    staffToken = await getToken(app, 'uat_staff_test', 'Test@1234');
    // staff có thể chưa tồn tại → tạo nếu cần
    if (!staffToken) {
      const vps = await prisma.vanPhong.findMany({ take: 1 });
      const hash2 = await bcrypt.hash('Test@1234', 10);
      await prisma.nhanVien.upsert({
        where: { username: 'ch_staff_test' },
        update: {},
        create: {
          username: 'ch_staff_test', password_hash: hash2,
          ma_nv: 'CH-STAFF-01', ten: 'CH Staff Test',
          role: 'staff', van_phong_id: vps[0].id, active: true,
        },
      });
      staffToken = await getToken(app, 'ch_staff_test', 'Test@1234');
    }

    const vps = await prisma.vanPhong.findMany({ where: { active: true }, take: 1 });
    expect(vps.length).toBeGreaterThanOrEqual(1);
    vpId = vps[0].id;

    // Dọn chành test cũ
    await prisma.chanh.deleteMany({ where: { ten: { contains: '[CH-TEST]' } } });
  });

  afterAll(async () => {
    await prisma.chanh.deleteMany({ where: { ten: { contains: '[CH-TEST]' } } });
    await prisma.nhanVien.deleteMany({ where: { username: 'ch_staff_test' } });
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-CH-01: GET /chanh → 200 + array
  // ════════════════════════════════════════════════════════
  it('UT-CH-01: GET /chanh → 200, data là array', async () => {
    const res = await authRequest(app, { method: 'GET', url: '/api/chanh', token: adminToken });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Mỗi item phải có van_phong include
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty('van_phong');
      expect(body.data[0]).toHaveProperty('ten');
    }
  });

  // ════════════════════════════════════════════════════════
  // UT-CH-02: POST /chanh (admin) → 201, tạo thành công
  // ════════════════════════════════════════════════════════
  it('UT-CH-02: POST /chanh (admin) → 201, chành được tạo có đủ thông tin', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/chanh',
      token: adminToken,
      payload: {
        ten: 'Chành ABC [CH-TEST]',
        dia_chi: '123 Đường Test, TP.HCM',
        dien_thoai: '0901234567',
        nguoi_lien_he: 'Nguyễn Văn Test',
        van_phong_id: vpId,
        ghi_chu: 'Test chành nội tuyến',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ten).toBe('Chành ABC [CH-TEST]');
    expect(body.data.van_phong_id).toBe(vpId);
    expect(body.data.van_phong).toBeDefined();          // include VP
    expect(body.data.active).toBe(true);                // default active
    createdChanhId = body.data.id;
  });

  // ════════════════════════════════════════════════════════
  // UT-CH-03: POST /chanh (staff) → 403 RBAC
  // ════════════════════════════════════════════════════════
  it('UT-CH-03: POST /chanh (staff) → 403 Forbidden', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/chanh',
      token: staffToken,
      payload: {
        ten: 'Chành Staff [CH-TEST]',
        van_phong_id: vpId,
      },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-CH-04: PUT /chanh/:id → 200, cập nhật thông tin
  // ════════════════════════════════════════════════════════
  it('UT-CH-04: PUT /chanh/:id (admin) → 200, thông tin được cập nhật', async () => {
    expect(createdChanhId).toBeDefined();
    const res = await authRequest(app, {
      method: 'PUT',
      url: `/api/chanh/${createdChanhId}`,
      token: adminToken,
      payload: {
        ten: 'Chành ABC Updated [CH-TEST]',
        dien_thoai: '0987654321',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ten).toBe('Chành ABC Updated [CH-TEST]');
    expect(body.data.dien_thoai).toBe('0987654321');
    // VP không thay đổi
    expect(body.data.van_phong_id).toBe(vpId);
  });

  // ════════════════════════════════════════════════════════
  // UT-CH-05: PATCH /chanh/:id/active → 200, deactivate
  // ════════════════════════════════════════════════════════
  it('UT-CH-05: PATCH /chanh/:id/active → 200, toggle active/inactive', async () => {
    expect(createdChanhId).toBeDefined();

    // Deactivate
    const offRes = await authRequest(app, {
      method: 'PATCH',
      url: `/api/chanh/${createdChanhId}/active`,
      token: adminToken,
      payload: { active: false },
    });
    expect(offRes.statusCode).toBe(200);
    expect(JSON.parse(offRes.body).data.active).toBe(false);

    // Verify GET ?active=false trả về chành này
    const filterRes = await authRequest(app, {
      method: 'GET',
      url: `/api/chanh?active=false`,
      token: adminToken,
    });
    const list = JSON.parse(filterRes.body).data;
    const found = list.find(c => c.id === createdChanhId);
    expect(found).toBeDefined();

    // Reactivate
    const onRes = await authRequest(app, {
      method: 'PATCH',
      url: `/api/chanh/${createdChanhId}/active`,
      token: adminToken,
      payload: { active: true },
    });
    expect(onRes.statusCode).toBe(200);
    expect(JSON.parse(onRes.body).data.active).toBe(true);
  });

  // ════════════════════════════════════════════════════════
  // UT-CH-06: GET /chanh/:id không tồn tại → 404
  //           POST thiếu field bắt buộc → 400
  // ════════════════════════════════════════════════════════
  it('UT-CH-06: GET /chanh/99999 → 404 | POST thiếu ten → 400', async () => {
    // 404 not found
    const notFound = await authRequest(app, {
      method: 'GET', url: '/api/chanh/99999999', token: adminToken,
    });
    expect(notFound.statusCode).toBe(404);
    expect(JSON.parse(notFound.body).success).toBe(false);

    // 400 thiếu field bắt buộc (ten)
    const badReq = await authRequest(app, {
      method: 'POST',
      url: '/api/chanh',
      token: adminToken,
      payload: { van_phong_id: vpId }, // thiếu ten
    });
    expect(badReq.statusCode).toBe(400);

    // 400 VP không tồn tại
    const badVp = await authRequest(app, {
      method: 'POST',
      url: '/api/chanh',
      token: adminToken,
      payload: { ten: 'Test VP Invalid [CH-TEST]', van_phong_id: 99999 },
    });
    expect(badVp.statusCode).toBe(400);
    expect(JSON.parse(badVp.body).success).toBe(false);
  });
});
