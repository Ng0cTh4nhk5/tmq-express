// tests/scan.test.js
// ─────────────────────────────────────────────────────────
// Unit Test 1.8 — Scan QR — 6 TC
// Tham chiếu: UT-SCAN-01 → UT-SCAN-06
//
// Endpoint PUBLIC: GET /api/scan/:ma_so — không cần auth
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.8 Scan QR — /api/scan/:ma_so (6 TC)', () => {
  let app;
  let vpGuiId, vpNhanId, adminId;
  const TEST_MA_SO    = 'SCAN-TEST-0001';
  const TERMINAL_MA_SO = 'SCAN-TEST-TERM';

  beforeAll(async () => {
    app = await buildApp();

    const admin = await prisma.nhanVien.findFirst({ where: { username: 'admin' } });
    adminId = admin.id;
    const vps = await prisma.vanPhong.findMany({ take: 2, orderBy: { id: 'asc' } });
    vpGuiId  = vps[0].id;
    vpNhanId = vps[1].id;

    // Dọn BN test cũ
    await prisma.bienNhan.deleteMany({
      where: { ma_so: { in: [TEST_MA_SO, TERMINAL_MA_SO] } },
    });

    // BN đang ở dang_vc → next = da_den_kho
    await prisma.bienNhan.create({
      data: {
        ma_so: TEST_MA_SO,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: 'Cty Gửi Scan Test',
        don_vi_nhan: 'Cty Nhận Scan Test',
        ten_hang_hoa: '2 kiện',
        trang_thai: 'dang_vc',
        gia_cuoc: 0,
        trang_thai_thu: 'da_thu',
        nhan_vien_nhap_id: adminId,
      },
    });

    // BN terminal → next = null
    await prisma.bienNhan.create({
      data: {
        ma_so: TERMINAL_MA_SO,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: 'Cty Gửi Terminal Test',
        don_vi_nhan: 'Cty Nhận Terminal Test',
        trang_thai: 'khach_da_nhan',
        gia_cuoc: 0,
        trang_thai_thu: 'da_thu',
        nhan_vien_nhap_id: adminId,
      },
    });
  });

  afterAll(async () => {
    await prisma.bienNhan.deleteMany({
      where: { ma_so: { in: [TEST_MA_SO, TERMINAL_MA_SO] } },
    });
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-SCAN-01: Tra cứu BN theo mã (public, không cần auth)
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-01: GET /scan/:ma_so → 200, tracking info đầy đủ', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/scan/${TEST_MA_SO}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.ma_so).toBe(TEST_MA_SO);
    expect(body.data.trang_thai).toBe('dang_vc');
    expect(body.data.van_phong_gui).toBeDefined();
    expect(body.data.van_phong_nhan).toBeDefined();
    expect(Array.isArray(body.data.lich_su)).toBe(true);
  });

  // ════════════════════════════════════════════════════════
  // UT-SCAN-02: Mã không tồn tại → 404
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-02: GET /scan/XXXX-KHONG-TON-TAI → 404 NOT_FOUND', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/scan/XXXX-KHONG-TON-TAI-99999',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('Không tìm thấy');
  });

  // ════════════════════════════════════════════════════════
  // UT-SCAN-03: next_trang_thai đúng với trạng thái hiện tại
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-03: BN dang_vc → next_trang_thai = da_den_kho', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/scan/${TEST_MA_SO}`,
    });

    const body = JSON.parse(res.body);
    expect(body.data.next_trang_thai).toBe('da_den_kho');
  });

  // ════════════════════════════════════════════════════════
  // UT-SCAN-04: BN terminal → next_trang_thai = null
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-04: BN khach_da_nhan → next_trang_thai = null', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/scan/${TERMINAL_MA_SO}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.trang_thai).toBe('khach_da_nhan');
    expect(body.data.next_trang_thai).toBeNull();
  });

  // ════════════════════════════════════════════════════════
  // UT-SCAN-05: Không cần auth → 200 (không bị 401)
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-05: Gọi không có Authorization header → 200 (public)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/scan/${TEST_MA_SO}`,
      headers: {}, // Không có token
    });

    expect(res.statusCode).toBe(200);
    expect(res.statusCode).not.toBe(401);
  });

  // ════════════════════════════════════════════════════════
  // UT-SCAN-06: Response KHÔNG lộ thông tin nội bộ
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-06: Response không chứa gia_cuoc, trang_thai_thu, nhan_vien_nhap', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/scan/${TEST_MA_SO}`,
    });

    const body = JSON.parse(res.body);
    const data = body.data;

    // Trường nội bộ phải bị ẩn
    expect(data.nhan_vien_nhap_id).toBeUndefined();
    expect(data.nhan_vien_nhap).toBeUndefined();
    expect(data.gia_cuoc).toBeUndefined();
    expect(data.trang_thai_thu).toBeUndefined();

    // lich_su không được lộ nhan_vien
    if (data.lich_su && data.lich_su.length > 0) {
      expect(data.lich_su[0].nhan_vien).toBeUndefined();
    }

    // Trường public phải có
    expect(data.ma_so).toBeDefined();
    expect(data.trang_thai).toBeDefined();
    expect(data.van_phong_gui).toBeDefined();
    expect(data.van_phong_nhan).toBeDefined();
  });
});
