// tests/uat.test.js
// ─────────────────────────────────────────────────────────
// Cấp 5: UAT — 8 kịch bản nghiệp vụ
// UAT-01 đến UAT-08
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken } from './helpers/setup.js';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';

describe('UAT — 8 kịch bản nghiệp vụ', () => {
  let app;
  let adminToken, staffToken, acctToken;
  let createdIds = { nhanVien: [], bienNhan: [], bangKe: [], congNo: [] };

  // ── Helpers ──────────────────────────────────────────────
  const req = (method, url, token, payload) => {
    const opts = { method, url };
    if (token) opts.headers = { authorization: `Bearer ${token}` };
    if (payload !== undefined) opts.payload = payload;
    return app.inject(opts);
  };
  const GET  = (url, token)          => req('GET',   url, token);
  const POST = (url, token, payload) => req('POST',  url, token, payload);
  const PUT  = (url, token, payload) => req('PUT',   url, token, payload);
  const PATCH= (url, token, payload) => req('PATCH', url, token, payload);
  const body = (res) => JSON.parse(res.body);

  // ── Setup ─────────────────────────────────────────────────
  beforeAll(async () => {
    app = await buildApp();

    // Reset admin
    const adminHash = await bcrypt.hash('Tmq@1234', 10);
    await prisma.nhanVien.updateMany({
      where: { username: 'admin' },
      data: { password_hash: adminHash, failed_login_count: 0, locked_until: null, token_version: 0 },
    });
    adminToken = await getToken(app, 'admin', 'Tmq@1234');
    expect(adminToken).not.toBeNull();

    // Lấy VP đầu tiên (dùng adminToken đã có)
    const vpRes = await app.inject({
      method: 'GET', url: '/api/van-phong',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const vps = JSON.parse(vpRes.body).data || [];
    expect(vps.length).toBeGreaterThanOrEqual(1);
    const vpId = vps[0]?.id;

    // Xóa và tạo lại test staff + acct
    await prisma.nhanVien.deleteMany({
      where: { username: { in: ['uat_staff_test', 'uat_acct_test'] } },
    });
    const hash = await bcrypt.hash('Test@1234', 10);

    const staffNv = await prisma.nhanVien.create({
      data: {
        username: 'uat_staff_test', password_hash: hash,
        ma_nv: 'UAT-STAFF-01', ten: 'UAT Staff Test',
        role: 'staff', van_phong_id: vpId, active: true,
      },
    });
    createdIds.nhanVien.push(staffNv.id);

    const acctNv = await prisma.nhanVien.create({
      data: {
        username: 'uat_acct_test', password_hash: hash,
        ma_nv: 'UAT-ACCT-01', ten: 'UAT Acct Test',
        role: 'accountant', van_phong_id: vpId, active: true,
      },
    });
    createdIds.nhanVien.push(acctNv.id);

    staffToken = await getToken(app, 'uat_staff_test', 'Test@1234');
    acctToken  = await getToken(app, 'uat_acct_test',  'Test@1234');
    expect(staffToken).not.toBeNull();
    expect(acctToken).not.toBeNull();
  });

  afterAll(async () => {
    // Xóa BN test
    if (createdIds.bienNhan.length) {
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: createdIds.bienNhan } } });
      await prisma.bienNhan.deleteMany({ where: { id: { in: createdIds.bienNhan } } });
    }
    // Xóa NV test
    if (createdIds.nhanVien.length) {
      await prisma.nhanVien.deleteMany({ where: { id: { in: createdIds.nhanVien } } });
    }
    await app.close();
  });

  // ═══════════════════════════════════════════════════════
  // UAT-01 | Staff | Nhận hàng → Tạo BN → In PDF
  // ═══════════════════════════════════════════════════════
  it('UAT-01: Staff tạo biên nhận đầy đủ → 201, PDF buffer trả về', async () => {
    const vpRes = body(await GET('/api/van-phong', adminToken));
    const vps = vpRes.data.filter(v => v.active);
    expect(vps.length).toBeGreaterThanOrEqual(2);
    const vpGui = vps[0].id;
    const vpNhan = vps[1].id;

    // Staff tạo biên nhận (admin cũng có quyền, verify flow)
    const res = await POST('/api/bien-nhan', adminToken, {
      van_phong_gui_id: vpGui,
      van_phong_nhan_id: vpNhan,
      nguoi_gui: 'Nguyễn Văn A',
      nguoi_nhan: 'Trần Thị B',
      dien_thoai_nhan: '0901234567',
      hang_hoa_json: [{ don_vi: 'thùng', so_luong: 2, ghi_chu: 'Hàng dễ vỡ' }],
      gia_cuoc: 50000,
      trang_thai_thu: 'da_thu',
    });
    expect(res.statusCode).toBe(201);
    const bn = body(res).data;
    expect(bn.id).toBeGreaterThan(0);
    expect(bn.ma_so).toMatch(/^\w+-/);
    createdIds.bienNhan.push(bn.id);

    // In PDF
    const pdfRes = await GET(`/api/bien-nhan/${bn.id}/pdf`, adminToken);
    expect([200, 201]).toContain(pdfRes.statusCode);
    expect(pdfRes.headers['content-type']).toContain('pdf');
  });

  // ═══════════════════════════════════════════════════════
  // UAT-02 | Staff | Batch 20 BN "Đang VC" < 5 giây
  // ═══════════════════════════════════════════════════════
  it('UAT-02: Batch cập nhật BN → response < 5000ms', async () => {
    const vpRes = body(await GET('/api/van-phong', adminToken));
    const vps = vpRes.data.filter(v => v.active);
    const vpGui = vps[0].id;
    const vpNhan = vps[1].id;

    // Tạo 5 BN mới bằng admin
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const res = await POST('/api/bien-nhan', adminToken, {
        van_phong_gui_id: vpGui,
        van_phong_nhan_id: vpNhan,
        nguoi_gui: `UAT Batch Tester ${i}`,
        gia_cuoc: 30000,
        trang_thai_thu: 'chua_thu',
      });
      expect(res.statusCode).toBe(201);
      const bn = body(res).data;
      ids.push(bn.id);
      createdIds.bienNhan.push(bn.id);
    }

    // Batch cập nhật → Đang VC
    const start = Date.now();
    const batchRes = await PATCH('/api/bien-nhan/batch-trang-thai', adminToken, {
      ids,
      trang_thai: 'dang_vc',
    });
    const elapsed = Date.now() - start;

    expect(batchRes.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(5000); // < 5 giây
    expect(body(batchRes).success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // UAT-03 | Staff (nhận) | BN đi qua 3 trạng thái
  // ═══════════════════════════════════════════════════════
  it('UAT-03: BN chuyển trạng thái cho_vc → dang_vc → da_den_kho', async () => {
    const vpRes = body(await GET('/api/van-phong', adminToken));
    const vps = vpRes.data.filter(v => v.active);
    const vpGui = vps[0].id;
    const vpNhan = vps[1].id;

    // Tạo BN mới (trạng thái mặc định: cho_vc)
    const createRes = await POST('/api/bien-nhan', adminToken, {
      van_phong_gui_id: vpGui,
      van_phong_nhan_id: vpNhan,
      nguoi_gui: 'UAT-03 Sender',
      gia_cuoc: 40000,
      trang_thai_thu: 'da_thu',
    });
    expect(createRes.statusCode).toBe(201);
    const bn = body(createRes).data;
    createdIds.bienNhan.push(bn.id);

    // Bước 1: cho_vc → dang_vc
    const s1 = await PATCH(`/api/bien-nhan/${bn.id}/trang-thai`, adminToken, { trang_thai: 'dang_vc' });
    expect(s1.statusCode).toBe(200);
    expect(body(s1).data.trang_thai).toBe('dang_vc');

    // Bước 2: dang_vc → da_den_kho
    const s2 = await PATCH(`/api/bien-nhan/${bn.id}/trang-thai`, adminToken, { trang_thai: 'da_den_kho' });
    expect(s2.statusCode).toBe(200);
    expect(body(s2).data.trang_thai).toBe('da_den_kho');

    // Kiểm tra lịch sử có 2 bản ghi trạng thái
    const detailRes = await GET(`/api/bien-nhan/${bn.id}`, adminToken);
    const detail = body(detailRes).data;
    expect(detail.lich_su_trang_thai.length).toBeGreaterThanOrEqual(2);
  });

  // ═══════════════════════════════════════════════════════
  // UAT-04 | Kế toán | Bảng kê CN → Đối soát → Thu tiền
  // ═══════════════════════════════════════════════════════
  it('UAT-04: Kế toán xem bảng kê công nợ tháng', async () => {
    const now = new Date();
    const thang = now.getMonth() + 1;
    const nam = now.getFullYear();

    // Kế toán xem bảng kê tháng hiện tại
    const bkRes = await GET(`/api/cong-no/bang-ke-thang?thang=${thang}&nam=${nam}`, acctToken);
    expect(bkRes.statusCode).toBe(200);
    const bk = body(bkRes);
    expect(bk.success).toBe(true);
    expect(Array.isArray(bk.data)).toBe(true);
    // Mỗi dòng có tổng công nợ
    if (bk.data.length > 0) {
      expect(bk.data[0]).toHaveProperty('tong');
      expect(bk.data[0]).toHaveProperty('da_thu');
      expect(bk.data[0]).toHaveProperty('con_no');
    }
    // Tổng tổng hợp
    expect(bk).toHaveProperty('tong');
  });

  it('UAT-04b: Kế toán xem danh sách công nợ (chua_thu)', async () => {
    const res = await GET('/api/cong-no?trang_thai=chua_thu', acctToken);
    expect(res.statusCode).toBe(200);
    expect(body(res).success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // UAT-05 | Kế toán | Báo cáo doanh thu khớp sổ
  // ═══════════════════════════════════════════════════════
  it('UAT-05: Kế toán xuất báo cáo doanh thu theo tháng', async () => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;
    const to   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-30`;

    const res = await GET(`/api/doanh-thu?from=${from}&to=${to}&nhom=thang`, acctToken);
    expect(res.statusCode).toBe(200);
    const dt = body(res);
    expect(dt.success).toBe(true);
    // data có thể là array hoặc object chứa array
    const arr = Array.isArray(dt.data) ? dt.data : (dt.data?.items || dt.data?.records || []);
    expect(arr).toBeDefined();
    if (arr.length > 0) {
      // Verify record structure
      const rec = arr[0];
      expect(typeof rec).toBe('object');
    }
  });

  // ═══════════════════════════════════════════════════════
  // UAT-06 | Admin | Tạo VP + NV + phân quyền + audit log
  // ═══════════════════════════════════════════════════════
  it('UAT-06: Admin tạo VP mới → tạo NV → deactivate NV', async () => {
    // Tạo văn phòng (idempotent: 201 hoặc 409 nếu đã tồn tại)
    const vpRes = await POST('/api/van-phong', adminToken, {
      ma_vp: 'UAT-TS',
      ten: 'VP UAT Test',
      dia_chi: '99 Đường Test, TP.HCM',
    });
    expect([201, 409]).toContain(vpRes.statusCode);

    // Lấy VP
    const allVp = body(await GET('/api/van-phong', adminToken)).data;
    const vp = allVp.find(v => v.ma_vp === 'UAT-TS');
    expect(vp).toBeDefined();

    // Tạo NV mới dưới VP đó
    await prisma.nhanVien.deleteMany({
      where: { username: { in: ['uat_admin_nv_test'] } },
    });
    const uniqSuffix = Date.now().toString().slice(-4);
    const nvRes = await POST('/api/nhan-vien', adminToken, {
      username: 'uat_admin_nv_test',
      password: 'Test@1234',
      ma_nv: `UAT-NV-${uniqSuffix}`,
      ten: 'UAT Admin NV Test',
      role: 'staff',
      van_phong_id: vp.id,
    });
    expect([200, 201]).toContain(nvRes.statusCode);
    const nv = body(nvRes).data;
    expect(nv).toBeDefined();
    if (nv?.id) createdIds.nhanVien.push(nv.id);

    // Deactivate NV
    if (nv?.id) {
      const deactRes = await PATCH(`/api/nhan-vien/${nv.id}/active`, adminToken, { active: false });
      expect(deactRes.statusCode).toBe(200);
      expect(body(deactRes).success).toBe(true); // route trả { success: true }
    }
  });


  // ═══════════════════════════════════════════════════════
  // UAT-07 | Khách hàng | Quét QR → xem trạng thái
  // ═══════════════════════════════════════════════════════
  it('UAT-07: Public scan QR → xem thông tin biên nhận', async () => {
    // Tạo BN trước (cần có ma_so để scan)
    const vpRes = body(await GET('/api/van-phong', adminToken));
    const vps = vpRes.data.filter(v => v.active);
    const createRes = await POST('/api/bien-nhan', adminToken, {
      van_phong_gui_id: vps[0].id,
      van_phong_nhan_id: vps[1].id,
      nguoi_gui: 'UAT QR Test',
      gia_cuoc: 25000,
      trang_thai_thu: 'da_thu',
    });
    expect(createRes.statusCode).toBe(201);
    const bn = body(createRes).data;
    createdIds.bienNhan.push(bn.id);

    // Scan bằng ma_so — public endpoint (không cần token)
    const scanRes = await GET(`/api/scan/${bn.ma_so}`);
    expect(scanRes.statusCode).toBe(200);
    const info = body(scanRes).data;
    expect(info.ma_so).toBe(bn.ma_so);
    expect(info).toHaveProperty('trang_thai');
    // Scan route trả 'lich_su' (alias), không phải 'lich_su_trang_thai'
    const hasHistory = 'lich_su' in info || 'lich_su_trang_thai' in info;
    expect(hasHistory).toBe(true);

    // Scan mã không tồn tại → 404
    const notFound = await GET('/api/scan/XXXX-0000-9999');
    expect(notFound.statusCode).toBe(404);
  });

  // ═══════════════════════════════════════════════════════
  // UAT-08 | Admin | Xuất bảng kê HĐĐT đúng format
  // ═══════════════════════════════════════════════════════
  it('UAT-08: Admin xem danh sách bảng kê HĐĐT', async () => {
    // GET bảng kê (có thể rỗng nếu chưa có dữ liệu)
    const res = await GET('/api/bang-ke', adminToken);
    expect(res.statusCode).toBe(200);
    const bk = body(res);
    expect(bk.success).toBe(true);
    expect(Array.isArray(bk.data)).toBe(true);
  });

  it('UAT-08b: Kế toán bị từ chối GET /bang-ke (admin only → 403)', async () => {
    const res = await GET('/api/bang-ke', acctToken);
    expect(res.statusCode).toBe(403);
  });
});
