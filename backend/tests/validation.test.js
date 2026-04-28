// tests/validation.test.js
// ─────────────────────────────────────────────────────────
// Validation & Boundary — 10 TC (SEC-V-01 đến SEC-V-10)
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken } from './helpers/setup.js';

describe('Validation & Boundary — 10 TC', () => {
  let app;
  let adminToken;

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');
    expect(adminToken).not.toBeNull();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (url, payload, token = adminToken) =>
    app.inject({
      method: 'POST',
      url,
      payload,
      headers: { authorization: `Bearer ${token}` },
    });

  const get = (url, token = adminToken) =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  // ─── SEC-V-01: ma_vp > 10 ký tự ─────────────────────────
  it('SEC-V-01: ma_vp > 10 ký tự → 400', async () => {
    const res = await post('/api/van-phong', { ma_vp: 'ABCDEFGHIJK', ten: 'VP Test' });
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-02: dien_thoai sai pattern ────────────────────
  it('SEC-V-02: dien_thoai sai pattern → 400', async () => {
    const res = await post('/api/khach-hang', {
      ten_don_vi: 'KH Test Validation',
      dien_thoai: '1234567890', // không bắt đầu bằng 0
    });
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-03: email sai format ──────────────────────────
  it('SEC-V-03: email sai format → 400', async () => {
    const res = await post('/api/khach-hang', {
      ten_don_vi: 'KH Test Validation 2',
      email: 'not-an-email-format',
    });
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-04: gia_cuoc âm ─────────────────────────────
  it('SEC-V-04: gia_cuoc âm → 400 (schema minimum: 0)', async () => {
    const vpRes = await get('/api/van-phong');
    const vps = JSON.parse(vpRes.body).data || [];
    if (vps.length < 2) return; // skip nếu không đủ data
    const res = await post('/api/bien-nhan', {
      van_phong_gui_id: vps[0].id,
      van_phong_nhan_id: vps[1].id,
      gia_cuoc: -500,
    });
    expect(res.statusCode).toBe(400); // minimum: 0 enforce đúng
  });

  // ─── SEC-V-05: so_luong âm trong hang_hoa ───────────────
  it('SEC-V-05: hang_hoa so_luong âm → 400', async () => {
    const vpRes = await get('/api/van-phong');
    const vps = JSON.parse(vpRes.body).data || [];
    if (vps.length < 2) return;
    const res = await post('/api/bien-nhan', {
      van_phong_gui_id: vps[0].id,
      van_phong_nhan_id: vps[1].id,
      hang_hoa_json: [{ don_vi: 'thùng', so_luong: -3 }],
    });
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-06: thang ngoài range 1-12 ───────────────────
  it('SEC-V-06: thang = 0 → 400', async () => {
    const res = await get('/api/cong-no?thang=0&nam=2025');
    expect(res.statusCode).toBe(400);
  });

  it('SEC-V-06b: thang = 13 → 400', async () => {
    const res = await get('/api/cong-no?thang=13&nam=2025');
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-07: nam ngoài range ───────────────────────────
  it('SEC-V-07: nam = 2019 → 400', async () => {
    const res = await get('/api/cong-no?thang=1&nam=2019');
    expect(res.statusCode).toBe(400);
  });

  it('SEC-V-07b: nam = 2031 → 400', async () => {
    const res = await get('/api/cong-no?thang=1&nam=2031');
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-08: Body rỗng cho POST ────────────────────────
  it('SEC-V-08: Body rỗng POST /van-phong → 400', async () => {
    const res = await post('/api/van-phong', {}); // thiếu required: ma_vp, ten
    expect(res.statusCode).toBe(400);
  });

  it('SEC-V-08b: Body rỗng POST /khach-hang → 400', async () => {
    const res = await post('/api/khach-hang', {}); // thiếu required: ten_don_vi
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-09: String rỗng required ──────────────────────
  it('SEC-V-09: ten_don_vi rỗng → 400 (minLength: 1)', async () => {
    const res = await post('/api/khach-hang', { ten_don_vi: '' });
    expect(res.statusCode).toBe(400);
  });

  it('SEC-V-09b: ten VP rỗng → 400 (minLength: 1)', async () => {
    const res = await post('/api/van-phong', { ma_vp: 'VL01', ten: '' });
    expect(res.statusCode).toBe(400);
  });

  // ─── SEC-V-10: ID không hợp lệ (non-integer) ────────────
  it('SEC-V-10: GET /api/bien-nhan/abc → 400 (params schema integer)', async () => {
    const res = await get('/api/bien-nhan/abc');
    expect(res.statusCode).toBe(400);
  });

  it('SEC-V-10b: GET /api/khach-hang/xyz → 400 (params schema integer)', async () => {
    const res = await get('/api/khach-hang/xyz');
    expect(res.statusCode).toBe(400);
  });
});
