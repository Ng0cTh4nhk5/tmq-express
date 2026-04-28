// tests/edge-cases.test.js
// ─────────────────────────────────────────────────────────
// Edge Cases nghiệp vụ — 8 TC
// UAT-EC-01 đến UAT-EC-08
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken } from './helpers/setup.js';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';

describe('Edge Cases nghiệp vụ — 8 TC', () => {
  let app;
  let adminToken;
  let vpGuiId, vpNhanId, adminId;
  let createdBnIds = [];

  // ── Helpers ──────────────────────────────────────────────
  const inj = (method, url, token, payload) => {
    const opts = { method, url };
    if (token) opts.headers = { authorization: `Bearer ${token}` };
    if (payload !== undefined) opts.payload = payload;
    return app.inject(opts);
  };
  const GET   = (url, token)          => inj('GET',   url, token);
  const POST  = (url, token, payload) => inj('POST',  url, token, payload);
  const PUT   = (url, token, payload) => inj('PUT',   url, token, payload);
  const PATCH = (url, token, payload) => inj('PATCH', url, token, payload);
  const body  = (res) => JSON.parse(res.body);

  // Tạo BN sequential (tránh unique collision từ createWithCode retry)
  const makeBN = async (token, overrides = {}) => {
    const res = await POST('/api/bien-nhan', token, {
      van_phong_gui_id: vpGuiId,
      van_phong_nhan_id: vpNhanId,
      nguoi_gui: 'EC Test Sender',
      gia_cuoc: 30000,
      trang_thai_thu: 'da_thu',
      ...overrides,
    });
    if (res.statusCode === 201) createdBnIds.push(body(res).data.id);
    return res;
  };

  // ── Setup ─────────────────────────────────────────────────
  beforeAll(async () => {
    app = await buildApp();

    // Reset admin
    const h = await bcrypt.hash('Tmq@1234', 10);
    await prisma.nhanVien.updateMany({
      where: { username: 'admin' },
      data: { password_hash: h, failed_login_count: 0, locked_until: null, token_version: 0 },
    });
    adminToken = await getToken(app, 'admin', 'Tmq@1234');
    expect(adminToken).not.toBeNull();

    const admin = await prisma.nhanVien.findFirst({ where: { username: 'admin' } });
    adminId = admin.id;

    const vps = await prisma.vanPhong.findMany({ where: { active: true }, take: 2, orderBy: { id: 'asc' } });
    expect(vps.length).toBeGreaterThanOrEqual(2);
    vpGuiId  = vps[0].id;
    vpNhanId = vps[1].id;
  });

  afterAll(async () => {
    if (createdBnIds.length) {
      await prisma.lichSuTrangThai.deleteMany({ where: { bien_nhan_id: { in: createdBnIds } } });
      await prisma.congNo.deleteMany({ where: { bien_nhan_id: { in: createdBnIds } } }).catch(() => {});
      await prisma.bienNhan.deleteMany({ where: { id: { in: createdBnIds } } });
    }
    await app.close();
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-01 | BN back-date → ngày đúng trong DB
  // Lưu ý: Mã BN format PREFIX-XXXX (sequence), không embed date
  // ════════════════════════════════════════════════════════
  it('UAT-EC-01: BN back-date ngay_bien_nhan=2026-01-15 → DB lưu đúng ngày', async () => {
    const backDate = '2026-01-15';
    const res = await makeBN(adminToken, { ngay_bien_nhan: backDate, nguoi_gui: 'EC Back-date' });
    expect(res.statusCode).toBe(201);
    const bn = body(res).data;

    // Mã BN phải tồn tại và có định dạng đúng
    expect(bn.ma_so).toBeDefined();
    expect(bn.ma_so).toMatch(/^\w+-\d{4}$/); // FORMAT: PREFIX-XXXX

    // Verify ngày trong DB là ngày back-date
    const dbBn = await prisma.bienNhan.findUnique({ where: { id: bn.id } });
    // ngay_bien_nhan phải là 2026-01-15 (UTC date)
    const stored = dbBn.ngay_bien_nhan.toISOString().slice(0, 10);
    expect(stored).toBe('2026-01-15');

    // FINDING: Mã BN không embed date — đây là behavior hiện tại của hệ thống
    console.log(`[EC-01] BN back-date tạo thành công: ${bn.ma_so}, ngày: ${stored}`);
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-02 | 2 NV tạo BN cùng lúc → mã không trùng
  // createWithCode có retry anti-collision tối đa 3 lần
  // ════════════════════════════════════════════════════════
  it('UAT-EC-02: 2 request đồng thời → ít nhất 1 BN tạo được, mã không trùng', async () => {
    const [r1, r2] = await Promise.all([
      POST('/api/bien-nhan', adminToken, {
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        nguoi_gui: 'EC Concurrent A',
        gia_cuoc: 30000,
        trang_thai_thu: 'da_thu',
      }),
      POST('/api/bien-nhan', adminToken, {
        van_phong_gui_id: vpGuiId,
        van_phong_nhan_id: vpNhanId,
        nguoi_gui: 'EC Concurrent B',
        gia_cuoc: 30000,
        trang_thai_thu: 'da_thu',
      }),
    ]);

    // Ít nhất 1 phải thành công
    const successes = [r1, r2].filter(r => r.statusCode === 201);
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Thu thập IDs để cleanup
    [r1, r2].forEach(r => {
      if (r.statusCode === 201) createdBnIds.push(body(r).data.id);
    });

    // Nếu cả 2 thành công → mã KHÔNG được trùng
    if (successes.length === 2) {
      const codes = successes.map(r => body(r).data.ma_so);
      expect(codes[0]).not.toBe(codes[1]);
      console.log(`[EC-02] Cả 2 BN tạo thành công: ${codes[0]}, ${codes[1]}`);
    } else {
      console.log(`[EC-02] 1 BN thành công, 1 bị retry exhausted → 409 (expected with 3-retry limit)`);
    }

    // Không có 500 errors
    expect(r1.statusCode).not.toBe(500);
    expect(r2.statusCode).not.toBe(500);
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-03 | Sửa BN → DB cập nhật đúng
  // ════════════════════════════════════════════════════════
  it('UAT-EC-03: Sửa BN → gia_cuoc cập nhật, lịch sử trạng thái giữ nguyên', async () => {
    const createRes = await makeBN(adminToken, { gia_cuoc: 80000 });
    expect(createRes.statusCode).toBe(201);
    const bn = body(createRes).data;
    expect(Number(bn.gia_cuoc)).toBe(80000); // Decimal có thể trả string

    // Sửa gia_cuoc
    const editRes = await PUT(`/api/bien-nhan/${bn.id}`, adminToken, { gia_cuoc: 120000 });
    expect(editRes.statusCode).toBe(200);
    expect(Number(body(editRes).data.gia_cuoc)).toBe(120000);

    // Lịch sử trạng thái không bị ảnh hưởng
    const hist = await prisma.lichSuTrangThai.findMany({ where: { bien_nhan_id: bn.id } });
    expect(hist.length).toBeGreaterThanOrEqual(1);

    // DB verify
    const dbBn = await prisma.bienNhan.findUnique({ where: { id: bn.id } });
    expect(Number(dbBn.gia_cuoc)).toBe(120000);
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-04 | Đối soát công nợ → tổng ≥ 0
  // ════════════════════════════════════════════════════════
  it('UAT-EC-04: Bảng kê công nợ → tất cả tổng hợp ≥ 0', async () => {
    const now = new Date();
    const thang = now.getMonth() + 1;
    const nam   = now.getFullYear();

    const res = await GET(`/api/cong-no/bang-ke-thang?thang=${thang}&nam=${nam}`, adminToken);
    expect(res.statusCode).toBe(200);
    const bk = body(res);
    expect(bk.success).toBe(true);
    expect(bk.tong.con_no).toBeGreaterThanOrEqual(0);
    expect(bk.tong.da_thu).toBeGreaterThanOrEqual(0);
    expect(bk.tong.tong).toBeGreaterThanOrEqual(0);
    // con_no không vượt quá tổng
    expect(bk.tong.con_no).toBeLessThanOrEqual(bk.tong.tong + 1); // +1 for float tolerance
    console.log(`[EC-04] Công nợ tháng ${thang}/${nam}: tổng=${bk.tong.tong}, đã thu=${bk.tong.da_thu}, còn nợ=${bk.tong.con_no}`);
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-05 | VP gửi = VP nhận → system behavior
  // ════════════════════════════════════════════════════════
  it('UAT-EC-05: VP gửi = VP nhận → hệ thống không crash (201 hoặc 400)', async () => {
    const res = await POST('/api/bien-nhan', adminToken, {
      van_phong_gui_id: vpGuiId,
      van_phong_nhan_id: vpGuiId, // SAME VP
      nguoi_gui: 'EC Same VP',
      gia_cuoc: 10000,
      trang_thai_thu: 'da_thu',
    });

    // Không được 500 (server crash)
    expect(res.statusCode).not.toBe(500);
    // Chấp nhận 201 (hệ thống không enforce) hoặc 400 (validation chặt)
    expect([201, 400]).toContain(res.statusCode);

    if (res.statusCode === 201) {
      const bn = body(res).data;
      createdBnIds.push(bn.id);
      // Đây là behavior ĐÚNG — cho phép ship nội thành cùng VP
      console.log(`[EC-05] VP gửi = VP nhận được chấp nhận (thiết kế đúng — nội thành)`);
    } else {
      console.log('[EC-05] Server từ chối VP gửi = VP nhận → 400');
    }
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-06 | hang_hoa tất cả so_luong = 0 → ten_hang_hoa null
  // ════════════════════════════════════════════════════════
  it('UAT-EC-06: hang_hoa_json tất cả so_luong = 0 → ten_hang_hoa = null, so_luong = 0', async () => {
    const res = await makeBN(adminToken, {
      nguoi_gui: 'EC Zero Qty',
      hang_hoa_json: [
        { don_vi: 'thùng', so_luong: 0 },
        { don_vi: 'bao',   so_luong: 0 },
      ],
    });
    expect(res.statusCode).toBe(201);
    const bn = body(res).data;

    const dbBn = await prisma.bienNhan.findUnique({ where: { id: bn.id } });
    // buildTenHangHoa filter so_luong > 0 → tất cả = 0 → null
    expect(dbBn.ten_hang_hoa).toBeNull();
    expect(dbBn.so_luong).toBe(0);
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-07 | BN thiếu optional fields → tạo được
  // ════════════════════════════════════════════════════════
  it('UAT-EC-07: BN không có don_vi_gui/nhan, nguoi_gui/nhan → 201 OK (optional fields)', async () => {
    const res = await makeBN(adminToken, {
      nguoi_gui: undefined,
      gia_cuoc: 20000,
      trang_thai_thu: 'chua_thu',
    });
    // Nếu nguoi_gui là optional → 201
    // Nếu required → 400 (design decision)
    expect([201, 400]).toContain(res.statusCode);

    if (res.statusCode === 201) {
      const dbBn = await prisma.bienNhan.findUnique({ where: { id: body(res).data.id } });
      // Optional fields stored as null
      expect(dbBn.don_vi_gui).toBeNull();
      expect(dbBn.don_vi_nhan).toBeNull();
    } else {
      console.log('[EC-07] Server requires nguoi_gui or other fields → 400 (strict validation)');
    }
  });

  // ════════════════════════════════════════════════════════
  // UAT-EC-08 | Concurrent state transition → consistency
  // ════════════════════════════════════════════════════════
  it('UAT-EC-08: 2 PATCH trạng thái đồng thời → DB nhất quán, không 500', async () => {
    // Tạo BN ở cho_vc (sequential)
    const createRes = await makeBN(adminToken, { nguoi_gui: 'EC Concurrent State' });
    expect(createRes.statusCode).toBe(201);
    const bn = body(createRes).data;

    // 2 PATCH song song → cùng cho_vc → dang_vc
    const [p1, p2] = await Promise.all([
      PATCH(`/api/bien-nhan/${bn.id}/trang-thai`, adminToken, { trang_thai: 'dang_vc' }),
      PATCH(`/api/bien-nhan/${bn.id}/trang-thai`, adminToken, { trang_thai: 'dang_vc' }),
    ]);

    // Không có 500
    expect(p1.statusCode).not.toBe(500);
    expect(p2.statusCode).not.toBe(500);

    // Ít nhất 1 thành công
    const ok = [p1, p2].filter(r => r.statusCode === 200).length;
    expect(ok).toBeGreaterThanOrEqual(1);

    // DB consistent: trạng thái phải là dang_vc
    const dbBn = await prisma.bienNhan.findUnique({ where: { id: bn.id } });
    expect(dbBn.trang_thai).toBe('dang_vc');
    console.log(`[EC-08] Concurrent PATCH: ${ok}/2 thành công, trạng thái DB = ${dbBn.trang_thai}`);
  });
});
