// tests/scan.test.js
// ─────────────────────────────────────────────────────────
// Unit Test 1.8 — Scan QR — 8 TC
// Tham chiếu: UT-SCAN-01 → UT-SCAN-08
//
// Endpoint PUBLIC: GET /api/scan/:token — không cần auth
//   - token là số nguyên → lookup by id (QR code)
//   - token là chuỗi    → lookup by ma_so (nhập tay)
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.8 Scan QR — /api/scan/:token (8 TC)', () => {
  let app;
  let vpGuiId, vpNhanId, adminId;
  let testBnId, terminalBnId;
  const TEST_MA_SO     = 'SCAN-TEST-0001';
  const TERMINAL_MA_SO = 'SCAN-TEST-TERM';
  const DUP_MA_SO      = 'SCAN-DUP-0001';  // Ma so bị trùng — dùng cho TC-07/08

  beforeAll(async () => {
    app = await buildApp();

    const admin = await prisma.nhanVien.findFirst({ where: { username: 'admin' } });
    adminId = admin.id;
    const vps = await prisma.vanPhong.findMany({ take: 2, orderBy: { id: 'asc' } });
    vpGuiId  = vps[0].id;
    vpNhanId = vps[1].id;

    // Dọn BN test cũ
    await prisma.bienNhan.deleteMany({
      where: { ma_so: { in: [TEST_MA_SO, TERMINAL_MA_SO, DUP_MA_SO] } },
    });

    // BN đang ở dang_vc → next = da_den_kho
    const bn = await prisma.bienNhan.create({
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
    testBnId = bn.id;

    // BN terminal → next = null
    const termBn = await prisma.bienNhan.create({
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
    terminalBnId = termBn.id;

    // 2 BN cùng ma_so (DUP_MA_SO), khác ngày — dùng cho TC-07/08
    // BN cũ (ngày hôm qua): khach_da_nhan
    await prisma.bienNhan.create({
      data: {
        ma_so: DUP_MA_SO,
        ngay_bien_nhan: new Date(Date.now() - 86400000),  // hôm qua
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        ten_hang_hoa: 'BN cũ',
        trang_thai: 'khach_da_nhan',
        gia_cuoc: 0,
        trang_thai_thu: 'da_thu',
        nhan_vien_nhap_id: adminId,
      },
    });
    // BN mới (hôm nay): cho_vc
    await prisma.bienNhan.create({
      data: {
        ma_so: DUP_MA_SO,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        ten_hang_hoa: 'BN mới',
        trang_thai: 'cho_vc',
        gia_cuoc: 0,
        trang_thai_thu: 'da_thu',
        nhan_vien_nhap_id: adminId,
      },
    });
  });

  afterAll(async () => {
    await prisma.bienNhan.deleteMany({
      where: { ma_so: { in: [TEST_MA_SO, TERMINAL_MA_SO, DUP_MA_SO] } },
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

  // ════════════════════════════════════════════════════════
  // UT-SCAN-07 [MỚI]: Lookup by ID (QR code) — chính xác tuyệt đối
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-07: GET /scan/:id (số) → 200, trả đúng BN theo id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/scan/${testBnId}`,  // token là số → lookup by id
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(testBnId);
    expect(body.data.ma_so).toBe(TEST_MA_SO);
  });

  // ════════════════════════════════════════════════════════
  // UT-SCAN-08 [MỚI]: Disambiguation — 2 BN cùng ma_so, khác ngày
  //   Lookup by id → trả đúng BN cụ thể (không nhầm BN khác)
  // ════════════════════════════════════════════════════════

  it('UT-SCAN-08: 2 BN cùng ma_so khác ngày — lookup by id → mỗi id trả đúng BN của nó', async () => {
    // Lấy cả 2 BN DUP
    const [dupOld, dupNew] = await prisma.bienNhan.findMany({
      where: { ma_so: DUP_MA_SO },
      orderBy: { ngay_bien_nhan: 'asc' },
      select: { id: true, trang_thai: true },
    });

    // Lookup BN cũ (khach_da_nhan) bằng id
    const resOld = await app.inject({ method: 'GET', url: `/api/scan/${dupOld.id}` });
    expect(resOld.statusCode).toBe(200);
    const bodyOld = JSON.parse(resOld.body);
    expect(bodyOld.data.id).toBe(dupOld.id);
    expect(bodyOld.data.trang_thai).toBe('khach_da_nhan');  // BN cũ

    // Lookup BN mới (cho_vc) bằng id
    const resNew = await app.inject({ method: 'GET', url: `/api/scan/${dupNew.id}` });
    expect(resNew.statusCode).toBe(200);
    const bodyNew = JSON.parse(resNew.body);
    expect(bodyNew.data.id).toBe(dupNew.id);
    expect(bodyNew.data.trang_thai).toBe('cho_vc');  // BN mới
  });
});
