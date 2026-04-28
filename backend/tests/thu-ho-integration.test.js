// tests/thu-ho-integration.test.js — 8 Integration Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/config/database.js';
import { buildApp, getToken, authRequest } from './helpers/setup.js';

let app, adminToken;
let vpGui, vpNhan, adminNV;
const createdBNIds = [];

beforeAll(async () => {
  app = await buildApp();
  adminToken = await getToken(app, 'admin', 'Tmq@1234');

  vpGui  = await prisma.vanPhong.findFirst({ where: { active: true } });
  vpNhan = await prisma.vanPhong.findFirst({ where: { active: true, id: { not: vpGui.id } } });
  if (!vpNhan) vpNhan = vpGui;
  adminNV = await prisma.nhanVien.findFirst({ where: { role: 'admin', active: true } });
});

afterAll(async () => {
  await prisma.phieuThu.deleteMany({ where: { bien_nhan_id: { in: createdBNIds } } });
  await prisma.phieuChi.deleteMany({ where: { ly_do: { contains: 'INT-COD' } } });
  await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: createdBNIds } } });
  await prisma.congNo.deleteMany({ where: { bien_nhan_id: { in: createdBNIds } } });
  await prisma.bienNhan.deleteMany({ where: { id: { in: createdBNIds } } });
  await app.close();
});

function makeBNPayload(overrides = {}) {
  return {
    van_phong_gui_id: vpGui.id,
    van_phong_nhan_id: vpNhan.id,
    don_vi_gui: 'INT Test Gui',
    nguoi_gui: 'NV Gui',
    dien_thoai_gui: '0901234567',
    don_vi_nhan: 'INT Test Nhan',
    nguoi_nhan: 'KH Nhan',
    dien_thoai_nhan: '0907654321',
    hang_hoa_json: [{ don_vi: 'Kiện', so_luong: 1, ghi_chu: '' }],
    gia_cuoc: 50000,
    hinh_thuc_giao: 'goi_dien',
    thu_ho: 0,
    ...overrides,
  };
}

// ─── IT-TH-01: Tạo BN thu_ho=2M → trang_thai_cod = cho_thu ──────────────────
describe('IT-TH-01: Tạo BN thu_ho > 0 → auto cho_thu', () => {
  it('trang_thai_cod phải là cho_thu', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBNPayload({ thu_ho: 2000000 }),
      token: adminToken,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.trang_thai_cod).toBe('cho_thu');
    createdBNIds.push(body.data.id);
  });
});

// ─── IT-TH-02: Tạo BN thu_ho=0 → trang_thai_cod = khong_co ──────────────────
describe('IT-TH-02: Tạo BN thu_ho = 0 → auto khong_co', () => {
  it('trang_thai_cod phải là khong_co', async () => {
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBNPayload({ thu_ho: 0 }),
      token: adminToken,
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.trang_thai_cod).toBe('khong_co');
    createdBNIds.push(body.data.id);
  });
});

