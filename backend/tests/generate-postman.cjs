// Generate Postman collections — 1 file per module
// Run: node tests/generate-postman.cjs

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'collections');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function makeRequest(name, method, url, opts = {}) {
  const req = {
    name,
    request: {
      method,
      header: [],
      url: { raw: `{{base_url}}${url}`, host: ['{{base_url}}'], path: url.split('/').filter(Boolean) },
    },
    response: [],
  };
  if (opts.auth) {
    req.request.header.push({ key: 'Authorization', value: `Bearer {{${opts.auth}_token}}`, type: 'text' });
  }
  if (opts.body) {
    req.request.header.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
    req.request.body = { mode: 'raw', raw: JSON.stringify(opts.body, null, 2) };
  }
  if (opts.query) {
    req.request.url.query = Object.entries(opts.query).map(([k, v]) => ({ key: k, value: String(v) }));
    req.request.url.raw += '?' + Object.entries(opts.query).map(([k, v]) => `${k}=${v}`).join('&');
  }
  if (opts.event) req.event = opts.event;
  return req;
}

function testScript(code) {
  return [{ listen: 'test', script: { type: 'text/javascript', exec: code.split('\n') } }];
}

const allFolders = [];

function writeCollection(filename, name, description, items) {
  const col = {
    info: { name, description, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    item: items,
  };
  const fp = path.join(outDir, filename);
  fs.writeFileSync(fp, JSON.stringify(col, null, 2), 'utf-8');
  console.log(`  ${filename} (${items.length} requests)`);

  const rawFolderName = name.replace(/^\d+\.\s*/, '');
  allFolders.push({
    name: rawFolderName,
    description,
    item: items
  });
}

console.log('Generating collections...\n');

// ─── 01. Health Check ───
writeCollection('01-health-check.postman_collection.json', '01. Health Check', 'Health check endpoint', [
  makeRequest('Health Check', 'GET', '/api/health', {
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("success is true", () => pm.expect(pm.response.json().success).to.be.true);
pm.test("status ok", () => pm.expect(pm.response.json().data.status).to.eql("ok"));`),
  }),
]);

// ─── 02. Auth ───
writeCollection('02-auth.postman_collection.json', '02. Auth', 'Authentication & authorization', [
  makeRequest('Login Admin', 'POST', '/api/auth/login', {
    body: { username: 'admin', password: 'Tmq@1234' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has token", () => { const t = pm.response.json().data.token; pm.expect(t).to.be.a("string"); pm.environment.set("admin_token", t); });
pm.test("Role is admin", () => pm.expect(pm.response.json().data.user.role).to.eql("admin"));`),
  }),
  makeRequest('Login Staff', 'POST', '/api/auth/login', {
    body: { username: 'staff_ct', password: 'Tmq@1234' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Save token", () => pm.environment.set("staff_token", pm.response.json().data.token));`),
  }),
  makeRequest('Login Accountant', 'POST', '/api/auth/login', {
    body: { username: 'ketoan', password: 'Tmq@1234' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Save token", () => pm.environment.set("accountant_token", pm.response.json().data.token));`),
  }),
  makeRequest('[FAIL] Login Wrong Password', 'POST', '/api/auth/login', {
    body: { username: 'admin', password: 'wrongpassword' },
    event: testScript(`pm.test("Status 401", () => pm.response.to.have.status(401));
pm.test("Error code", () => pm.expect(pm.response.json().error.code).to.eql("UNAUTHORIZED"));`),
  }),
  makeRequest('Get Profile', 'GET', '/api/auth/me', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has role", () => pm.expect(pm.response.json().data.role).to.eql("admin"));`),
  }),
  makeRequest('[FAIL] Change Password - Wrong Current', 'POST', '/api/auth/change-password', {
    auth: 'admin',
    body: { current_password: 'wrongcurrent', new_password: 'NewPass123' },
    event: testScript(`pm.test("Should fail", () => pm.response.to.have.status(400));`),
  }),
  makeRequest('[FAIL] Request with Invalid Token', 'GET', '/api/auth/me', {
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: [
      'pm.test("Status 401", () => pm.response.to.have.status(401));',
    ] } }],
  }),
]);

