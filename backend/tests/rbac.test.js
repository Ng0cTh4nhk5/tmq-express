// tests/rbac.test.js
// ─────────────────────────────────────────────────────────
// RBAC Matrix — 17 nhóm API × 4 Role
// Admin / Staff / Accountant / No Auth
//
// Convention:
//   allow  → 200/201/204
//   deny   → 403 (authenticated, forbidden)
//   noAuth → 401 (not authenticated)
//   pub    → 200/404 (public, no auth required)
// ─────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp, getToken, authRequest } from './helpers/setup.js';
import prisma from '../src/config/database.js';
import bcrypt from 'bcryptjs';

describe('RBAC Matrix — 17 API × 4 Role', () => {
  let app;
  let admin, staff, acct; // JWT tokens
  let createdNvIds = [];

  const NO_TOKEN = null;

  // Helper: gọi API với token (hoặc không có token)
  async function call(method, url, token, payload) {
    const opts = { method, url };
    if (token) opts.headers = { authorization: `Bearer ${token}` };
    if (payload !== undefined) opts.payload = payload;
    return app.inject(opts);
  }

  const allow  = (res) => expect([200, 201, 204]).toContain(res.statusCode);
  const deny   = (res) => expect(res.statusCode).toBe(403);
  const noAuth = (res) => expect(res.statusCode).toBe(401);
  const pub    = (res) => expect([200, 404]).toContain(res.statusCode);

  beforeAll(async () => {
    app = await buildApp();

    // Lấy VP đầu tiên
    const vps = await prisma.vanPhong.findMany({ take: 1, orderBy: { id: 'asc' } });
    const vpId = vps[0]?.id;

    // Xóa tài khoản test cũ nếu có
    await prisma.nhanVien.deleteMany({
      where: { username: { in: ['rbac_staff_test', 'rbac_acct_test', 'rbac_login_test'] } },
    });

    const hash = await bcrypt.hash('Test@1234', 10);

    // Tạo staff test
    const staffNv = await prisma.nhanVien.create({
      data: {
        username: 'rbac_staff_test',
        password_hash: hash,
        ma_nv: 'RBAC-STAFF-01',
        ten: 'RBAC Staff Test',
        role: 'staff',
        van_phong_id: vpId,
        active: true,
      },
    });
    createdNvIds.push(staffNv.id);

    // Tạo accountant test
    const acctNv = await prisma.nhanVien.create({
      data: {
        username: 'rbac_acct_test',
        password_hash: hash,
        ma_nv: 'RBAC-ACCT-01',
        ten: 'RBAC Acct Test',
        role: 'accountant',
        van_phong_id: vpId,
        active: true,
      },
    });
    createdNvIds.push(acctNv.id);

    // Tạo login test user (dùng cho test 1 POST /auth/login, độc lập)
    const loginNv = await prisma.nhanVien.create({
      data: {
        username: 'rbac_login_test',
        password_hash: hash,
        ma_nv: 'RBAC-LOGIN-01',
        ten: 'RBAC Login Test',
        role: 'staff',
        van_phong_id: vpId,
        active: true,
      },
    });
    createdNvIds.push(loginNv.id);

    // Reset lockout + password + token_version admin về mặc định
    // (phòng auth.test.js change-password/logout làm tăng token_version)
    const adminHash = await bcrypt.hash('Tmq@1234', 10);
    await prisma.nhanVien.updateMany({
      where: { username: 'admin' },
      data: {
        password_hash: adminHash,
        failed_login_count: 0,
        locked_until: null,
        token_version: 0,  // reset để login mới sẽ issue token với tv=0
      },
    });

    // Lấy tokens
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'Tmq@1234' },
    });
    admin = JSON.parse(loginRes.body).data?.token || null;
    staff = await getToken(app, 'rbac_staff_test', 'Test@1234');
    acct  = await getToken(app, 'rbac_acct_test',  'Test@1234');

    expect(admin).not.toBeNull();
    expect(staff).not.toBeNull();
    expect(acct).not.toBeNull();
  });

  afterAll(async () => {
    await prisma.nhanVien.deleteMany({
      where: { id: { in: createdNvIds } },
    });
    await app.close();
  });

  // ═══════════════════════════════════════════════════════
  // 1. POST /auth/login — PUBLIC
  // ═══════════════════════════════════════════════════════

  describe('1. POST /auth/login (public)', () => {
    const url = '/api/auth/login';
    // Dùng rbac_login_test để không invalidate admin/staff/acct tokens
    const creds = { username: 'rbac_login_test', password: 'Test@1234' };
    it('Any user → Allow (public endpoint)', async () => allow(await call('POST', url, NO_TOKEN, creds)));
    it('NoAuth → Allow (no token required)',  async () => allow(await call('POST', url, NO_TOKEN, creds)));
  });

  // ═══════════════════════════════════════════════════════
  // 2. GET /auth/me — any authenticated role
  // ═══════════════════════════════════════════════════════

  describe('2. GET /auth/me (any role)', () => {
    const url = '/api/auth/me';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Staff  → Allow', async () => allow(await call('GET', url, staff)));
    it('Acct   → Allow', async () => allow(await call('GET', url, acct)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 3. GET /van-phong — any role
  // ═══════════════════════════════════════════════════════

  describe('3. GET /van-phong (authenticate only)', () => {
    const url = '/api/van-phong';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Staff  → Allow', async () => allow(await call('GET', url, staff)));
    it('Acct   → Allow', async () => allow(await call('GET', url, acct)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 4. POST /van-phong — admin only
  // ═══════════════════════════════════════════════════════

  describe('4. POST /van-phong (admin only)', () => {
    const url = '/api/van-phong';
    const body = { ma_vp: 'RB-TMP', ten: 'RBAC VP Test' };
    it('Admin  → Allow (200/409)', async () => {
      const res = await call('POST', url, admin, body);
      expect([200, 201, 409]).toContain(res.statusCode);
    });
    it('Staff  → Deny',  async () => deny(await call('POST', url, staff, body)));
    it('Acct   → Deny',  async () => deny(await call('POST', url, acct, body)));
    it('NoAuth → 401',   async () => noAuth(await call('POST', url, NO_TOKEN, body)));
  });

  // ═══════════════════════════════════════════════════════
  // 5. GET /nhan-vien — admin only
  // ═══════════════════════════════════════════════════════

  describe('5. GET /nhan-vien (admin only)', () => {
    const url = '/api/nhan-vien';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Staff  → Deny',  async () => deny(await call('GET', url, staff)));
    it('Acct   → Deny',  async () => deny(await call('GET', url, acct)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 6. GET /khach-hang — admin + staff
  // ═══════════════════════════════════════════════════════

  // GET /khach-hang: authenticate only (tất cả role OK)
  // POST/PUT: admin + staff; PATCH /active: admin only
  describe('6. GET /khach-hang (authenticate only)', () => {
    const url = '/api/khach-hang';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Staff  → Allow', async () => allow(await call('GET', url, staff)));
    it('Acct   → Allow', async () => allow(await call('GET', url, acct)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 7. PATCH /khach-hang/:id/active — admin only
  // ═══════════════════════════════════════════════════════

  describe('7. PATCH /khach-hang/active (admin only)', () => {
    const url = '/api/khach-hang/99999/active';
    const body = { active: false };
    it('Admin  → Allow/404', async () => {
      const res = await call('PATCH', url, admin, body);
      expect([200, 404]).toContain(res.statusCode);
    });
    it('Staff  → Deny',  async () => deny(await call('PATCH', url, staff, body)));
    it('Acct   → Deny',  async () => deny(await call('PATCH', url, acct, body)));
    it('NoAuth → 401',   async () => noAuth(await call('PATCH', url, NO_TOKEN, body)));
  });

  // ═══════════════════════════════════════════════════════
  // 8. GET /bien-nhan — admin + staff
  // ═══════════════════════════════════════════════════════

  // GET /bien-nhan: authenticate only (tất cả role OK)
  // POST/PUT/PATCH/DELETE: admin + staff
  describe('8. GET /bien-nhan (authenticate only)', () => {
    const url = '/api/bien-nhan';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Staff  → Allow', async () => allow(await call('GET', url, staff)));
    it('Acct   → Allow', async () => allow(await call('GET', url, acct)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 9. POST /bien-nhan — accountant bị chặn
  // ═══════════════════════════════════════════════════════

  describe('9. POST /bien-nhan (accountant denied)', () => {
    const url = '/api/bien-nhan';
    const body = { van_phong_gui_id: 1, van_phong_nhan_id: 2, don_vi_gui: 'X', gia_cuoc: 0 };
    it('Acct   → Deny',  async () => deny(await call('POST', url, acct, body)));
    it('NoAuth → 401',   async () => noAuth(await call('POST', url, NO_TOKEN, body)));
  });

  // ═══════════════════════════════════════════════════════
  // 10. PATCH /bien-nhan/trang-thai — accountant bị chặn
  // ═══════════════════════════════════════════════════════

  describe('10. PATCH /bien-nhan/trang-thai (accountant denied)', () => {
    const url = '/api/bien-nhan/99999/trang-thai';
    const body = { trang_thai: 'dang_vc' };
    it('Admin  → Allow/404', async () => {
      const res = await call('PATCH', url, admin, body);
      expect([200, 404]).toContain(res.statusCode);
    });
    it('Acct   → Deny',  async () => deny(await call('PATCH', url, acct, body)));
    it('NoAuth → 401',   async () => noAuth(await call('PATCH', url, NO_TOKEN, body)));
  });

  // ═══════════════════════════════════════════════════════
  // 11. PATCH /bien-nhan/batch — accountant bị chặn
  // ═══════════════════════════════════════════════════════

  describe('11. PATCH /bien-nhan/batch-trang-thai (accountant denied)', () => {
    const url = '/api/bien-nhan/batch-trang-thai';
    it('Admin  → Allow/400', async () => {
      const res = await call('PATCH', url, admin, { ids: [], trang_thai: 'dang_vc' });
      expect([200, 400]).toContain(res.statusCode);
    });
    it('Acct   → Deny',  async () => deny(await call('PATCH', url, acct, { ids: [1], trang_thai: 'dang_vc' })));
    it('NoAuth → 401',   async () => noAuth(await call('PATCH', url, NO_TOKEN, { ids: [1], trang_thai: 'dang_vc' })));
  });

  // ═══════════════════════════════════════════════════════
  // 12. GET /scan/:ma_so — PUBLIC (no auth required)
  // ═══════════════════════════════════════════════════════

  describe('12. GET /scan/:ma_so (public)', () => {
    const url = '/api/scan/KHONG-TON-TAI-9999';
    it('NoAuth → Public (200/404)', async () => pub(await call('GET', url, NO_TOKEN)));
    it('Staff  → Public (200/404)', async () => pub(await call('GET', url, staff)));
    it('Admin  → Public (200/404)', async () => pub(await call('GET', url, admin)));
  });

  // ═══════════════════════════════════════════════════════
  // 13. GET /bang-ke — admin only
  // ═══════════════════════════════════════════════════════

  describe('13. GET /bang-ke (admin only)', () => {
    const url = '/api/bang-ke';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Staff  → Deny',  async () => deny(await call('GET', url, staff)));
    it('Acct   → Deny',  async () => deny(await call('GET', url, acct)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 14. GET /doanh-nghiep-hddt — admin only
  // ═══════════════════════════════════════════════════════

  describe('14. GET /doanh-nghiep-hddt (admin only)', () => {
    const url = '/api/doanh-nghiep-hddt';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Staff  → Deny',  async () => deny(await call('GET', url, staff)));
    it('Acct   → Deny',  async () => deny(await call('GET', url, acct)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 15. GET /cong-no — admin + accountant
  // ═══════════════════════════════════════════════════════

  describe('15. GET /cong-no (admin + accountant)', () => {
    const url = '/api/cong-no';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Acct   → Allow', async () => allow(await call('GET', url, acct)));
    it('Staff  → Deny',  async () => deny(await call('GET', url, staff)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 16. POST /cong-no/xac-nhan — admin + accountant
  // ═══════════════════════════════════════════════════════

  describe('16. POST /cong-no/xac-nhan (admin + accountant)', () => {
    const url = '/api/cong-no/99999/xac-nhan-thanh-toan';
    it('Staff  → Deny',      async () => deny(await call('POST', url, staff, {})));
    it('NoAuth → 401',       async () => noAuth(await call('POST', url, NO_TOKEN, {})));
    it('Admin  → Allow/404', async () => {
      const res = await call('POST', url, admin, {});
      expect([200, 404]).toContain(res.statusCode);
    });
    it('Acct   → Allow/404', async () => {
      const res = await call('POST', url, acct, {});
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ═══════════════════════════════════════════════════════
  // 17. GET /doanh-thu — admin + accountant
  // ═══════════════════════════════════════════════════════

  describe('17. GET /doanh-thu (admin + accountant)', () => {
    const url = '/api/doanh-thu';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Acct   → Allow', async () => allow(await call('GET', url, acct)));
    it('Staff  → Deny',  async () => deny(await call('GET', url, staff)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 18. GET /thu-ho — admin + accountant (RBAC-TH-01/02)
  // ═══════════════════════════════════════════════════════

  describe('18. GET /thu-ho (admin + accountant)', () => {
    const url = '/api/thu-ho';
    it('Admin  → Allow', async () => allow(await call('GET', url, admin)));
    it('Acct   → Allow', async () => allow(await call('GET', url, acct)));
    it('Staff  → Deny',  async () => deny(await call('GET', url, staff)));
    it('NoAuth → 401',   async () => noAuth(await call('GET', url, NO_TOKEN)));
  });

  // ═══════════════════════════════════════════════════════
  // 19. POST /thu-ho/:id/xac-nhan-thu — staff được phép
  // ═══════════════════════════════════════════════════════

  describe('19. POST /thu-ho/:id/xac-nhan-thu (admin + acct + staff)', () => {
    const url = '/api/thu-ho/99999/xac-nhan-thu';
    it('Admin  → Allow/404/400', async () => {
      const res = await call('POST', url, admin, {});
      expect([200, 400, 404]).toContain(res.statusCode);
    });
    it('Acct   → Allow/404/400', async () => {
      const res = await call('POST', url, acct, {});
      expect([200, 400, 404]).toContain(res.statusCode);
    });
    it('Staff  → Allow/404/400 (RBAC-TH-01: staff được xác nhận thu)', async () => {
      const res = await call('POST', url, staff, {});
      expect([200, 400, 404]).toContain(res.statusCode); // NOT 403
    });
    it('NoAuth → 401',   async () => noAuth(await call('POST', url, NO_TOKEN, {})));
  });

  // ═══════════════════════════════════════════════════════
  // 20. POST /thu-ho/:id/xac-nhan-chuyen — staff bị chặn
  // ═══════════════════════════════════════════════════════

  describe('20. POST /thu-ho/:id/xac-nhan-chuyen (admin + acct only)', () => {
    const url = '/api/thu-ho/99999/xac-nhan-chuyen';
    it('Admin  → Allow/404/400', async () => {
      const res = await call('POST', url, admin, {});
      expect([200, 400, 404]).toContain(res.statusCode);
    });
    it('Acct   → Allow/404/400', async () => {
      const res = await call('POST', url, acct, {});
      expect([200, 400, 404]).toContain(res.statusCode);
    });
    it('Staff  → Deny (RBAC-TH-02: staff không được chuyển/trả COD)', async () => deny(await call('POST', url, staff, {})));
    it('NoAuth → 401',   async () => noAuth(await call('POST', url, NO_TOKEN, {})));
  });
});

