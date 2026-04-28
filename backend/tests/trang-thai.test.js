// tests/trang-thai.test.js
// ─────────────────────────────────────────────────────────
// Unit Test 1.7 — State Machine / Chuyển trạng thái — 13 TC
// Tham chiếu: UT-TT-01 → UT-TT-13
//
// Lưu ý: UT-TT-01 → UT-TT-08 đã được cover trong bien-nhan.test.js
// (UT-BN-09 → UT-BN-16). File này bổ sung các case:
//   - BN không tồn tại → 404
//   - LichSuTrangThai ghi đúng (trang_thai_cu, trang_thai_moi, phuong_thuc, ghi_chu)
//   - Batch hợp lệ: tất cả pass → commit
//   - Batch 1 BN không hợp lệ → reject all (400, không commit)
//   - Batch ids rỗng → 400 schema
//   - Các transition bị cấm: skip 2 bước, quay ngược, nhảy từ terminal
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('1.7 State Machine — /api/bien-nhan/:id/trang-thai (13 TC)', () => {
  let app, adminToken;
  let vpGuiId, vpNhanId, adminId;

  // Helper: tạo BN trực tiếp qua Prisma
  async function mkBN(label = '', trangThai = 'cho_vc') {
    return prisma.bienNhan.create({
      data: {
        ma_so: `TT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: `TT Gửi ${label} [TT-TEST]`,
        don_vi_nhan: `TT Nhận ${label} [TT-TEST]`,
        trang_thai: trangThai,
        gia_cuoc: 0,
        trang_thai_thu: 'da_thu',
        nhan_vien_nhap_id: adminId,
      },
    });
  }

  async function patch(bnId, trangThai, ghiChu = '') {
    return authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${bnId}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: trangThai, ghi_chu: ghiChu || undefined },
    });
  }

  async function batchPatch(ids, trangThai, ghiChu = '') {
    return authRequest(app, {
      method: 'PATCH',
      url: '/api/bien-nhan/batch-trang-thai',
      token: adminToken,
      payload: { ids, trang_thai: trangThai, ghi_chu: ghiChu || undefined },
    });
  }

  beforeAll(async () => {
    app = await buildApp();
    adminToken = await getToken(app, 'admin', 'Tmq@1234');
    const admin = await prisma.nhanVien.findFirst({ where: { username: 'admin' } });
    adminId = admin.id;
    const vps = await prisma.vanPhong.findMany({ take: 2, orderBy: { id: 'asc' } });
    vpGuiId  = vps[0].id;
    vpNhanId = vps[1].id;

    // Dọn từ lần chạy trước
    const old = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[TT-TEST]' } }, select: { id: true },
    });
    if (old.length > 0) {
      const ids = old.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.bienNhan.deleteMany({ where: { ma_so: { startsWith: 'TT-' } } });
  });

  afterAll(async () => {
    const bns = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[TT-TEST]' } }, select: { id: true },
    });
    if (bns.length > 0) {
      const ids = bns.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    const direct = await prisma.bienNhan.findMany({
      where: { ma_so: { startsWith: 'TT-' } }, select: { id: true },
    });
    if (direct.length > 0) {
      const ids = direct.map(b => b.id);
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-01: cho_vc → dang_vc ✓
  // ════════════════════════════════════════════════════════

  it('UT-TT-01: cho_vc → dang_vc → 200', async () => {
    const bn = await mkBN('TT01');
    const res = await patch(bn.id, 'dang_vc', 'xe đã lấy hàng');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('dang_vc');
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-02: dang_vc → da_den_kho ✓
  // ════════════════════════════════════════════════════════

  it('UT-TT-02: dang_vc → da_den_kho → 200', async () => {
    const bn = await mkBN('TT02', 'dang_vc');
    const res = await patch(bn.id, 'da_den_kho');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('da_den_kho');
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-03: da_den_kho → da_bao_khach ✓
  // ════════════════════════════════════════════════════════

  it('UT-TT-03: da_den_kho → da_bao_khach → 200', async () => {
    const bn = await mkBN('TT03', 'da_den_kho');
    const res = await patch(bn.id, 'da_bao_khach', 'đã gọi điện khách');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('da_bao_khach');
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-04: da_bao_khach → khach_da_nhan ✓ (terminal)
  // ════════════════════════════════════════════════════════

  it('UT-TT-04: da_bao_khach → khach_da_nhan → 200 (terminal)', async () => {
    const bn = await mkBN('TT04', 'da_bao_khach');
    const res = await patch(bn.id, 'khach_da_nhan');
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.trang_thai).toBe('khach_da_nhan');
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-05: cho_vc → da_den_kho ✗ (nhảy bước)
  // ════════════════════════════════════════════════════════

  it('UT-TT-05: cho_vc → da_den_kho → 400 (nhảy bước)', async () => {
    const bn = await mkBN('TT05');
    const res = await patch(bn.id, 'da_den_kho');
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.message).toMatch(/không thể chuyển/i);
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-06: cho_vc → khach_da_nhan ✗
  // ════════════════════════════════════════════════════════

  it('UT-TT-06: cho_vc → khach_da_nhan → 400', async () => {
    const bn = await mkBN('TT06');
    const res = await patch(bn.id, 'khach_da_nhan');
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-07: dang_vc → cho_vc ✗ (quay ngược)
  // ════════════════════════════════════════════════════════

  it('UT-TT-07: dang_vc → cho_vc → 400 (quay ngược)', async () => {
    const bn = await mkBN('TT07', 'dang_vc');
    const res = await patch(bn.id, 'cho_vc');
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-08: khach_da_nhan → bất kỳ ✗ (terminal state)
  // ════════════════════════════════════════════════════════

  it('UT-TT-08: khach_da_nhan → da_bao_khach → 400 (terminal lock)', async () => {
    const bn = await mkBN('TT08', 'khach_da_nhan');
    const res = await patch(bn.id, 'da_bao_khach');
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-09: BN không tồn tại → 404
  // ════════════════════════════════════════════════════════

  it('UT-TT-09: PATCH BN không tồn tại → 404', async () => {
    const res = await patch(99999999, 'dang_vc');
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-10: LichSuTrangThai ghi đúng đầy đủ
  // ════════════════════════════════════════════════════════

  it('UT-TT-10: PATCH → LichSuTrangThai ghi trang_thai_cu, moi, phuong_thuc, ghi_chu', async () => {
    const bn = await mkBN('TT10');
    const ghiChu = 'xe SG-12345 đã lấy';
    await patch(bn.id, 'dang_vc', ghiChu);

    const log = await prisma.lichSuTrangThai.findFirst({
      where: { bien_nhan_id: bn.id, trang_thai_moi: 'dang_vc' },
      orderBy: { created_at: 'desc' },
    });

    expect(log).not.toBeNull();
    expect(log.trang_thai_cu).toBe('cho_vc');
    expect(log.trang_thai_moi).toBe('dang_vc');
    expect(log.phuong_thuc).toBe('manual'); // default khi không truyền phuong_thuc
    expect(log.ghi_chu).toBe(ghiChu);
    expect(log.nhan_vien_id).toBe(adminId);
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-11: Batch hợp lệ — tất cả pass → commit
  // ════════════════════════════════════════════════════════

  it('UT-TT-11: Batch cho_vc → dang_vc (3 BN) → 200, tất cả cập nhật', async () => {
    const bns = await Promise.all([mkBN('B11a'), mkBN('B11b'), mkBN('B11c')]);
    const ids = bns.map(b => b.id);

    const res = await batchPatch(ids, 'dang_vc', 'batch gửi xe sáng');
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.message).toContain('3');

    // Verify DB: tất cả 3 đã đổi
    const updated = await prisma.bienNhan.findMany({ where: { id: { in: ids } } });
    expect(updated).toHaveLength(3);
    updated.forEach(b => expect(b.trang_thai).toBe('dang_vc'));

    // Verify LichSu ghi cho từng BN
    for (const id of ids) {
      const log = await prisma.lichSuTrangThai.findFirst({
        where: { bien_nhan_id: id, trang_thai_moi: 'dang_vc' },
      });
      expect(log).not.toBeNull();
      expect(log.trang_thai_cu).toBe('cho_vc');
    }
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-12: Batch — 1 BN không hợp lệ → reject all (400, không commit)
  // ════════════════════════════════════════════════════════

  it('UT-TT-12: Batch — 1 trong 3 BN sai trạng thái → 400, tất cả không thay đổi', async () => {
    const valid1  = await mkBN('B12a');            // cho_vc → dang_vc OK
    const valid2  = await mkBN('B12b');            // cho_vc → dang_vc OK
    const invalid = await mkBN('B12c', 'da_den_kho'); // da_den_kho → dang_vc FAIL

    const ids = [valid1.id, valid2.id, invalid.id];
    const res = await batchPatch(ids, 'dang_vc');

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    // Không có BN nào bị thay đổi (transactional)
    const check = await prisma.bienNhan.findMany({
      where: { id: { in: [valid1.id, valid2.id] } },
    });
    check.forEach(b => expect(b.trang_thai).toBe('cho_vc')); // vẫn ở cho_vc
  });

  // ════════════════════════════════════════════════════════
  // UT-TT-13: Batch ids rỗng → 400 schema validation
  // ════════════════════════════════════════════════════════

  it('UT-TT-13: Batch ids=[] → 400 (minItems: 1)', async () => {
    const res = await batchPatch([], 'dang_vc'); // mảng rỗng

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });
});
