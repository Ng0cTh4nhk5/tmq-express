import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';
import { buildApp, getToken, authRequest } from './helpers/setup.js';

let app, adminToken, staffToken, accountantToken;
let vpGui, vpNhan, adminNV, staffNV, accountantNV;
let bnId_cho_thu, bnId_da_thu, bnId_khong_co;
let testStaffId, testAccountantId;

beforeAll(async () => {
  app = await buildApp();
  adminToken = await getToken(app, 'admin', 'Tmq@1234');

  // Lấy dữ liệu cơ bản
  vpGui  = await prisma.vanPhong.findFirst({ where: { active: true } });
  vpNhan = await prisma.vanPhong.findFirst({ where: { active: true, id: { not: vpGui.id } } }) || vpGui;
  adminNV = await prisma.nhanVien.findFirst({ where: { role: 'admin', active: true } });

  // Tạo staff + accountant test
  const hash = await bcrypt.hash('Test@1234', 10);
  const vp1 = vpGui;

  const ts = Date.now() % 99999;
  const staffNvCreated = await prisma.nhanVien.create({
    data: {
      username: `th_stf_${ts}`,
      password_hash: hash,
      ma_nv: `TS${ts}`,
      ten: 'TH Staff Test',
      role: 'staff',
      van_phong_id: vp1.id,
      active: true,
    },
  });
  testStaffId = staffNvCreated.id;
  staffToken = await getToken(app, staffNvCreated.username, 'Test@1234');

  const acctNvCreated = await prisma.nhanVien.create({
    data: {
      username: `th_ac_${ts}`,
      password_hash: hash,
      ma_nv: `TA${ts}`,
      ten: 'TH Acct Test',
      role: 'accountant',
      van_phong_id: vp1.id,
      active: true,
    },
  });
  testAccountantId = acctNvCreated.id;
  accountantToken = await getToken(app, acctNvCreated.username, 'Test@1234');
  staffNV = staffNvCreated;

  // Tạo BN cho_thu
  const bn1 = await prisma.bienNhan.create({
    data: {
      ma_so: `TEST-COD-UNTHU-${Date.now()}`,
      van_phong_gui_id: vpGui.id,
      van_phong_nhan_id: vpNhan.id,
      nhan_vien_nhap_id: adminNV.id,
      don_vi_gui: 'UT Test Gui',
      nguoi_gui: 'NV Test',
      dien_thoai_gui: '0909000001',
      don_vi_nhan: 'UT Test Nhan',
      nguoi_nhan: 'KH Test',
      dien_thoai_nhan: '0909000002',
      thu_ho: 2000000,
      trang_thai_cod: 'cho_thu',
      gia_cuoc: 50000,
    },
  });
  bnId_cho_thu = bn1.id;

  // Tạo BN da_thu
  const bn2 = await prisma.bienNhan.create({
    data: {
      ma_so: `TEST-COD-DATHU-${Date.now()}`,
      van_phong_gui_id: vpGui.id,
      van_phong_nhan_id: vpNhan.id,
      nhan_vien_nhap_id: adminNV.id,
      don_vi_gui: 'UT Test Gui',
      don_vi_nhan: 'UT Test Nhan',
      dien_thoai_gui: '0909000003',
      dien_thoai_nhan: '0909000004',
      thu_ho: 1000000,
      trang_thai_cod: 'da_thu',
      gia_cuoc: 30000,
    },
  });
  bnId_da_thu = bn2.id;

  // Tạo BN khong_co
  const bn3 = await prisma.bienNhan.create({
    data: {
      ma_so: `TEST-COD-NONE-${Date.now()}`,
      van_phong_gui_id: vpGui.id,
      van_phong_nhan_id: vpNhan.id,
      nhan_vien_nhap_id: adminNV.id,
      don_vi_gui: 'UT Test Gui',
      don_vi_nhan: 'UT Test Nhan',
      dien_thoai_gui: '0909000005',
      dien_thoai_nhan: '0909000006',
      thu_ho: 0,
      trang_thai_cod: 'khong_co',
      gia_cuoc: 20000,
    },
  });
  bnId_khong_co = bn3.id;
});

