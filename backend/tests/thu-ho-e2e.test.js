// tests/thu-ho-e2e.test.js — 3 E2E Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';
import { buildApp, getToken, authRequest } from './helpers/setup.js';

let app, adminToken, staffToken;
let vpGui, vpNhan, adminNV;
let testStaffId;
const createdBNIds = [];

beforeAll(async () => {
  app = await buildApp();
  adminToken = await getToken(app, 'admin', 'Tmq@1234');

  vpGui  = await prisma.vanPhong.findFirst({ where: { active: true } });
  vpNhan = await prisma.vanPhong.findFirst({ where: { active: true, id: { not: vpGui.id } } });
  if (!vpNhan) vpNhan = vpGui;
  adminNV = await prisma.nhanVien.findFirst({ where: { role: 'admin', active: true } });

  // Tạo staff test riêng
  const hash = await bcrypt.hash('Test@1234', 10);
  const ts = Date.now() % 99999;
  const staffNv = await prisma.nhanVien.create({
    data: {
      username: `e2e_stf_${ts}`,
      password_hash: hash,
      ma_nv: `ES${ts}`,
      ten: 'E2E Staff Test',
      role: 'staff',
      van_phong_id: vpGui.id,
      active: true,
    },
  });
  testStaffId = staffNv.id;
  staffToken = await getToken(app, staffNv.username, 'Test@1234');
});

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { bien_nhan_id: { in: createdBNIds } } });
  await prisma.phieuChi.deleteMany({ where: { ly_do: { contains: 'E2E-COD' } } });
  await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: createdBNIds } } });
  await prisma.congNo.deleteMany({ where: { bien_nhan_id: { in: createdBNIds } } });
  await prisma.bienNhan.deleteMany({ where: { id: { in: createdBNIds } } });
  if (testStaffId) await prisma.nhanVien.delete({ where: { id: testStaffId } });
  await app.close();
});

function makeBN(overrides = {}) {
  return {
    van_phong_gui_id: vpGui.id,
    van_phong_nhan_id: vpNhan.id,
    don_vi_gui: 'E2E Gui',
    nguoi_gui: 'NV Test',
    dien_thoai_gui: '0901110001',
    don_vi_nhan: 'E2E Nhan',
    nguoi_nhan: 'KH Test',
    dien_thoai_nhan: '0901110002',
    hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 2, ghi_chu: '' }],
    gia_cuoc: 60000,
    hinh_thuc_giao: 'goi_dien',
    ...overrides,
  };
}

// ─── E2E-TH-01: Kịch bản hoàn chỉnh COD ─────────────────────────────────────
describe('E2E-TH-01: Full COD lifecycle', () => {
  it('Tạo BN → khach_da_nhan → auto da_thu → chuyen → tra → tong-hop', async () => {
    // 1. Tạo BN có COD
    const createRes = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBN({ thu_ho: 1000000 }),
      token: adminToken,
    });
    expect(createRes.statusCode).toBe(201);
    const bn = JSON.parse(createRes.body).data;
    createdBNIds.push(bn.id);
    expect(bn.trang_thai_cod).toBe('cho_thu');

    // 2. Chuyển qua các bước → khach_da_nhan
    for (const step of ['dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan']) {
      await authRequest(app, {
        method: 'PATCH',
        url: `/api/bien-nhan/${bn.id}/trang-thai`,
        payload: { trang_thai: step },
        token: adminToken,
      });
    }

    // 3. Verify auto thu COD
    const afterDelivery = await prisma.bienNhan.findUnique({ where: { id: bn.id } });
    expect(afterDelivery.trang_thai_cod).toBe('da_thu');
    const pt_nhan = await prisma.phieuThu.findFirst({ where: { bien_nhan_id: bn.id } });
    expect(pt_nhan).toBeTruthy();

    // 4. Xác nhận chuyển
    const chuyenRes = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-chuyen`,
      payload: { hinh_thuc: 'chuyen_khoan' },
      token: adminToken,
    });
    expect(chuyenRes.statusCode).toBe(200);
    const chuyenBody = JSON.parse(chuyenRes.body);
    expect(chuyenBody.data.bn.trang_thai_cod).toBe('da_chuyen');
    expect(chuyenBody.data.phieu_chi).toBeTruthy();
    expect(chuyenBody.data.phieu_thu).toBeTruthy();

    // 5. Xác nhận trả
    const traRes = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-tra`,
      payload: { hinh_thuc: 'tien_mat' },
      token: adminToken,
    });
    expect(traRes.statusCode).toBe(200);
    const traBody = JSON.parse(traRes.body);
    expect(traBody.data.bn.trang_thai_cod).toBe('da_tra');

    // 6. Verify tong-hop phản ánh đúng
    const tongHopRes = await authRequest(app, {
      method: 'GET',
      url: '/api/thu-ho/tong-hop',
      token: adminToken,
    });
    const tongHop = JSON.parse(tongHopRes.body).data;
    expect(tongHop.da_tra.count).toBeGreaterThanOrEqual(1);
    expect(Number(tongHop.da_tra.total)).toBeGreaterThanOrEqual(1000000);
  });
});

