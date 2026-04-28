// tests/doanh-thu.test.js
// ─────────────────────────────────────────────────────────
// Unit Test 1.12 — Doanh thu — 6 TC
// Tham chiếu: UT-DT-01 → UT-DT-06
//
// Endpoint: GET /api/doanh-thu?nhom=ngay|tuan|thang|nam&from=&to=&van_phong_id=
// Response: { success, data: { chi_tiet: [], tong_hop: {} } }
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';

describe('1.12 Doanh thu — /api/doanh-thu (6 TC)', () => {
  let app, adminToken;

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');
  });

  afterAll(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-DT-01: Báo cáo theo ngày
  // ════════════════════════════════════════════════════════

  it('UT-DT-01: GET /doanh-thu?nhom=ngay → 200, chi_tiet + tong_hop', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/doanh-thu?nhom=ngay&from=${firstOfMonth}&to=${today}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.chi_tiet)).toBe(true);
    expect(body.data.tong_hop).toBeDefined();
    expect(typeof body.data.tong_hop.so_bn).toBe('number');
    expect(typeof body.data.tong_hop.tong_cuoc).toBe('number');
    // key format YYYY-MM-DD
    if (body.data.chi_tiet.length > 0) {
      expect(body.data.chi_tiet[0].key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // ════════════════════════════════════════════════════════
  // UT-DT-02: Báo cáo theo tuần
  // ════════════════════════════════════════════════════════

  it('UT-DT-02: GET /doanh-thu?nhom=tuan → 200, key dạng YYYY-Txx', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/doanh-thu?nhom=tuan&from=${firstOfMonth}&to=${today}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.chi_tiet)).toBe(true);
    // key format YYYY-Txx (ISO week)
    if (body.data.chi_tiet.length > 0) {
      expect(body.data.chi_tiet[0].key).toMatch(/^\d{4}-T\d{2}$/);
    }
  });

  // ════════════════════════════════════════════════════════
  // UT-DT-03: Báo cáo theo tháng
  // ════════════════════════════════════════════════════════

  it('UT-DT-03: GET /doanh-thu?nhom=thang → 200, key dạng YYYY-MM', async () => {
    const year = today.slice(0, 4);
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/doanh-thu?nhom=thang&from=${year}-01-01&to=${today}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.chi_tiet)).toBe(true);
    // key format YYYY-MM
    if (body.data.chi_tiet.length > 0) {
      expect(body.data.chi_tiet[0].key).toMatch(/^\d{4}-\d{2}$/);
    }
    expect(body.data.tong_hop.so_bn).toBeGreaterThan(0); // Có BN trong DB
  });

  // ════════════════════════════════════════════════════════
  // UT-DT-04: Báo cáo theo năm
  // ════════════════════════════════════════════════════════

  it('UT-DT-04: GET /doanh-thu?nhom=nam → 200, key dạng YYYY', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/doanh-thu?nhom=nam',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.chi_tiet)).toBe(true);
    // key format YYYY
    if (body.data.chi_tiet.length > 0) {
      expect(body.data.chi_tiet[0].key).toMatch(/^\d{4}$/);
    }
  });

  // ════════════════════════════════════════════════════════
  // UT-DT-05: Lọc theo van_phong_id → chỉ BN của VP đó
  // ════════════════════════════════════════════════════════

  it('UT-DT-05: GET ?van_phong_id=1 → 200, tong_hop hợp lệ', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/doanh-thu?nhom=thang&van_phong_id=1',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.tong_hop).toBeDefined();
    // tong_hop luôn có các field số (kể cả = 0)
    expect(typeof body.data.tong_hop.tong_cuoc).toBe('number');
    expect(typeof body.data.tong_hop.da_thu).toBe('number');
    expect(typeof body.data.tong_hop.cong_no).toBe('number');
  });

  // ════════════════════════════════════════════════════════
  // UT-DT-06: Khoảng thời gian không có BN → chi_tiet rỗng
  // ════════════════════════════════════════════════════════

  it('UT-DT-06: Khoảng từ tương lai → chi_tiet=[], tong_hop=0', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/doanh-thu?nhom=ngay&from=2099-01-01&to=2099-01-31',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.chi_tiet).toHaveLength(0); // Không có BN nào năm 2099
    expect(body.data.tong_hop.so_bn).toBe(0);
    expect(body.data.tong_hop.tong_cuoc).toBe(0);
  });
});