afterAll(async () => {
  // Cleanup
  await prisma.phieuThu.deleteMany({ where: { bien_nhan_id: { in: [bnId_cho_thu, bnId_da_thu, bnId_khong_co].filter(Boolean) } } });
  await prisma.phieuChi.deleteMany({ where: { ly_do: { contains: 'TEST-COD' } } });
  await prisma.bienNhan.deleteMany({ where: { id: { in: [bnId_cho_thu, bnId_da_thu, bnId_khong_co].filter(Boolean) } } });
  // Cleanup test staff + accountant
  await prisma.nhanVien.deleteMany({ where: { id: { in: [testStaffId, testAccountantId].filter(Boolean) } } });
  await app.close();
});

// ─── UT-TH-01: GET /thu-ho → 200 ────────────────────────────────────────────
describe('UT-TH-01: GET /thu-ho danh sách COD', () => {
  it('admin → 200, trả về data + pagination + summary', async () => {
    const res = await authRequest(app, { method: 'GET', url: '/api/thu-ho', token: adminToken });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.summary).toBeDefined();
  });
});

// ─── UT-TH-02: Filter theo trang_thai_cod ────────────────────────────────────
describe('UT-TH-02: GET /thu-ho?trang_thai_cod=cho_thu', () => {
  it('chỉ trả BN có trang_thai_cod = cho_thu', async () => {
    const res = await authRequest(app, { method: 'GET', url: '/api/thu-ho?trang_thai_cod=cho_thu', token: adminToken });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    body.data.forEach(bn => {
      expect(bn.trang_thai_cod).toBe('cho_thu');
    });
  });
});

// ─── UT-TH-03: GET /tong-hop ─────────────────────────────────────────────────
describe('UT-TH-03: GET /thu-ho/tong-hop', () => {
  it('trả về 4 nhóm summary', async () => {
    const res = await authRequest(app, { method: 'GET', url: '/api/thu-ho/tong-hop', token: adminToken });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveProperty('cho_thu');
    expect(body.data).toHaveProperty('da_thu');
    expect(body.data).toHaveProperty('da_chuyen');
    expect(body.data).toHaveProperty('da_tra');
    expect(body.data.cho_thu).toHaveProperty('count');
    expect(body.data.cho_thu).toHaveProperty('total');
  });
});

// ─── UT-TH-04: POST xac-nhan-thu (BN cho_thu) → 200 ─────────────────────────
describe('UT-TH-04: xac-nhan-thu BN cho_thu', () => {
  it('→ 200, trang_thai_cod = da_thu, PhieuThu created', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bnId_cho_thu}/xac-nhan-thu`,
      payload: { hinh_thuc: 'tien_mat' },
      token: adminToken,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.bn.trang_thai_cod).toBe('da_thu');
    expect(body.data.phieu_thu).toBeDefined();
    expect(body.data.phieu_thu.van_phong_id).toBe(vpNhan.id);
  });
});

// ─── UT-TH-05: POST xac-nhan-thu (BN da_thu) → 400 ──────────────────────────
describe('UT-TH-05: xac-nhan-thu BN da_thu → 400', () => {
  it('→ 400 "COD đã được thu"', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bnId_da_thu}/xac-nhan-thu`,
      payload: {},
      token: adminToken,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toMatch(/đã được thu/i);
  });
});