// ─── 03. Van Phong ───
writeCollection('03-van-phong.postman_collection.json', '03. Van Phong', 'Quan ly van phong / chi nhanh', [
  makeRequest('List VP', 'GET', '/api/van-phong', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has data array", () => pm.expect(pm.response.json().data).to.be.an("array"));
pm.test("At least 3 VPs", () => pm.expect(pm.response.json().data.length).to.be.at.least(3));`),
  }),
  makeRequest('List VP Active Only', 'GET', '/api/van-phong', {
    auth: 'admin', query: { active: 'true' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("All active", () => pm.response.json().data.forEach(vp => pm.expect(vp.active).to.be.true));`),
  }),
  makeRequest('Create VP (Admin)', 'POST', '/api/van-phong', {
    auth: 'admin',
    body: { ma_vp: 'TEST', ten: 'VP Test Postman', dia_chi: '123 Test St', dien_thoai: '0999999999' },
    event: testScript(`pm.test("Status 201", () => pm.response.to.have.status(201));
pm.test("Save ID", () => pm.environment.set("van_phong_id", pm.response.json().data.id));`),
  }),
  makeRequest('Update VP', 'PUT', '/api/van-phong/{{van_phong_id}}', {
    auth: 'admin',
    body: { ten: 'VP Test Updated', dia_chi: '456 Updated St' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Toggle VP Active', 'PATCH', '/api/van-phong/{{van_phong_id}}/active', {
    auth: 'admin',
    body: { active: false },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('[FAIL] Create VP (Staff -> 403)', 'POST', '/api/van-phong', {
    auth: 'staff',
    body: { ma_vp: 'FAIL', ten: 'Should Fail', dia_chi: 'N/A' },
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
  makeRequest('[FAIL] Update VP (Staff -> 403)', 'PUT', '/api/van-phong/{{van_phong_id}}', {
    auth: 'staff',
    body: { ten: 'Should Fail' },
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
]);

// ─── 04. Nhan Vien ───
writeCollection('04-nhan-vien.postman_collection.json', '04. Nhan Vien', 'Quan ly nhan vien & phan quyen', [
  makeRequest('List NV (Admin)', 'GET', '/api/nhan-vien', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('[FAIL] List NV (Staff -> 403)', 'GET', '/api/nhan-vien', {
    auth: 'staff',
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
  makeRequest('Create NV', 'POST', '/api/nhan-vien', {
    auth: 'admin',
    body: { ma_nv: 'NV-TEST-001', ten: 'Test User Postman', username: 'test_postman', password: 'Test@1234', role: 'staff', van_phong_id: 1 },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Save ID", () => pm.environment.set("nhan_vien_id", pm.response.json().data.id));`),
  }),
  makeRequest('[FAIL] Create NV Duplicate Username', 'POST', '/api/nhan-vien', {
    auth: 'admin',
    body: { ma_nv: 'NV-TEST-002', ten: 'Dup User', username: 'test_postman', password: 'Test@1234', role: 'staff', van_phong_id: 1 },
    event: testScript(`pm.test("Should fail (unique)", () => pm.expect(pm.response.code).to.be.oneOf([400, 409, 500]));`),
  }),
  makeRequest('Update NV', 'PUT', '/api/nhan-vien/{{nhan_vien_id}}', {
    auth: 'admin',
    body: { ten: 'Test User Updated' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Toggle NV Active', 'PATCH', '/api/nhan-vien/{{nhan_vien_id}}/active', {
    auth: 'admin',
    body: { active: false },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Reset Password', 'POST', '/api/nhan-vien/{{nhan_vien_id}}/reset-password', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has tempPassword", () => pm.expect(pm.response.json().data.tempPassword).to.be.a("string"));`),
  }),
]);

// ─── 05. Khach Hang ───
writeCollection('05-khach-hang.postman_collection.json', '05. Khach Hang', 'Quan ly khach hang', [
  makeRequest('List KH', 'GET', '/api/khach-hang', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has pagination", () => pm.expect(pm.response.json().pagination).to.be.an("object"));`),
  }),
  makeRequest('Search KH', 'GET', '/api/khach-hang', {
    auth: 'admin', query: { search: 'Tam' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Autocomplete KH', 'GET', '/api/khach-hang/autocomplete', {
    auth: 'admin', query: { q: 'Cty' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Data is array", () => pm.expect(pm.response.json().data).to.be.an("array"));`),
  }),
  makeRequest('Create KH', 'POST', '/api/khach-hang', {
    auth: 'admin',
    body: { ten_don_vi: 'KH Test Postman', nguoi_lien_he: 'Postman User', dien_thoai: '0888888888', dia_chi: '789 Test Ave' },
    event: testScript(`pm.test("Status 201", () => pm.response.to.have.status(201));
pm.test("Save ID", () => pm.environment.set("khach_hang_id", pm.response.json().data.id));`),
  }),
  makeRequest('Get KH Detail', 'GET', '/api/khach-hang/{{khach_hang_id}}', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Update KH', 'PUT', '/api/khach-hang/{{khach_hang_id}}', {
    auth: 'admin',
    body: { ten_don_vi: 'KH Test Updated', email: 'test@postman.com' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('[FAIL] Toggle KH Active (Staff -> 403)', 'PATCH', '/api/khach-hang/{{khach_hang_id}}/active', {
    auth: 'staff',
    body: { active: false },
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
]);

// ─── 06. Bien Nhan ───
writeCollection('06-bien-nhan.postman_collection.json', '06. Bien Nhan', 'Quan ly bien nhan - module loi', [
  makeRequest('List BN', 'GET', '/api/bien-nhan', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has pagination", () => pm.expect(pm.response.json().pagination).to.be.an("object"));`),
  }),
  makeRequest('Filter BN by Status', 'GET', '/api/bien-nhan', {
    auth: 'admin', query: { trang_thai: 'cho_vc' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("All cho_vc", () => pm.response.json().data.forEach(bn => pm.expect(bn.trang_thai).to.eql("cho_vc")));`),
  }),
  makeRequest('Search BN', 'GET', '/api/bien-nhan', {
    auth: 'admin', query: { search: 'SG' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Preview Ma BN', 'GET', '/api/bien-nhan/next-ma-so', {
    auth: 'admin', query: { vp_gui_id: '1', vp_nhan_id: '2' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Create BN (Da Thu)', 'POST', '/api/bien-nhan', {
    auth: 'admin',
    body: { van_phong_gui_id: 1, van_phong_nhan_id: 2, ten_hang_hoa: 'Hang test Postman', don_vi_gui: 'Cty Test Gui', nguoi_gui: 'Nguoi Gui', dien_thoai_gui: '0111111111', don_vi_nhan: 'Cty Test Nhan', nguoi_nhan: 'Nguoi Nhan', dien_thoai_nhan: '0222222222', gia_cuoc: 150000, trang_thai_thu: 'da_thu', can_xuat_hddt: true },
    event: testScript(`pm.test("Status 201", () => pm.response.to.have.status(201));
const bn = pm.response.json().data;
pm.environment.set("bien_nhan_id", bn.id);
pm.environment.set("bien_nhan_ma_so", bn.ma_so);`),
  }),
  makeRequest('Create BN (Cong No)', 'POST', '/api/bien-nhan', {
    auth: 'admin',
    body: { van_phong_gui_id: 1, van_phong_nhan_id: 3, ten_hang_hoa: 'Hang cong no test', don_vi_gui: 'Cty Cong No', nguoi_gui: 'Nguoi CN', gia_cuoc: 500000, trang_thai_thu: 'cong_no' },
    event: testScript(`pm.test("Status 201", () => pm.response.to.have.status(201));
pm.environment.set("bien_nhan_cong_no_id", pm.response.json().data.id);`),
  }),
  makeRequest('[FAIL] Create BN Missing Field', 'POST', '/api/bien-nhan', {
    auth: 'admin',
    body: { van_phong_gui_id: 1, van_phong_nhan_id: 2 },
    event: testScript(`pm.test("Status 400", () => pm.response.to.have.status(400));`),
  }),
  makeRequest('[FAIL] Create BN (Accountant -> 403)', 'POST', '/api/bien-nhan', {
    auth: 'accountant',
    body: { van_phong_gui_id: 1, van_phong_nhan_id: 2, ten_hang_hoa: 'Should fail' },
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
  makeRequest('Get BN Detail', 'GET', '/api/bien-nhan/{{bien_nhan_id}}', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has relations", () => { const d = pm.response.json().data; pm.expect(d.van_phong_gui).to.be.an("object"); });`),
  }),
  makeRequest('Update BN', 'PUT', '/api/bien-nhan/{{bien_nhan_id}}', {
    auth: 'admin',
    body: { ten_hang_hoa: 'Hang test updated', gia_cuoc: 200000 },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Update Status cho_vc -> dang_vc', 'PATCH', '/api/bien-nhan/{{bien_nhan_id}}/trang-thai', {
    auth: 'admin',
    body: { trang_thai: 'dang_vc', ghi_chu: 'Test chuyen trang thai' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('[FAIL] Skip Status dang_vc -> da_bao_khach', 'PATCH', '/api/bien-nhan/{{bien_nhan_id}}/trang-thai', {
    auth: 'admin',
    body: { trang_thai: 'da_bao_khach' },
    event: testScript(`pm.test("Status 400 (skip not allowed)", () => pm.response.to.have.status(400));`),
  }),
  makeRequest('PDF Preview', 'GET', '/api/bien-nhan/{{bien_nhan_id}}/pdf-preview', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has base64", () => pm.expect(pm.response.json().data.base64).to.be.a("string"));`),
  }),
  makeRequest('PDF Download (binary)', 'GET', '/api/bien-nhan/{{bien_nhan_id}}/pdf', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Content-Type is PDF", () => pm.expect(pm.response.headers.get("content-type")).to.include("application/pdf"));`),
  }),
  makeRequest('[FAIL] Create BN Same VP gui = VP nhan', 'POST', '/api/bien-nhan', {
    auth: 'admin',
    body: { van_phong_gui_id: 1, van_phong_nhan_id: 1, ten_hang_hoa: 'Same VP test', gia_cuoc: 100000 },
    event: testScript(`pm.test("Status 400", () => pm.response.to.have.status(400));`),
  }),
  makeRequest('[FAIL] Accountant cap nhat trang thai -> 403', 'PATCH', '/api/bien-nhan/{{bien_nhan_id}}/trang-thai', {
    auth: 'accountant',
    body: { trang_thai: 'da_den_kho' },
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
  makeRequest('Batch cap nhat trang thai', 'PATCH', '/api/bien-nhan/batch-trang-thai', {
    auth: 'admin',
    body: { ids: [1, 2, 3, 4, 5, 6], trang_thai: 'dang_vc', ghi_chu: 'Batch test Postman' },
    event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: [
      '// Lay cac BN dang cho_vc tu seed data',
      'const url = pm.environment.get("base_url") + "/api/bien-nhan?trang_thai=cho_vc&limit=5";',
      'pm.sendRequest({ url, method: "GET", header: { "Authorization": "Bearer " + pm.environment.get("admin_token") } }, (err, res) => {',
      '  if (!err && res.code === 200) {',
      '    const ids = res.json().data.map(bn => bn.id);',
      '    if (ids.length > 0) {',
      '      const body = JSON.parse(pm.request.body.raw);',
      '      body.ids = ids;',
      '      pm.request.body.raw = JSON.stringify(body);',
      '    }',
      '  }',
      '});',
    ] } }, { listen: 'test', script: { type: 'text/javascript', exec: [
      'pm.test("Status 200", () => pm.response.to.have.status(200));',
      'pm.test("Has success message", () => pm.expect(pm.response.json().success).to.be.true);',
    ] } }],
  }),
  makeRequest('[FAIL] Batch trang thai - ids rong', 'PATCH', '/api/bien-nhan/batch-trang-thai', {
    auth: 'admin',
    body: { ids: [], trang_thai: 'dang_vc' },
    event: testScript(`pm.test("Status 400", () => pm.response.to.have.status(400));`),
  }),
]);

// ─── 07. Phieu Thu ───
writeCollection('07-phieu-thu.postman_collection.json', '07. Phieu Thu', 'Quan ly phieu thu', [
  makeRequest('List PT (Admin)', 'GET', '/api/phieu-thu', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('[FAIL] List PT (Staff -> 403)', 'GET', '/api/phieu-thu', {
    auth: 'staff',
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
  makeRequest('Create PT', 'POST', '/api/phieu-thu', {
    auth: 'admin',
    body: { doi_tuong: 'KH Test Postman', ly_do: 'Thu cuoc test', so_tien: 300000, hinh_thuc: 'tien_mat' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.environment.set("phieu_thu_id", pm.response.json().data.id);`),
  }),
  makeRequest('Get PT Detail', 'GET', '/api/phieu-thu/{{phieu_thu_id}}', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Update PT', 'PUT', '/api/phieu-thu/{{phieu_thu_id}}', {
    auth: 'admin',
    body: { doi_tuong: 'KH Updated', so_tien: 350000 },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('PT PDF Preview', 'GET', '/api/phieu-thu/{{phieu_thu_id}}/pdf-preview', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has base64", () => pm.expect(pm.response.json().data.base64).to.be.a("string"));`),
  }),
  makeRequest('Cancel PT (Admin)', 'PATCH', '/api/phieu-thu/{{phieu_thu_id}}/huy', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
]);

// ─── 08. Phieu Chi ───
writeCollection('08-phieu-chi.postman_collection.json', '08. Phieu Chi', 'Quan ly phieu chi', [
  makeRequest('List PC', 'GET', '/api/phieu-chi', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Create PC', 'POST', '/api/phieu-chi', {
    auth: 'admin',
    body: { nguoi_nhan: 'Anh Minh', ly_do: 'Chi phi test Postman', so_tien: 100000 },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.environment.set("phieu_chi_id", pm.response.json().data.id);`),
  }),
  makeRequest('Update PC', 'PUT', '/api/phieu-chi/{{phieu_chi_id}}', {
    auth: 'admin',
    body: { nguoi_nhan: 'Anh Minh Updated', so_tien: 120000 },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Cancel PC (Admin)', 'PATCH', '/api/phieu-chi/{{phieu_chi_id}}/huy', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('PC PDF Preview', 'GET', '/api/phieu-chi/{{phieu_chi_id}}/pdf-preview', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has base64", () => pm.expect(pm.response.json().data.base64).to.be.a("string"));`),
  }),
]);

// ─── 09. Cong No ───
writeCollection('09-cong-no.postman_collection.json', '09. Cong No', 'Quan ly cong no', [
  makeRequest('List CN', 'GET', '/api/cong-no', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has summary", () => pm.expect(pm.response.json().summary).to.be.an("object"));
const data = pm.response.json().data;
if (data && data.length > 0) { const cn = data.find(c => c.trang_thai === "chua_thu"); if (cn) pm.environment.set("cong_no_id", cn.id); }`),
  }),
  makeRequest('Filter CN Chua Thu', 'GET', '/api/cong-no', {
    auth: 'admin', query: { trang_thai: 'chua_thu' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Xac Nhan Thanh Toan', 'POST', '/api/cong-no/{{cong_no_id}}/xac-nhan-thanh-toan', {
    auth: 'admin',
    body: { hinh_thuc: 'tien_mat', ghi_chu: 'Test thanh toan Postman' },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("PT created", () => pm.expect(pm.response.json().data.phieu_thu).to.be.an("object"));`),
  }),
  makeRequest('[FAIL] Xac Nhan Lai (Da Thu)', 'POST', '/api/cong-no/{{cong_no_id}}/xac-nhan-thanh-toan', {
    auth: 'admin',
    body: { hinh_thuc: 'tien_mat' },
    event: testScript(`pm.test("Status 400", () => pm.response.to.have.status(400));`),
  }),
  makeRequest('[FAIL] Staff xac nhan cong no -> 403', 'POST', '/api/cong-no/{{cong_no_id}}/xac-nhan-thanh-toan', {
    auth: 'staff',
    body: { hinh_thuc: 'tien_mat' },
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
]);

// ─── 10. Bang Ke ───
writeCollection('10-bang-ke.postman_collection.json', '10. Bang Ke HDDT', 'Quan ly bang ke hoa don dien tu', [
  makeRequest('BN Cho Bang Ke', 'GET', '/api/bang-ke/bien-nhan-cho', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
const data = pm.response.json().data;
if (data && data.length >= 2) { pm.environment.set("hddt_bien_nhan_ids", JSON.stringify([data[0].id, data[1].id])); }`),
  }),
  makeRequest('Xuat Bang Ke', 'POST', '/api/bang-ke', {
    auth: 'admin',
    body: { bien_nhan_ids: [1, 2] },
    event: [
      { listen: 'prerequest', script: { type: 'text/javascript', exec: [
        'const ids = pm.environment.get("hddt_bien_nhan_ids");',
        'if (ids) { const body = JSON.parse(pm.request.body.raw); body.bien_nhan_ids = JSON.parse(ids); pm.request.body.raw = JSON.stringify(body); }',
      ] } },
      { listen: 'test', script: { type: 'text/javascript', exec: [
        'pm.test("Status 200", () => pm.response.to.have.status(200));',
        'pm.test("Has file", () => pm.expect(pm.response.json().data.file.base64).to.be.a("string"));',
        'pm.environment.set("bang_ke_id", pm.response.json().data.bang_ke.id);',
      ] } },
    ],
  }),
  makeRequest('List Bang Ke', 'GET', '/api/bang-ke', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('Download Bang Ke', 'GET', '/api/bang-ke/{{bang_ke_id}}/download', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has file", () => pm.expect(pm.response.json().data.file.base64).to.be.a("string"));`),
  }),
]);

// ─── 11. Dashboard ───
writeCollection('11-dashboard.postman_collection.json', '11. Dashboard', 'Dashboard thong ke', [
  makeRequest('Stats', 'GET', '/api/dashboard/stats', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has stats fields", () => { const d = pm.response.json().data; pm.expect(d).to.have.property("tong_bn"); pm.expect(d).to.have.property("doanh_thu_thang"); });`),
  }),
  makeRequest('Doanh Thu 7 Ngay', 'GET', '/api/dashboard/doanh-thu-7-ngay', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("7 entries", () => pm.expect(pm.response.json().data).to.have.lengthOf(7));`),
  }),
  makeRequest('Ty Le Tuyen', 'GET', '/api/dashboard/ty-le-tuyen', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Data is array", () => pm.expect(pm.response.json().data).to.be.an("array"));`),
  }),
  makeRequest('Thu Chi Theo Thang', 'GET', '/api/dashboard/thu-chi-theo-thang', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("6 months", () => pm.expect(pm.response.json().data).to.have.lengthOf(6));`),
  }),
]);

// ─── 12. Bao Cao ───
const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
writeCollection('12-bao-cao.postman_collection.json', '12. Bao Cao', 'Bao cao tong hop', [
  makeRequest('BC Doanh Thu', 'GET', '/api/bao-cao/doanh-thu', {
    auth: 'admin', query: { from: weekAgo, to: today },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('BC So Quy', 'GET', '/api/bao-cao/so-quy', {
    auth: 'admin', query: { from: weekAgo, to: today },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('BC BN Theo Tuyen', 'GET', '/api/bao-cao/bien-nhan', {
    auth: 'admin', query: { from: weekAgo, to: today },
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('BC Cong No', 'GET', '/api/bao-cao/cong-no', {
    auth: 'admin',
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));`),
  }),
  makeRequest('[FAIL] Staff xem bao cao -> 403', 'GET', '/api/bao-cao/doanh-thu', {
    auth: 'staff', query: { from: weekAgo, to: today },
    event: testScript(`pm.test("Status 403", () => pm.response.to.have.status(403));`),
  }),
]);

// ─── 13. Scan QR ───
writeCollection('13-scan-qr.postman_collection.json', '13. Scan QR (Public)', 'Tra cuu cong khai qua QR', [
  makeRequest('Scan BN Valid', 'GET', '/api/scan/{{bien_nhan_ma_so}}', {
    event: testScript(`pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("No gia_cuoc exposed", () => pm.expect(pm.response.json().data).to.not.have.property("gia_cuoc"));
pm.test("Has lich_su", () => pm.expect(pm.response.json().data.lich_su).to.be.an("array"));`),
  }),
  makeRequest('[FAIL] Scan Invalid Code', 'GET', '/api/scan/INVALID-CODE-XYZ', {
    event: testScript(`pm.test("Status 404", () => pm.response.to.have.status(404));`),
  }),
]);

// Export unified collection
const unifiedFp = path.join(outDir, 'TMQ_Express.postman_collection.json');
const unifiedCol = {
  info: {
    name: 'TMQ_Express',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: allFolders
};
fs.writeFileSync(unifiedFp, JSON.stringify(unifiedCol, null, 2), 'utf-8');
console.log(`  TMQ_Express.postman_collection.json (Unified collection)`);

console.log(`\nDone! ${fs.readdirSync(outDir).length} collection files in tests/collections/`);
