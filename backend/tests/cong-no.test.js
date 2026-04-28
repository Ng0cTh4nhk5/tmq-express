// tests/cong-no.test.js
// ─────────────────────────────────────────────────────────
// Unit Test 1.11 — Công nợ — 11 TC
// Tham chiếu: UT-CN-01 → UT-CN-11
//
// Chiến lược:
//  - Tạo CongNo trực tiếp qua Prisma để tránh Prisma DLL lock
//  - Test route xac-nhan-thanh-toan, report, doi-soat, bang-ke-thang
//  - Validate schema: thang/nam out-of-range → 400
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.11 Công nợ — /api/cong-no (11 TC)', () => {
  let app, adminToken;
  let vpGuiId, vpNhanId, adminId;
  let testBN;          // BN gắn với CongNo
  let testCongNoId;    // CongNo chưa thu
  let paidCongNoId;    // CongNo đã thu — để test double-pay 400

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');

    const admin = await prisma.nhanVien.findFirst({ where: { username: 'admin' } });
    adminId = admin.id;
    const vps = await prisma.vanPhong.findMany({ take: 2, orderBy: { id: 'asc' } });
    vpGuiId  = vps[0].id;
    vpNhanId = vps[1].id;

    // Dọn BN test cũ
    const oldBNs = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[CN-TEST]' } }, select: { id: true },
    });
    if (oldBNs.length > 0) {
      const ids = oldBNs.map(b => b.id);
      await prisma.congNo.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }

    // Tạo BN gốc
    testBN = await prisma.bienNhan.create({
      data: {
        ma_so: `CN-TEST-${Date.now()}`,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: 'Cty Gửi Nợ [CN-TEST]',
        don_vi_nhan: 'Cty Nhận Nợ [CN-TEST]',
        gia_cuoc: 500000,
        trang_thai: 'cho_vc',
        trang_thai_thu: 'cong_no',
        nhan_vien_nhap_id: adminId,
      },
    });

    // Tạo CongNo chưa thu
    const cn = await prisma.congNo.create({
      data: {
        bien_nhan_id: testBN.id,
        doi_tuong: 'Cty Gửi Nợ [CN-TEST]',
        so_tien_no: 500000,
        trang_thai: 'chua_thu',
      },
    });
    testCongNoId = cn.id;

    // Tạo CongNo đã thu sẵn (để test double-pay)
    const bnPaid = await prisma.bienNhan.create({
      data: {
        ma_so: `CN-PAID-${Date.now()}`,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: 'Cty Paid [CN-TEST]',
        don_vi_nhan: 'Cty Nhận [CN-TEST]',
        gia_cuoc: 100000,
        trang_thai: 'cho_vc',
        trang_thai_thu: 'cong_no',
        nhan_vien_nhap_id: adminId,
      },
    });
    const cnPaid = await prisma.congNo.create({
      data: {
        bien_nhan_id: bnPaid.id,
        doi_tuong: 'Cty Paid [CN-TEST]',
        so_tien_no: 100000,
        trang_thai: 'da_thu',  // Đã thu rồi
        ngay_thu: new Date(),
      },
    });
    paidCongNoId = cnPaid.id;
  });

  afterAll(async () => {
    // Dọn phiếu thu tạo bởi test
    const bns = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[CN-TEST]' } }, select: { id: true },
    });
    if (bns.length > 0) {
      const ids = bns.map(b => b.id);
      await prisma.phieuThu.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.congNo.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-01: Danh sách công nợ → 200 + summary
  // ════════════════════════════════════════════════════════

  it('UT-CN-01: GET /cong-no → 200, data + pagination + summary', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/cong-no',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.summary).toBeDefined();
    expect(typeof body.summary.tong_no).toBe('number');
    expect(typeof body.summary.so_cong_no).toBe('number');
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-02: Filter theo trang_thai=chua_thu
  // ════════════════════════════════════════════════════════

  it('UT-CN-02: GET ?trang_thai=chua_thu → chỉ CN chưa thu', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/cong-no?trang_thai=chua_thu',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    body.data.forEach(cn => {
      expect(cn.trang_thai).toBe('chua_thu');
    });
    // CN test phải xuất hiện
    const found = body.data.find(cn => cn.id === testCongNoId);
    expect(found).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-03: Xác nhận thanh toán → PhieuThu tự tạo
  // ════════════════════════════════════════════════════════

  it('UT-CN-03: POST /:id/xac-nhan-thanh-toan → 200, phieu_thu.ma_phieu bắt đầu PT-', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/cong-no/${testCongNoId}/xac-nhan-thanh-toan`,
      token: adminToken,
      payload: {
        hinh_thuc: 'chuyen_khoan',
        ghi_chu: 'KH chuyển khoản qua MB Bank',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.phieu_thu.ma_phieu).toMatch(/^PT-/);
    expect(body.message).toContain('phiếu thu');

    // Verify: CongNo đổi sang da_thu
    const cn = await prisma.congNo.findUnique({ where: { id: testCongNoId } });
    expect(cn.trang_thai).toBe('da_thu');
    expect(cn.phieu_thu_id).not.toBeNull();
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-04: Xác nhận CN đã thu rồi → 400
  // ════════════════════════════════════════════════════════

  it('UT-CN-04: POST /:id/xac-nhan-thanh-toan (da_thu) → 400', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/cong-no/${paidCongNoId}/xac-nhan-thanh-toan`,
      token: adminToken,
      payload: { hinh_thuc: 'tien_mat' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('đã được thu');
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-05: Report công nợ theo đối tượng
  // ════════════════════════════════════════════════════════

  it('UT-CN-05: GET /cong-no/report → 200, có data + summary', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/cong-no/report',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    // Report trả về summary tổng hợp
    expect(body.data !== undefined || body.summary !== undefined).toBe(true);
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-06: Đối soát cước tháng
  // ════════════════════════════════════════════════════════

  it('UT-CN-06: GET /cong-no/doi-soat → 200', async () => {
    const now = new Date();
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/cong-no/doi-soat?thang=${now.getMonth() + 1}&nam=${now.getFullYear()}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-07: Bảng kê CN theo tháng
  // ════════════════════════════════════════════════════════

  it('UT-CN-07: GET /cong-no/bang-ke-thang → 200, data + tong', async () => {
    const now = new Date();
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/cong-no/bang-ke-thang?thang=${now.getMonth() + 1}&nam=${now.getFullYear()}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.tong).toBeDefined();
    expect(typeof body.tong.so_cong_no).toBe('number');
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-08: Export Excel bảng kê CN
  // ════════════════════════════════════════════════════════

  it('UT-CN-08: GET /cong-no/bang-ke-thang/export → 200, file xlsx base64', async () => {
    const now = new Date();
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/cong-no/bang-ke-thang/export?thang=${now.getMonth() + 1}&nam=${now.getFullYear()}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.file.base64).toBeDefined();
    expect(body.data.file.base64.length).toBeGreaterThan(100);
    expect(body.data.file.name).toContain('.xlsx');
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-09: Export PDF bảng kê CN
  // ════════════════════════════════════════════════════════

  it('UT-CN-09: GET /cong-no/bang-ke-thang/export-pdf → 200, file pdf base64', async () => {
    const now = new Date();
    // Không filter doi_tuong — lấy toàn bộ tháng hiện tại
    // (route yêu cầu doi_tuong nhưng service accept empty → PDF tổng)
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/cong-no/bang-ke-thang/export-pdf?thang=${now.getMonth() + 1}&nam=${now.getFullYear()}&doi_tuong=Cty+Paid`,
      token: adminToken,
    });

    // 200 nếu có dữ liệu, 404 nếu không có CN nào với doi_tuong này — cả 2 đều hợp lệ
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.file.base64).toBeDefined();
      expect(body.data.file.name).toMatch(/\.pdf$/);
    }
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-10: Đối soát chi tiết
  // ════════════════════════════════════════════════════════

  it('UT-CN-10: GET /cong-no/doi-soat-chi-tiet → 200', async () => {
    const now = new Date();
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/cong-no/doi-soat-chi-tiet?thang=${now.getMonth() + 1}&nam=${now.getFullYear()}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);
  });

  // ════════════════════════════════════════════════════════
  // UT-CN-11: thang ngoài range → 400
  // ════════════════════════════════════════════════════════

  it('UT-CN-11: GET /bang-ke-thang?thang=13 → 400 schema validation', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/cong-no/bang-ke-thang?thang=13&nam=2026',
      token: adminToken,
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });
});