// ─── UT-TH-06: POST xac-nhan-thu (BN khong_co) → 400 ────────────────────────
describe('UT-TH-06: xac-nhan-thu BN khong_co → 400', () => {
  it('→ 400 "không có tiền thu hộ"', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bnId_khong_co}/xac-nhan-thu`,
      payload: {},
      token: adminToken,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toMatch(/không có tiền thu hộ/i);
  });
});

// ─── UT-TH-07: POST xac-nhan-chuyen (BN da_thu) → 200 ───────────────────────
describe('UT-TH-07: xac-nhan-chuyen BN da_thu', () => {
  it('→ 200, da_chuyen, PhieuChi@VP_nhan + PhieuThu@VP_gui', async () => {
    // bnId_cho_thu lúc này đã là da_thu (sau UT-TH-04)
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bnId_cho_thu}/xac-nhan-chuyen`,
      payload: { hinh_thuc: 'tien_mat' },
      token: adminToken,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.bn.trang_thai_cod).toBe('da_chuyen');
    expect(body.data.phieu_chi.van_phong_id).toBe(vpNhan.id);
    expect(body.data.phieu_thu.van_phong_id).toBe(vpGui.id);
  });
});

// ─── UT-TH-08: POST xac-nhan-chuyen (BN cho_thu) → 400 ──────────────────────
describe('UT-TH-08: xac-nhan-chuyen BN cho_thu → 400', () => {
  it('→ 400 "Chưa thu COD"', async () => {
    // Tạo thêm BN cho_thu mới
    const bn = await prisma.bienNhan.create({
      data: {
        ma_so: `COD-CE-${Date.now() % 99999}`,
        van_phong_gui_id: vpGui.id,
        van_phong_nhan_id: vpNhan.id,
        nhan_vien_nhap_id: adminNV.id,
        don_vi_gui: 'X', don_vi_nhan: 'Y',
        dien_thoai_gui: '0909000007', dien_thoai_nhan: '0909000008',
        thu_ho: 500000, trang_thai_cod: 'cho_thu', gia_cuoc: 10000,
      },
    });
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-chuyen`,
      payload: {},
      token: adminToken,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toMatch(/chưa thu/i);
    await prisma.bienNhan.delete({ where: { id: bn.id } });
  });
});

// ─── UT-TH-09: POST xac-nhan-tra (BN da_chuyen) → 200 ───────────────────────
describe('UT-TH-09: xac-nhan-tra BN da_chuyen', () => {
  it('→ 200, da_tra, PhieuChi@VP_gui', async () => {
    // bnId_cho_thu lúc này đã là da_chuyen
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bnId_cho_thu}/xac-nhan-tra`,
      payload: { hinh_thuc: 'tien_mat' },
      token: adminToken,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.bn.trang_thai_cod).toBe('da_tra');
    expect(body.data.phieu_chi.van_phong_id).toBe(vpGui.id);
  });
});

// ─── UT-TH-10: POST xac-nhan-tra (BN da_thu) → 400 ──────────────────────────
describe('UT-TH-10: xac-nhan-tra khi chưa chuyển → 400', () => {
  it('→ 400 "COD chưa được chuyển"', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bnId_da_thu}/xac-nhan-tra`,
      payload: {},
      token: adminToken,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toMatch(/chưa được chuyển/i);
  });
});

// ─── UT-TH-11: POST xac-nhan-tra (BN da_tra) → 400 ──────────────────────────
describe('UT-TH-11: xac-nhan-tra BN da_tra → 400', () => {
  it('→ 400 "COD đã hoàn tất"', async () => {
    // bnId_cho_thu lúc này đã là da_tra
    const res = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bnId_cho_thu}/xac-nhan-tra`,
      payload: {},
      token: adminToken,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toMatch(/hoàn tất/i);
  });
});

// ─── UT-TH-12: Staff → 403 cho GET /thu-ho ───────────────────────────────────
describe('UT-TH-12: Staff GET /thu-ho → 403', () => {
  it('Staff không có quyền xem danh sách COD', async () => {
    const res = await authRequest(app, { method: 'GET', url: '/api/thu-ho', token: staffToken });
    expect(res.statusCode).toBe(403);
  });
});
