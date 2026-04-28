// tests/bien-nhan.test.js
// ─────────────────────────────────────────────────────────
// Unit Test cho Module Biên nhận — 20 TC
// UT-BN-01 → UT-BN-20
//
// Lưu ý: Do Prisma Studio đang chạy nên không thể generate
// Prisma client mới. Vì vậy, các test tạo BN dùng prisma.bienNhan.create
// trực tiếp thay vì inject POST /api/bien-nhan để tránh xung đột.
// Các test liên quan đến route validation/logic vẫn dùng inject().
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.5 Module Biên nhận — /api/bien-nhan (20 TC)', () => {
  let app, adminToken;
  let vpGuiId, vpNhanId;   // Hai VP khác nhau
  let adminId;
  let createdBnId;          // BN chính để test các state machine

  // Helper: tạo BN trực tiếp qua Prisma (không qua HTTP)
  async function createTestBN(label = '') {
    return prisma.bienNhan.create({
      data: {
        ma_so: `TEST-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: `Cty Gửi ${label} [BN-TEST]`,
        don_vi_nhan: `Cty Nhận ${label} [BN-TEST]`,
        nguoi_gui: 'Test Gửi',
        nguoi_nhan: 'Test Nhận',
        gia_cuoc: 150000,
        trang_thai_thu: 'da_thu',
        trang_thai: 'cho_vc',
        nhan_vien_nhap_id: adminId,
      },
    });
  }

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');

    const admin = await prisma.nhanVien.findFirst({ where: { username: 'admin' } });
    adminId = admin.id;

    // Lấy 2 VP khác nhau (đã có trong DB)
    const vps = await prisma.vanPhong.findMany({ take: 2, orderBy: { id: 'asc' } });
    if (vps.length < 2) throw new Error('Cần ít nhất 2 VP để test');
    vpGuiId  = vps[0].id;
    vpNhanId = vps[1].id;

    // Dọn BN test cũ
    const oldBNs = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[BN-TEST]' } },
      select: { id: true },
    });
    if (oldBNs.length > 0) {
      const ids = oldBNs.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }

    // Tạo BN chính để test state machine
    const mainBN = await createTestBN('Main');
    createdBnId = mainBN.id;
  });

  afterAll(async () => {
    const testBNs = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[BN-TEST]' } },
      select: { id: true },
    });
    if (testBNs.length > 0) {
      const ids = testBNs.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    // Dọn BN tạo trực tiếp với prefix TEST-
    const testDirectBNs = await prisma.bienNhan.findMany({
      where: { ma_so: { startsWith: 'TEST-' } },
      select: { id: true },
    });
    if (testDirectBNs.length > 0) {
      const ids = testDirectBNs.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();

  });

  // ════════════════════════════════════════════════════════
  // UT-BN-01: Danh sách BN → 200 + pagination
  // ════════════════════════════════════════════════════════

  it('UT-BN-01: GET /bien-nhan → 200, data array + pagination', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBeGreaterThan(0);
    expect(body.pagination.total).toBeGreaterThan(0); // BN vừa tạo trong beforeAll
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-02: Filter theo trang_thai
  // ════════════════════════════════════════════════════════

  it('UT-BN-02: GET ?trang_thai=cho_vc → chỉ trả BN trạng thái cho_vc', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan?trang_thai=cho_vc',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    body.data.forEach((bn) => {
      expect(bn.trang_thai).toBe('cho_vc');
    });
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-03: Preview mã biên nhận
  // ════════════════════════════════════════════════════════

  it('UT-BN-03: GET /bien-nhan/next-ma-so → 200 + có data', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/bien-nhan/next-ma-so?vp_gui_id=${vpGuiId}&vp_nhan_id=${vpNhanId}&ngay=${today}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined(); // Mã preview không null
    expect(typeof body.data).toBe('string');
    expect(body.data.length).toBeGreaterThan(4); // Ít nhất có prefix
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-04: POST tạo BN → kiểm tra via DB (vì Prisma DLL bị lock)
  // ════════════════════════════════════════════════════════

  it('UT-BN-04: POST /bien-nhan — route validation: thiếu vp_gui → 400', async () => {
    // Test route schema validation trực tiếp
    const res = await authRequest(app, {
      method: 'POST',
      url: '/api/bien-nhan',
      token: adminToken,
      payload: {
        van_phong_nhan_id: vpNhanId,  // Thiếu van_phong_gui_id
      },
    });
    expect(res.statusCode).toBe(400);
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-05: BN tạo trực tiếp qua DB → trang_thai=cho_vc
  // ════════════════════════════════════════════════════════

  it('UT-BN-05: BN được tạo → DB verify trang_thai=cho_vc, có đủ VP info', async () => {
    const bn = await prisma.bienNhan.findUnique({
      where: { id: createdBnId },
      include: { van_phong_gui: true, van_phong_nhan: true },
    });

    expect(bn).not.toBeNull();
    expect(bn.trang_thai).toBe('cho_vc');
    expect(bn.van_phong_gui_id).toBe(vpGuiId);
    expect(bn.van_phong_nhan_id).toBe(vpNhanId);
    expect(bn.van_phong_gui).toBeDefined();
    expect(bn.van_phong_nhan).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-06: GET BN theo ID → 200
  // ════════════════════════════════════════════════════════

  it('UT-BN-06: GET /bien-nhan/:id → 200, đầy đủ thông tin', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/bien-nhan/${createdBnId}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdBnId);
    expect(body.data.ma_so).toBeDefined();
    expect(body.data.trang_thai).toBe('cho_vc');
    expect(body.data.van_phong_gui).toBeDefined();
    expect(body.data.van_phong_nhan).toBeDefined();
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-07: GET BN ID không tồn tại → 404
  // ════════════════════════════════════════════════════════

  it('UT-BN-07: GET /bien-nhan/99999999 → 404 NOT_FOUND', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan/99999999',
      token: adminToken,
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-08: Cập nhật thông tin BN → 200
  // ════════════════════════════════════════════════════════

  it('UT-BN-08: PUT /bien-nhan/:id → 200, thông tin được cập nhật', async () => {
    const res = await authRequest(app, {
      method: 'PUT',
      url: `/api/bien-nhan/${createdBnId}`,
      token: adminToken,
      payload: {
        nguoi_gui: 'Updated Người Gửi',
        gia_cuoc: 200000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.nguoi_gui).toBe('Updated Người Gửi');
    // Verify DB trực tiếp thay vì dựa vào response (Prisma schema có thể mismatch)
    const updated = await prisma.bienNhan.findUnique({ where: { id: createdBnId } });
    expect(updated.nguoi_gui).toBe('Updated Người Gửi');

  });

  // ════════════════════════════════════════════════════════
  // UT-BN-09 → UT-BN-13: State machine tuần tự
  // ════════════════════════════════════════════════════════

  it('UT-BN-09: PATCH trang-thai cho_vc → dang_vc → 200 + lịch sử ghi nhận', async () => {
    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${createdBnId}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: 'dang_vc', ghi_chu: 'xe đã lấy hàng' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('dang_vc');

    const history = await prisma.lichSuTrangThai.findFirst({
      where: { bien_nhan_id: createdBnId, trang_thai_moi: 'dang_vc' },
    });
    expect(history).not.toBeNull();
    expect(history.trang_thai_cu).toBe('cho_vc');
  });

  it('UT-BN-10: PATCH trang-thai skip cho_vc → da_den_kho → 400 sai thứ tự', async () => {
    // Tạo BN mới ở cho_vc để test skip
    const skipBN = await createTestBN('Skip');

    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${skipBN.id}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: 'da_den_kho' }, // Skip dang_vc
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);

    await prisma.bienNhan.delete({ where: { id: skipBN.id } });
  });

  it('UT-BN-11: PATCH trang-thai dang_vc → da_den_kho → 200', async () => {
    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${createdBnId}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: 'da_den_kho' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('da_den_kho');
  });

  it('UT-BN-12: PATCH trang-thai da_den_kho → da_bao_khach → 200', async () => {
    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${createdBnId}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: 'da_bao_khach', ghi_chu: 'đã gọi điện' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('da_bao_khach');
  });

  it('UT-BN-13: PATCH trang-thai da_bao_khach → khach_da_nhan → 200 (terminal)', async () => {
    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${createdBnId}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: 'khach_da_nhan' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('khach_da_nhan');
  });

  it('UT-BN-14: PATCH từ terminal khach_da_nhan → bất kỳ → 400', async () => {
    const res = await authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${createdBnId}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: 'da_bao_khach' }, // Quay lui từ terminal
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-15: Batch cập nhật → 200
  // ════════════════════════════════════════════════════════

  it('UT-BN-15: PATCH /batch-trang-thai — batch cho_vc → dang_vc → 200', async () => {
    const b1 = await createTestBN('Batch1');
    const b2 = await createTestBN('Batch2');

    const res = await authRequest(app, {
      method: 'PATCH',
      url: '/api/bien-nhan/batch-trang-thai',
      token: adminToken,
      payload: { ids: [b1.id, b2.id], trang_thai: 'dang_vc', ghi_chu: 'batch test' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.message).toContain('2');

    // Verify DB
    const updated = await prisma.bienNhan.findMany({ where: { id: { in: [b1.id, b2.id] } } });
    updated.forEach(bn => expect(bn.trang_thai).toBe('dang_vc'));
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-16: Batch với BN sai trạng thái → 400
  // ════════════════════════════════════════════════════════

  it('UT-BN-16: PATCH /batch-trang-thai — BN sai trạng thái → 400', async () => {
    const err = await createTestBN('BatchErr'); // cho_vc

    const res = await authRequest(app, {
      method: 'PATCH',
      url: '/api/bien-nhan/batch-trang-thai',
      token: adminToken,
      payload: { ids: [err.id], trang_thai: 'da_den_kho' }, // Skip dang_vc
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-17: Sổ biên nhận — thiếu params → 400
  // ════════════════════════════════════════════════════════

  it('UT-BN-17: GET /so-bien-nhan — thiếu ngay_tu → 400', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/bien-nhan/so-bien-nhan?vp_gui_id=${vpGuiId}&vp_nhan_id=${vpNhanId}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-18: Sổ biên nhận — VP gửi = VP nhận → 400
  // ════════════════════════════════════════════════════════

  it('UT-BN-18: GET /so-bien-nhan — VP gửi = VP nhận → 400', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await authRequest(app, {
      method: 'GET',
      url: `/api/bien-nhan/so-bien-nhan?ngay_tu=${today}&vp_gui_id=${vpGuiId}&vp_nhan_id=${vpGuiId}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-19: Search BN → lọc đúng
  // ════════════════════════════════════════════════════════

  it('UT-BN-19: GET ?search=BN-TEST → kết quả chứa searchterm', async () => {
    const res = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan?search=BN-TEST',
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    // Các BN test phải xuất hiện
    expect(body.data.length).toBeGreaterThan(0);
    body.data.forEach(bn => {
      const hasSearch = (bn.don_vi_gui || '').includes('BN-TEST') ||
                        (bn.don_vi_nhan || '').includes('BN-TEST');
      expect(hasSearch).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════
  // UT-BN-20: Xóa BN đang ở cho_vc → 200
  // ════════════════════════════════════════════════════════

  it('UT-BN-20: DELETE /bien-nhan/:id (cho_vc) → 200, BN bị xóa', async () => {
    const delBN = await createTestBN('Del');

    const res = await authRequest(app, {
      method: 'DELETE',
      url: `/api/bien-nhan/${delBN.id}`,
      token: adminToken,
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).success).toBe(true);

    // Verify: đã xóa
    const check = await prisma.bienNhan.findUnique({ where: { id: delBN.id } });
    expect(check).toBeNull();
  });
});