// ─── IT-TH-03: PATCH → khach_da_nhan (BN COD cho_thu) → auto da_thu ─────────
describe('IT-TH-03: PATCH khach_da_nhan → auto thu COD', () => {
  it('auto chuyển COD → da_thu + tạo PhieuThu', async () => {
    // Tạo BN có COD + update qua các bước
    const createRes = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBNPayload({ thu_ho: 1000000 }),
      token: adminToken,
    });
    const bnId = JSON.parse(createRes.body).data.id;
    createdBNIds.push(bnId);

    // Chuyển qua từng bước đến da_bao_khach
    const steps = ['dang_vc', 'da_den_kho', 'da_bao_khach'];
    for (const step of steps) {
      await authRequest(app, {
        method: 'PATCH',
        url: `/api/bien-nhan/${bnId}/trang-thai`,
        payload: { trang_thai: step },
        token: adminToken,
      });
    }

    // Chuyển sang khach_da_nhan → expect auto thu COD
    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${bnId}/trang-thai`,
      payload: { trang_thai: 'khach_da_nhan' },
      token: adminToken,
    });

    const body = JSON.parse(res.body);
    // Kiểm tra trong DB
    const bn = await prisma.bienNhan.findUnique({ where: { id: bnId } });
    expect(bn.trang_thai_cod).toBe('da_thu');

    const pt = await prisma.phieuThu.findFirst({ where: { bien_nhan_id: bnId } });
    expect(pt).toBeTruthy();
    expect(Number(pt.so_tien)).toBe(1000000);
  });
});

// ─── IT-TH-04: PATCH → khach_da_nhan (BN KHÔNG có COD) → giữ khong_co ───────
describe('IT-TH-04: PATCH khach_da_nhan không có COD → giữ khong_co', () => {
  it('trang_thai_cod không thay đổi', async () => {
    const createRes = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBNPayload({ thu_ho: 0 }),
      token: adminToken,
    });
    const bnId = JSON.parse(createRes.body).data.id;
    createdBNIds.push(bnId);

    const steps = ['dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan'];
    for (const step of steps) {
      await authRequest(app, {
        method: 'PATCH',
        url: `/api/bien-nhan/${bnId}/trang-thai`,
        payload: { trang_thai: step },
        token: adminToken,
      });
    }

    const bn = await prisma.bienNhan.findUnique({ where: { id: bnId } });
    expect(bn.trang_thai_cod).toBe('khong_co');
  });
});

// ─── IT-TH-05: Full flow thu → chuyển → trả + verify 4 phiếu ────────────────
describe('IT-TH-05: Full flow COD → 4 phiếu thu/chi', () => {
  it('1 PT@VP_nhan + 1 PC@VP_nhan + 1 PT@VP_gui + 1 PC@VP_gui', async () => {
    const bn = await prisma.bienNhan.create({
      data: {
        ma_so: `INT-COD-FULL-${Date.now()}`,
        van_phong_gui_id: vpGui.id,
        van_phong_nhan_id: vpNhan.id,
        nhan_vien_nhap_id: adminNV.id,
        don_vi_gui: 'INT Full Gui',
        don_vi_nhan: 'INT Full Nhan',
        dien_thoai_gui: '0909111001',
        dien_thoai_nhan: '0909111002',
        thu_ho: 3000000,
        trang_thai_cod: 'cho_thu',
        gia_cuoc: 80000,
      },
    });
    createdBNIds.push(bn.id);

    // Thu
    await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-thu`,
      payload: { hinh_thuc: 'tien_mat' },
      token: adminToken,
    });

    // Chuyển
    await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-chuyen`,
      payload: { hinh_thuc: 'tien_mat' },
      token: adminToken,
    });

    // Trả
    await authRequest(app, {
      method: 'POST',
      url: `/api/thu-ho/${bn.id}/xac-nhan-tra`,
      payload: { hinh_thuc: 'tien_mat' },
      token: adminToken,
    });

    // Verify final state
    const finalBN = await prisma.bienNhan.findUnique({ where: { id: bn.id } });
    expect(finalBN.trang_thai_cod).toBe('da_tra');

    // PT tại VP nhận
    const pt_nhan = await prisma.phieuThu.findMany({ where: { bien_nhan_id: bn.id, van_phong_id: vpNhan.id } });
    expect(pt_nhan.length).toBeGreaterThanOrEqual(1);

    // PT tại VP gửi
    const pt_gui = await prisma.phieuThu.findMany({ where: { bien_nhan_id: bn.id, van_phong_id: vpGui.id } });
    expect(pt_gui.length).toBeGreaterThanOrEqual(1);

    // PC tại VP nhận
    const pc_nhan = await prisma.phieuChi.findMany({ where: { ly_do: { contains: bn.ma_so }, van_phong_id: vpNhan.id } });
    expect(pc_nhan.length).toBeGreaterThanOrEqual(1);

    // PC tại VP gửi
    const pc_gui = await prisma.phieuChi.findMany({ where: { ly_do: { contains: bn.ma_so }, van_phong_id: vpGui.id } });
    expect(pc_gui.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── IT-TH-06: Edit thu_ho 0 → 500k → cho_thu ───────────────────────────────
describe('IT-TH-06: Edit thu_ho 0→500k → cho_thu', () => {
  it('trang_thai_cod chuyển sang cho_thu', async () => {
    const createRes = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBNPayload({ thu_ho: 0 }),
      token: adminToken,
    });
    const bnId = JSON.parse(createRes.body).data.id;
    createdBNIds.push(bnId);

    const updateRes = await authRequest(app, {
      method: 'PUT',
      url: `/api/bien-nhan/${bnId}`,
      payload: { thu_ho: 500000 },
      token: adminToken,
    });
    expect(updateRes.statusCode).toBe(200);
    const bn = await prisma.bienNhan.findUnique({ where: { id: bnId } });
    expect(bn.trang_thai_cod).toBe('cho_thu');
  });
});

// ─── IT-TH-07: Edit thu_ho 500k → 0 (khi cho_thu) → khong_co ────────────────
describe('IT-TH-07: Edit thu_ho 500k→0 (cho_thu) → khong_co', () => {
  it('trang_thai_cod reset về khong_co', async () => {
    const createRes = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      payload: makeBNPayload({ thu_ho: 500000 }),
      token: adminToken,
    });
    const bnId = JSON.parse(createRes.body).data.id;
    createdBNIds.push(bnId);

    const updateRes = await authRequest(app, {
      method: 'PUT',
      url: `/api/bien-nhan/${bnId}`,
      payload: { thu_ho: 0 },
      token: adminToken,
    });
    expect(updateRes.statusCode).toBe(200);
    const bn = await prisma.bienNhan.findUnique({ where: { id: bnId } });
    expect(bn.trang_thai_cod).toBe('khong_co');
  });
});

// ─── IT-TH-08: Edit thu_ho khi da_thu → reject 400 ─────────────────────────
describe('IT-TH-08: Edit thu_ho khi COD đã thu → 400', () => {
  it('không cho xóa thu_ho khi COD đang xử lý', async () => {
    const ts = Date.now() % 99999;
    const bn = await prisma.bienNhan.create({
      data: {
        ma_so: `COD-EB-${ts}`,
        van_phong_gui_id: vpGui.id,
        van_phong_nhan_id: vpNhan.id,
        nhan_vien_nhap_id: adminNV.id,
        don_vi_gui: 'X', don_vi_nhan: 'Y',
        dien_thoai_gui: '0909222001', dien_thoai_nhan: '0909222002',
        thu_ho: 500000, trang_thai_cod: 'da_thu', gia_cuoc: 10000,
      },
    });
    createdBNIds.push(bn.id);

    const res = await authRequest(app, {
      method: 'PUT',
      url: `/api/bien-nhan/${bn.id}`,
      payload: { thu_ho: 0 },
      token: adminToken,
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.message).toMatch(/không thể xóa/i);
  });
});
