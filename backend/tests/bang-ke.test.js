// tests/bang-ke.test.js
// ─────────────────────────────────────────────────────────
// Unit Test 1.9 — Bảng kê HĐĐT — 6 TC
// Tham chiếu: UT-BK-01 → UT-BK-06
//
// Chiến lược:
//  - UT-BK-01: GET /bien-nhan-cho → BN có can_xuat_hddt=true
//  - UT-BK-02: POST tạo bảng kê Case A (từ BN thật)
//  - UT-BK-03: POST tạo bảng kê Case B (kê thủ công)
//  - UT-BK-04: POST items rỗng → 400 schema (minItems:1)
//  - UT-BK-05: GET /:id/download → base64 Excel
//  - UT-BK-06: GET / danh sách lịch sử bảng kê → pagination
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.9 Bảng kê HĐĐT — /api/bang-ke (6 TC)', () => {
  let app, adminToken;
  let vpGuiId, vpNhanId, adminId;
  // BN test có can_xuat_hddt=true, da_vao_bang_ke=false
  let bnHddt;
  let createdBkId; // ID bảng kê tạo trong UT-BK-02

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
      where: { don_vi_gui: { contains: '[BK-TEST]' } },
      select: { id: true },
    });
    if (oldBNs.length > 0) {
      const ids = oldBNs.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }

    // Dọn BangKe test cũ
    const oldBKs = await prisma.bangKe.findMany({
      where: { bien_so_xe: 'BK-TEST-XE' },
      select: { id: true },
    });
    if (oldBKs.length > 0) {
      const ids = oldBKs.map(b => b.id);
      await prisma.bangKeChiTiet.deleteMany({ where: { bang_ke_id: { in: ids } } });
      await prisma.bangKe.deleteMany({ where: { id: { in: ids } } });
    }

    // Tạo BN test có can_xuat_hddt=true, da_vao_bang_ke=false
    bnHddt = await prisma.bienNhan.create({
      data: {
        ma_so: `BK-TEST-${Date.now()}`,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: 'Cty HĐDT Gửi [BK-TEST]',
        don_vi_nhan: 'Cty HĐDT Nhận [BK-TEST]',
        ten_hang_hoa: '5 thùng',
        gia_cuoc: 200000,
        trang_thai: 'cho_vc',
        trang_thai_thu: 'da_thu',
        can_xuat_hddt: true,
        da_vao_bang_ke: false,
        nhan_vien_nhap_id: adminId,
      },
    });
  });

  afterAll(async () => {
    // Xóa BangKe test (chi tiết cascade)
    const bks = await prisma.bangKe.findMany({
      where: { bien_so_xe: 'BK-TEST-XE' },
      select: { id: true },
    });
    if (bks.length > 0) {
      const ids = bks.map(b => b.id);
      await prisma.bangKeChiTiet.deleteMany({ where: { bang_ke_id: { in: ids } } });
      await prisma.bangKe.deleteMany({ where: { id: { in: ids } } });
    }
    // Xóa BN test
    const bns = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[BK-TEST]' } },
      select: { id: true },
    });
    if (bns.length > 0) {
      const ids = bns.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-BK-01: GET /bien-nhan-cho → danh sách BN chờ HĐDT
  // ════════════════════════════════════════════════════════

  it('UT-BK-01: GET /bang-ke/bien-nhan-cho → 200, chỉ BN có can_xuat_hddt=true', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bang-ke/bien-nhan-cho',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    // Tất cả BN trả về phải có can_xuat_hddt=true và da_vao_bang_ke=false
    body.data.forEach(bn => {
      expect(bn.can_xuat_hddt).toBe(true);
      expect(bn.da_vao_bang_ke).toBe(false);
    });

    // BN vừa tạo phải có trong danh sách
    const found = body.data.find(bn => bn.id === bnHddt.id);
    expect(found).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // UT-BK-02: POST tạo bảng kê — Case A (từ BN thật)
  // ════════════════════════════════════════════════════════

  it('UT-BK-02: POST /bang-ke Case A (bien_nhan_id) → 200, ma_bang_ke + file base64', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bang-ke',
      token: adminToken,
      payload: {
        bien_so_xe: 'BK-TEST-XE',
        items: [
          { bien_nhan_id: bnHddt.id },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.bang_ke.ma_bang_ke).toMatch(/^BK-/);
    expect(body.data.bang_ke.so_bien_nhan).toBe(1);
    expect(Number(body.data.bang_ke.tong_cuoc)).toBe(200000); // Prisma Decimal → string
    expect(body.data.file.base64).toBeDefined();
    expect(body.data.file.name).toContain('.xlsx');

    createdBkId = body.data.bang_ke.id;

    // Verify: BN đã được đánh dấu da_vao_bang_ke=true
    const bn = await prisma.bienNhan.findUnique({ where: { id: bnHddt.id } });
    expect(bn.da_vao_bang_ke).toBe(true);
  });

  // ════════════════════════════════════════════════════════
  // UT-BK-03: POST tạo bảng kê — Case B (kê thủ công)
  // ════════════════════════════════════════════════════════

  it('UT-BK-03: POST /bang-ke Case B (thủ công, bien_nhan_id=null) → 200', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bang-ke',
      token: adminToken,
      payload: {
        bien_so_xe: 'BK-TEST-XE',
        items: [
          {
            bien_nhan_id: null,
            ngay: today,
            tuyen: 'SG→CT',
            nguoi_gui: 'Công ty ABC',
            dia_chi_gui: '123 Nguyễn Huệ, Q1',
            hang_hoa: '3 bao',
            gia_cuoc: 150000,
          },
          {
            bien_nhan_id: null,
            ngay: today,
            tuyen: 'SG→HN',
            nguoi_gui: 'Công ty XYZ',
            dia_chi_gui: '456 Lê Lợi',
            hang_hoa: '2 kiện',
            gia_cuoc: 300000,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.bang_ke.so_bien_nhan).toBe(2);
    expect(Number(body.data.bang_ke.tong_cuoc)).toBe(450000); // Prisma Decimal → string
    expect(body.data.file.base64).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // UT-BK-04: POST items rỗng → 400
  // ════════════════════════════════════════════════════════

  it('UT-BK-04: POST /bang-ke items=[] → 400 (minItems: 1)', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bang-ke',
      token: adminToken,
      payload: {
        items: [], // Vi phạm minItems: 1
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-BK-05: GET /:id/download → base64 Excel
  // ════════════════════════════════════════════════════════

  it('UT-BK-05: GET /bang-ke/:id/download → 200, file.base64 + file.name', async () => {
    if (!createdBkId) {
      const bk = await prisma.bangKe.findFirst({ where: { bien_so_xe: 'BK-TEST-XE' } });
      createdBkId = bk?.id;
    }

    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/bang-ke/${createdBkId}/download`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.file.base64).toBeDefined();
    expect(body.data.file.base64.length).toBeGreaterThan(100); // base64 phải có dữ liệu thật
    expect(body.data.file.name).toContain('.xlsx');
  });

  // ════════════════════════════════════════════════════════
  // UT-BK-06: GET / → lịch sử bảng kê + pagination
  // ════════════════════════════════════════════════════════

  it('UT-BK-06: GET /bang-ke → 200, data array + pagination', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bang-ke',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThan(0); // Ít nhất 1 BK vừa tạo
    // BK vừa tạo phải nằm trong danh sách
    const found = body.data.find(bk => bk.id === createdBkId);
    expect(found).toBeDefined();
    expect(found.ma_bang_ke).toMatch(/^BK-/);
  });
});