// ─── E2E-TH-02: COD + Công nợ độc lập nhau ───────────────────────────────────
describe('E2E-TH-02: COD + Công nợ independent', () => {
  it('Xác nhận công nợ không ảnh hưởng COD', async () => {
    // Tạo BN có cả COD và công nợ
    const createRes = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBN({ thu_ho: 500000, trang_thai_thu: 'cong_no' }),
      token: adminToken,
    });
    expect(createRes.statusCode).toBe(201);
    const bn = JSON.parse(createRes.body).data;
    createdBNIds.push(bn.id);

    expect(bn.trang_thai_cod).toBe('cho_thu');
    expect(bn.trang_thai_thu).toBe('cong_no');

    // Verify công nợ được tạo
    const congNo = await prisma.congNo.findFirst({ where: { bien_nhan_id: bn.id } });
    expect(congNo).toBeTruthy();

    // COD vẫn cho_thu, không bị ảnh hưởng bởi công nợ
    const bnDB = await prisma.bienNhan.findUnique({ where: { id: bn.id } });
    expect(bnDB.trang_thai_cod).toBe('cho_thu');
  });
});

// ─── E2E-TH-03: RBAC E2E cho COD ────────────────────────────────────────────
describe('E2E-TH-03: RBAC cho COD endpoints', () => {
  it('Staff: thu=200, chuyen=403 | Admin: chuyen=200', async () => {
    // Tạo BN có COD
    const bn = await prisma.bienNhan.create({
      data: {
        ma_so: `E2E-COD-RBAC-${Date.now()}`,
        van_phong_gui_id: vpGui.id,
        van_phong_nhan_id: vpNhan.id,
        nhan_vien_nhap_id: adminNV.id,
        don_vi_gui: 'RBAC Gui', don_vi_nhan: 'RBAC Nhan',
        dien_thoai_gui: '0902220001', dien_thoai_nhan: '0902220002',
        thu_ho: 800000, trang_thai_cod: 'cho_thu', gia_cuoc: 30000,
      },
    });
    createdBNIds.push(bn.id);

    // Staff POST xac-nhan-thu → 200 (staff được phép)
    const staffThuRes = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-thu`,
      payload: {},
      token: staffToken,
    });
    expect(staffThuRes.statusCode).toBe(200);

    // Staff POST xac-nhan-chuyen → 403 (staff không được phép)
    const staffChuyenRes = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-chuyen`,
      payload: {},
      token: staffToken,
    });
    expect(staffChuyenRes.statusCode).toBe(403);

    // Admin POST xac-nhan-chuyen → 200
    const adminChuyenRes = await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-chuyen`,
      payload: {},
      token: adminToken,
    });
    expect(adminChuyenRes.statusCode).toBe(200);
  });
});
