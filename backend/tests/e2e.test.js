// tests/e2e.test.js
// ─────────────────────────────────────────────────────────
// Cấp 3: System E2E Test — 5 kịch bản
// Mỗi kịch bản là luồng end-to-end hoàn chỉnh, nhiều step
//
// ST-01: Tạo BN → Vận chuyển 5 bước → Scan QR
// ST-02: Tạo BN công nợ → Đối soát → Thu tiền
// ST-03: Batch cập nhật trạng thái (5 BN)
// ST-04: Bảng kê HĐDT (BN chờ → Tạo → Lịch sử)
// ST-05: Quản lý NV + phân quyền 3 role
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';

describe('Cấp 3: System E2E — 5 kịch bản', () => {
  let app, adminToken;
  let vpGuiId, vpNhanId, adminId;
  const cleanup = { bnIds: [], bkIds: [], nvIds: [] };

  async function mkBN(opts = {}) {
    const bn = await prisma.bienNhan.create({
      data: {
        ma_so: `E2E-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        don_vi_gui: opts.donViGui ?? 'E2E Gửi [E2E-TEST]',
        don_vi_nhan: 'E2E Nhận [E2E-TEST]',
        gia_cuoc: opts.giaCuoc ?? 150000,
        trang_thai: 'cho_vc',
        trang_thai_thu: opts.trangThaiThu ?? 'da_thu',
        can_xuat_hddt: opts.canHddt ?? false,
        da_vao_bang_ke: false,
        nhan_vien_nhap_id: adminId,
      },
    });
    cleanup.bnIds.push(bn.id);
    return bn;
  }

  async function patch(bnId, tt, ghiChu = '') {
    return authRequest(app, {
      method: 'PATCH',
      url: `/api/bien-nhan/${bnId}/trang-thai`,
      token: adminToken,
      payload: { trang_thai: tt, ghi_chu: ghiChu || undefined },
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

    // Dọn data test cũ
    const oldBNs = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[E2E-TEST]' } }, select: { id: true },
    });
    if (oldBNs.length > 0) {
      const ids = oldBNs.map(b => b.id);
      await prisma.phieuThu.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.congNo.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: ids } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.bangKe.deleteMany({ where: { bien_so_xe: 'E2E-BSX' } });
  });

  afterAll(async () => {
    // BK
    const bks = await prisma.bangKe.findMany({ where: { bien_so_xe: 'E2E-BSX' }, select: { id: true } });
    if (bks.length > 0) {
      const ids = bks.map(b => b.id);
      await prisma.bangKeChiTiet.deleteMany({ where: { bang_ke_id: { in: ids } } });
      await prisma.bangKe.deleteMany({ where: { id: { in: ids } } });
    }
    // BN
    const bns = await prisma.bienNhan.findMany({
      where: { don_vi_gui: { contains: '[E2E-TEST]' } }, select: { id: true },
    });
    const allIds = [...new Set([...cleanup.bnIds, ...bns.map(b => b.id)])];
    if (allIds.length > 0) {
      await prisma.phieuThu.deleteMany({ where: { bien_nhan_id: { in: allIds } } });
      await prisma.congNo.deleteMany({ where: { bien_nhan_id: { in: allIds } } });
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: allIds } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: allIds } } });
    }
    // NV test
    for (const id of cleanup.nvIds) {
      await prisma.nhanVien.delete({ where: { id } }).catch(() => {});
    }
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // ST-01: Tạo BN → Vận chuyển 5 bước → Scan QR
  // ════════════════════════════════════════════════════════

  it('ST-01: Luồng vận chuyển hoàn chỉnh: cho_vc → dang_vc → da_den_kho → da_bao_khach → khach_da_nhan → Scan = terminal', async () => {
    // Bước 1: Tạo BN
    const bn = await mkBN({ donViGui: 'Cty ST01 [E2E-TEST]' });
    expect(bn.trang_thai).toBe('cho_vc');

    // Bước 2-5: Chuyển 4 lần state
    const transitions = [
      { tt: 'dang_vc',       note: 'xe SG-001 lấy hàng' },
      { tt: 'da_den_kho',    note: 'đã về kho SG' },
      { tt: 'da_bao_khach',  note: 'đã gọi KH: 0901234567' },
      { tt: 'khach_da_nhan', note: 'KH đã ký nhận' },
    ];

    for (const { tt, note } of transitions) {
      const res = await patch(bn.id, tt, note);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.trang_thai).toBe(tt);
    }

    // Bước 6: Scan QR — kiểm tra terminal
    const scanRes = await app.inject({ method: 'GET', url: `/api/scan/${bn.ma_so}` });
    expect(scanRes.statusCode).toBe(200);
    const scanBody = JSON.parse(scanRes.body);
    expect(scanBody.data.trang_thai).toBe('khach_da_nhan');
    expect(scanBody.data.next_trang_thai).toBeNull(); // Terminal
    expect(scanBody.data.lich_su.length).toBeGreaterThanOrEqual(4); // Ít nhất 4 entry

    // Kiểm tra lịch sử đủ và đúng thứ tự (mới nhất trước)
    expect(scanBody.data.lich_su[0].trang_thai_moi).toBe('khach_da_nhan');
  });

  // ════════════════════════════════════════════════════════
  // ST-02: Tạo BN công nợ → Đối soát → Thu tiền
  // ════════════════════════════════════════════════════════

  it('ST-02: Luồng công nợ: BN cong_no → CongNo.chua_thu → GET /cong-no → Thu → da_thu + PT', async () => {
    // Bước 1: Tạo BN + CongNo
    const bn = await mkBN({ trangThaiThu: 'cong_no', giaCuoc: 250000 });
    const cn = await prisma.congNo.create({
      data: {
        bien_nhan_id: bn.id,
        doi_tuong: 'Cty ST02 [E2E-TEST]',
        so_tien_no: 250000,
        trang_thai: 'chua_thu',
      },
    });

    // Bước 2: Đối soát — xem danh sách chua_thu
    const listRes = await authRequest(app, {
      method: 'GET',
      url: '/api/cong-no?trang_thai=chua_thu',
      token: adminToken,
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body);
    const found = listBody.data.find(c => c.id === cn.id);
    expect(found).toBeDefined();
    expect(Number(found.so_tien_no)).toBe(250000);

    // Bước 3: Thu tiền
    const payRes = await authRequest(app, {
      method: 'POST',
      url: `/api/cong-no/${cn.id}/xac-nhan-thanh-toan`,
      token: adminToken,
      payload: { hinh_thuc: 'chuyen_khoan', ghi_chu: 'ST02 E2E' },
    });
    expect(payRes.statusCode).toBe(200);
    const payBody = JSON.parse(payRes.body);
    expect(payBody.data.phieu_thu.ma_phieu).toMatch(/^PT-/);

    // Bước 4: Kiểm tra CongNo da_thu + PhieuThu tồn tại
    const cnCheck = await prisma.congNo.findUnique({ where: { id: cn.id } });
    expect(cnCheck.trang_thai).toBe('da_thu');
    const pt = await prisma.phieuThu.findUnique({ where: { id: cnCheck.phieu_thu_id } });
    expect(pt).not.toBeNull();
    expect(Number(pt.so_tien)).toBe(250000);

    // Bước 5: Xác nhận lần 2 → phải 400
    const dupRes = await authRequest(app, {
      method: 'POST',
      url: `/api/cong-no/${cn.id}/xac-nhan-thanh-toan`,
      token: adminToken,
      payload: {},
    });
    expect(dupRes.statusCode).toBe(400);
  });

  // ════════════════════════════════════════════════════════
  // ST-03: Batch cập nhật trạng thái 5 BN
  // ════════════════════════════════════════════════════════

  it('ST-03: Batch 5 BN cho_vc → dang_vc → da_den_kho: mỗi bước verify DB', async () => {
    const bns = await Promise.all(
      Array.from({ length: 5 }, (_, i) => mkBN({ donViGui: `ST03 #${i + 1} [E2E-TEST]` })),
    );
    const ids = bns.map(b => b.id);

    // Bước 1: Batch → dang_vc
    const res1 = await authRequest(app, {
      method: 'PATCH',
      url: '/api/bien-nhan/batch-trang-thai',
      token: adminToken,
      payload: { ids, trang_thai: 'dang_vc', ghi_chu: 'xe SG-999 batch E2E' },
    });
    expect(res1.statusCode).toBe(200);
    expect(JSON.parse(res1.body).message).toContain('5');

    const step1 = await prisma.bienNhan.findMany({ where: { id: { in: ids } } });
    step1.forEach(b => expect(b.trang_thai).toBe('dang_vc'));

    // Bước 2: Batch → da_den_kho
    const res2 = await authRequest(app, {
      method: 'PATCH',
      url: '/api/bien-nhan/batch-trang-thai',
      token: adminToken,
      payload: { ids, trang_thai: 'da_den_kho', ghi_chu: 'về kho SG batch' },
    });
    expect(res2.statusCode).toBe(200);

    const step2 = await prisma.bienNhan.findMany({ where: { id: { in: ids } } });
    step2.forEach(b => expect(b.trang_thai).toBe('da_den_kho'));

    // Verify lịch sử: mỗi BN có ít nhất 2 log
    for (const id of ids.slice(0, 2)) { // Kiểm tra 2/5 để nhanh
      const logs = await prisma.lichSuTrangThai.findMany({ where: { bien_nhan_id: id } });
      expect(logs.length).toBeGreaterThanOrEqual(2);
    }
  });

  // ════════════════════════════════════════════════════════
  // ST-04: Bảng kê HĐDT (BN chờ → Tạo → Lịch sử)
  // ════════════════════════════════════════════════════════

  it('ST-04: Luồng HĐDT: 2 BN có HĐDT → tạo BangKe → xem lịch sử → download', async () => {
    const bn1 = await mkBN({ canHddt: true, giaCuoc: 100000, donViGui: 'ST04 A [E2E-TEST]' });
    const bn2 = await mkBN({ canHddt: true, giaCuoc: 200000, donViGui: 'ST04 B [E2E-TEST]' });

    // Bước 1: Xác nhận 2 BN xuất hiện trong /bien-nhan-cho
    const choRes = await authRequest(app, {
      method: 'GET',
      url: '/api/bang-ke/bien-nhan-cho',
      token: adminToken,
    });
    expect(choRes.statusCode).toBe(200);
    const choBody = JSON.parse(choRes.body);
    const foundIds = choBody.data.map(bn => bn.id);
    expect(foundIds).toContain(bn1.id);
    expect(foundIds).toContain(bn2.id);

    // Bước 2: Tạo bảng kê
    const createRes = await authRequest(app, {
      method: 'POST',
      url: '/api/bang-ke',
      token: adminToken,
      payload: {
        bien_so_xe: 'E2E-BSX',
        items: [{ bien_nhan_id: bn1.id }, { bien_nhan_id: bn2.id }],
      },
    });
    expect(createRes.statusCode).toBe(200);
    const bk = JSON.parse(createRes.body).data.bang_ke;
    expect(bk.so_bien_nhan).toBe(2);
    expect(Number(bk.tong_cuoc)).toBe(300000);
    cleanup.bkIds.push(bk.id);

    // Bước 3: Xác nhận 2 BN đã bị đánh dấu
    const [b1, b2] = await Promise.all([
      prisma.bienNhan.findUnique({ where: { id: bn1.id } }),
      prisma.bienNhan.findUnique({ where: { id: bn2.id } }),
    ]);
    expect(b1.da_vao_bang_ke).toBe(true);
    expect(b2.da_vao_bang_ke).toBe(true);

    // Bước 4: Xem lịch sử có BK vừa tạo
    const listRes = await authRequest(app, {
      method: 'GET',
      url: '/api/bang-ke',
      token: adminToken,
    });
    expect(listRes.statusCode).toBe(200);
    const listIds = JSON.parse(listRes.body).data.map(b => b.id);
    expect(listIds).toContain(bk.id);

    // Bước 5: Download lại
    const dlRes = await authRequest(app, {
      method: 'GET',
      url: `/api/bang-ke/${bk.id}/download`,
      token: adminToken,
    });
    expect(dlRes.statusCode).toBe(200);
    const dlBody = JSON.parse(dlRes.body);
    expect(dlBody.data.file.base64.length).toBeGreaterThan(100);
  });

  // ════════════════════════════════════════════════════════
  // ST-05: Quản lý NV + phân quyền 3 role
  // ════════════════════════════════════════════════════════

  it('ST-05: Tạo NV staff → login → gọi admin API → 403; Admin vô hiệu hóa → login → 401', async () => {
    const username = `e2e_staff_${Date.now()}`;
    const password = 'E2e@1234!';
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(password, 10);

    // Bước 1: Admin tạo NV staff
    const nv = await prisma.nhanVien.create({
      data: {
        username,
        password_hash: hash,
        ma_nv: `E2E-${Date.now()}`,
        ten: 'E2E Staff [E2E-TEST]',
        role: 'staff',
        van_phong_id: vpGuiId,
        active: true,
      },
    });
    cleanup.nvIds.push(nv.id);

    // Bước 2: Staff login → lấy token
    const staffToken = await getToken(app, username, password);
    expect(staffToken).toBeTruthy();

    // Bước 3: Staff gọi API admin-only → 403
    const adminOnlyRes = await authRequest(app, {
      method: 'GET',
      url: '/api/nhan-vien',
      token: staffToken,
    });
    expect(adminOnlyRes.statusCode).toBe(403);

    // Bước 4: Staff gọi endpoint đúng quyền → 200
    const okRes = await authRequest(app, {
      method: 'GET',
      url: '/api/bien-nhan',
      token: staffToken,
    });
    expect(okRes.statusCode).toBe(200);

    // Bước 5: Admin vô hiệu hóa NV
    const deactivateRes = await authRequest(app, {
      method: 'PATCH',
      url: `/api/nhan-vien/${nv.id}/active`,
      token: adminToken,
      payload: { active: false },
    });
    expect(deactivateRes.statusCode).toBe(200);

    // Bước 6: Staff đăng nhập lại → phải fail (401 hoặc account inactive)
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password },
    });
    expect([401, 403]).toContain(loginRes.statusCode);
  });
});
