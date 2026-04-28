# Tài liệu Kiểm thử Hệ thống TMQ Express ERP

> **Phiên bản:** 2.0 — Chi tiết đủ để giao thực thi  
> **Ngày lập:** 22/04/2026  
> **Phạm vi:** Toàn bộ hệ thống TMQ Express ERP (Backend API + Frontend SPA)  
> **Phương pháp:** Theo mô hình Kim tự tháp Kiểm thử (Unit → Integration → System → E2E/UAT)

---

## Mục lục
0. [Thiết lập Môi trường](#0-thiết-lập-môi-trường)
1. [Tổng quan Hệ thống](#1-tổng-quan-hệ-thống)
2. [Cấp 1: Unit Test — Nghiệp vụ đơn lẻ](#2-cấp-1-unit-test)
3. [Cấp 2: Integration Test — Liên module API](#3-cấp-2-integration-test)
4. [Cấp 3: System Test — Luồng nghiệp vụ End-to-End](#4-cấp-3-system-test)
5. [Cấp 4: Non-functional & Bảo mật](#5-cấp-4-non-functional--bảo-mật)
6. [Cấp 5: UAT — Kiểm thử chấp nhận](#6-cấp-5-uat)
- [Phụ lục A: Checklist Frontend UI](#phụ-lục-a-checklist-frontend-ui)
- [Phụ lục B: Data Test chuẩn bị](#phụ-lục-b-data-test-chuẩn-bị)
- [Phụ lục C: Cookbook — Request/Response mẫu](#phụ-lục-c-cookbook)

---

## 0. Thiết lập Môi trường

### 0.1. Yêu cầu

| Phần mềm | Version | Mục đích |
|-----------|---------|----------|
| Node.js | ≥ 20 | Runtime backend + frontend |
| PostgreSQL | ≥ 15 | Database |
| npm | ≥ 10 | Package manager |
| Git | ≥ 2.40 | Source control |
| Postman hoặc curl | Bất kỳ | Gọi API test |
| Chrome / Firefox | Bản mới nhất | Test giao diện |

### 0.2. Cài đặt & Khởi động

**Bước 1: Clone & cài dependencies**
```bash
git clone <repo-url> TMQ-Express
cd TMQ-Express

# Backend
cd backend
cp .env.example .env   # Sửa DATABASE_URL, JWT_SECRET
npm install

# Frontend
cd ../frontend
npm install
```

**Bước 2: Thiết lập Database**
```bash
cd backend
npx prisma migrate dev         # Tạo schema
npx prisma db seed             # Nạp dữ liệu mẫu
npx prisma studio              # (Tùy chọn) Xem DB qua UI
```

**Bước 3: Khởi động server**
```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

**Bước 4: Xác minh hệ thống hoạt động**
```bash
# Test backend
curl http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Tmq@1234"}'

# Kỳ vọng: {"success":true,"data":{"token":"eyJ...","user":{...}}}

# Test frontend
# Mở http://localhost:5173/login trên trình duyệt
```

### 0.3. Biến môi trường (.env)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/tmq_express
JWT_SECRET=your-secret-key-here
PORT=3000
```

### 0.4. Quy trình kiểm thử
```
1. Lấy token     →  POST /api/auth/login  → lưu $TOKEN
2. Gọi API       →  Gắn header: Authorization: Bearer $TOKEN
3. Verify kết quả →  So sánh status code + response body
4. Verify DB      →  Dùng Prisma Studio (http://localhost:5555) kiểm tra
5. Ghi kết quả    →  Đánh dấu ✅/❌ vào bảng test case
```

---

## 1. Tổng quan Hệ thống

### 1.1. Kiến trúc
- **Backend:** Node.js + Fastify + Prisma ORM + PostgreSQL
- **Frontend:** Vue 3 + PrimeVue + Vite
- **Roles:** `admin`, `staff`, `accountant`

### 1.2. Phạm vi module
| # | Module | Tables | API Prefix | Views |
|---|--------|--------|------------|-------|
| 1 | Xác thực | NhanVien, LoginLog | `/api/auth` | LoginView |
| 2 | Văn phòng | VanPhong | `/api/van-phong` | VanPhongView |
| 3 | Nhân viên | NhanVien | `/api/nhan-vien` | NhanVienView |
| 4 | Khách hàng | KhachHang | `/api/khach-hang` | KhachHangListView, FormView |
| 5 | Chành | Chanh | `/api/chanh` | ChanhView |
| 6 | Biên nhận | BienNhan, LichSuTrangThai | `/api/bien-nhan` | BienNhanListView |
| 7 | Scan QR | — | `/api/scan` | ScanView |
| 8 | Bảng kê HĐĐT | BangKe, BangKeChiTiet, DoanhNghiepHDDT | `/api/bang-ke`, `/api/doanh-nghiep-hddt` | BangKeView |
| 9 | Công nợ | CongNo, PhieuThu | `/api/cong-no` | CongNoView |
| 10 | Doanh thu | — (aggregate) | `/api/doanh-thu` | DoanhThuView |
| — | Audit | AuditLog | — (nội bộ) | — |

### 1.3. Quy ước test case
- **Prefix:** `UT` (Unit), `IT` (Integration), `ST` (System), `SEC` (Security), `UAT`
- **Mức độ:** ⚡ Happy path, ⚠️ Edge case, ❌ Negative test
- **Kết quả:** ✅ Pass / ❌ Fail / ⏳ Chưa test

---

## 2. Cấp 1: Unit Test

### 2.1. Module Xác thực (`auth.service.js`)

| ID | Loại | Mô tả Test Case | Input | Expected Output |
|----|------|-----------------|-------|-----------------|
| UT-AUTH-01 | ⚡ | Đăng nhập đúng username + password | `admin` / `Tmq@1234` | Token JWT + user info, `failed_login_count` reset về 0 |
| UT-AUTH-02 | ❌ | Username không tồn tại | `noexist` / `xxx` | `401 Unauthorized`, LoginLog = `login_failed` |
| UT-AUTH-03 | ❌ | Password sai | `admin` / `wrongpass` | `401`, `failed_login_count` tăng 1 |
| UT-AUTH-04 | ❌ | Password sai 5 lần liên tiếp | Gửi 5 lần sai | Lần 5: `failed_login_count = 5`, `locked_until` = now + 15min |
| UT-AUTH-05 | ❌ | Đăng nhập khi tài khoản bị khóa (locked_until > now) | `admin` / `Tmq@1234` | `423 ACCOUNT_LOCKED` + `locked_until` timestamp |
| UT-AUTH-06 | ⚡ | Đăng nhập sau khi hết thời gian khóa | Chờ 15 phút hoặc mock thời gian | Đăng nhập thành công, reset lock |
| UT-AUTH-07 | ❌ | Đăng nhập tài khoản `active = false` | User bị vô hiệu hóa | `401 Unauthorized` |
| UT-AUTH-08 | ⚡ | Đổi mật khẩu hợp lệ | `current_password` đúng, `new_password` ≥ 6 ký tự | `200`, `token_version` tăng → JWT cũ bị invalidate |
| UT-AUTH-09 | ❌ | Đổi mật khẩu — password hiện tại sai | `current_password` sai | `400` |
| UT-AUTH-10 | ❌ | Đổi mật khẩu — new_password < 6 ký tự | `new_password = "abc"` | `400` Schema validation fail |
| UT-AUTH-11 | ⚡ | `GET /me` — lấy profile | Token hợp lệ | User info (id, ma_nv, ten, role, van_phong) |
| UT-AUTH-12 | ⚠️ | Token bị thu hồi (`token_version` không khớp) | JWT cũ sau khi đổi MK | `401 TOKEN_REVOKED` |
| UT-AUTH-13 | ⚡ | Login ghi LoginLog thành công | Đăng nhập đúng | LoginLog = `login_success` + IP + User-Agent |

---

### 2.2. Module Văn phòng (`van-phong.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-VP-01 | ⚡ | Danh sách tất cả VP | GET, no filter | Mảng VP, có `id`, `ma_vp`, `ten` |
| UT-VP-02 | ⚡ | Danh sách VP active | `?active=true` | Chỉ VP có `active=true` |
| UT-VP-03 | ⚡ | Tạo VP mới | `{ma_vp: "HN", ten: "VP Hà Nội"}` | `201`, VP mới có `id` |
| UT-VP-04 | ❌ | Tạo VP trùng `ma_vp` | `{ma_vp: "SG"}` (đã tồn tại) | `400` hoặc `409 Conflict` — unique constraint |
| UT-VP-05 | ❌ | Tạo VP thiếu `ma_vp` | `{ten: "VP..."}` | `400` Schema validation |
| UT-VP-06 | ❌ | Tạo VP — `ma_vp` quá 10 ký tự | `{ma_vp: "ABCDEFGHIJK"}` | `400` maxLength violation |
| UT-VP-07 | ⚡ | Cập nhật VP | PUT `{ten: "VP Mới"}` | `200`, tên thay đổi |
| UT-VP-08 | ⚡ | Bật/tắt VP | PATCH `{active: false}` | VP.active = false |

---

### 2.3. Module Nhân viên (`nhan-vien.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-NV-01 | ⚡ | Danh sách NV | GET (admin) | Mảng NV có `ma_nv`, `ten`, `role`, `van_phong` |
| UT-NV-02 | ⚡ | Tạo NV | `{ma_nv, ten, username, password, van_phong_id, role}` | `200`, NV mới |
| UT-NV-03 | ❌ | Tạo NV — username trùng | `{username: "admin"}` | Unique constraint error |
| UT-NV-04 | ❌ | Tạo NV — password < 6 | `{password: "123"}` | `400` Schema validation |
| UT-NV-05 | ⚡ | Cập nhật role | PUT `{role: "accountant"}` | role thay đổi |
| UT-NV-06 | ⚡ | Toggle active | PATCH `{active: false}` | NV.active = false |
| UT-NV-07 | ❌ | Admin tự deactivate chính mình | `id = admin's id, active = false` | `400` "Không thể vô hiệu hóa tài khoản đang đăng nhập" |
| UT-NV-08 | ⚡ | Reset password | POST `/nhan-vien/:id/reset-password` | Trả `tempPassword`, `require_password_change = true` |

---

### 2.4. Module Khách hàng (`khach-hang.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-KH-01 | ⚡ | Danh sách KH (search + pagination) | `?search=Anh&page=1&limit=10` | Kết quả phân trang |
| UT-KH-02 | ⚡ | Autocomplete KH | `?q=cty` (≥ 2 ký tự) | Gợi ý 10 KH khớp ten_don_vi/dien_thoai |
| UT-KH-03 | ⚠️ | Autocomplete — query < 2 ký tự | `?q=c` | Trả mảng rỗng |
| UT-KH-04 | ⚡ | Tạo KH | `{ten_don_vi: "Cty ABC", loai_kh: "doanh_nghiep"}` | `201` |
| UT-KH-05 | ❌ | Tạo KH thiếu `ten_don_vi` | `{}` | `400` required |
| UT-KH-06 | ❌ | SĐT sai định dạng | `{dien_thoai: "abc"}` | `400` pattern mismatch |
| UT-KH-07 | ⚡ | SĐT đúng | `{dien_thoai: "0912345678"}` | OK, 10 số bắt đầu bằng 0 |
| UT-KH-08 | ❌ | Email sai format | `{email: "not-email"}` | `400` format fail |
| UT-KH-09 | ⚡ | Toggle KH active | PATCH `{active: false}` | KH.active = false (chỉ admin) |
| UT-KH-10 | ⚡ | Chi tiết KH | GET `/:id` | Đầy đủ thông tin KH |
| UT-KH-11 | ❌ | Chi tiết KH không tồn tại | GET `/:id` (id = 99999) | `404` |

---

### 2.5. Module Chành (`chanh.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-CH-01 | ⚡ | Danh sách chành | `?active=true` | Chành active, include VP info |
| UT-CH-02 | ⚡ | Lọc theo VP | `?van_phong_id=1` | Chỉ chành thuộc VP đó |
| UT-CH-03 | ⚡ | Tạo chành | `{ten, van_phong_id}` | `201` |
| UT-CH-04 | ❌ | Tạo chành thiếu `ten` | `{van_phong_id: 1}` | `400` |
| UT-CH-05 | ❌ | Tạo chành — VP không tồn tại | `{van_phong_id: 99999}` | FK constraint error |
| UT-CH-06 | ⚡ | Cập nhật + toggle | PUT + PATCH | Thay đổi thành công |

---

### 2.6. Module Biên nhận (`bien-nhan.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-BN-01 | ⚡ | Tạo BN — happy path | `{vp_gui_id, vp_nhan_id, don_vi_gui, hang_hoa_json, gia_cuoc}` | `201`, mã số tự sinh (VD: `SGCT-2204-0001`) |
| UT-BN-02 | ⚡ | Tạo BN — auto tự tạo KH mới | `don_vi_gui` chưa có trong DB | BN tạo + `auto_created_kh` trả về KH vừa tạo |
| UT-BN-03 | ❌ | Tạo BN thiếu `vp_gui_id` | `{vp_nhan_id: 2}` | `400` required |
| UT-BN-04 | ⚠️ | Tạo BN — `vp_gui_id = vp_nhan_id` | Cùng VP | _(Xác minh: hệ thống cho phép hay không)_ |
| UT-BN-05 | ⚡ | Tạo BN với `trang_thai_thu = "cong_no"` | Cước công nợ | BN tạo + bản ghi CongNo tự phát sinh |
| UT-BN-06 | ⚡ | Tạo BN — mã số custom | `{ma_so_custom: "SGCT-TEST-0001"}` | Mã custom được dùng |
| UT-BN-07 | ❌ | Tạo BN — mã số custom trùng | `{ma_so_custom: "SGCT-0001"}` | Unique constraint error |
| UT-BN-08 | ⚡ | Danh sách BN — filter + search + pagination + sort | `?search=Anh&trang_thai=cho_vc&from=2026-04-01&to=2026-04-22&sortBy=ngay_bien_nhan&sortOrder=desc` | Kết quả chính xác |
| UT-BN-09 | ⚠️ | Danh sách — sort injection | `?sortBy=password_hash` | Bị chặn, fallback `created_at` (whitelist) |
| UT-BN-10 | ⚡ | Chi tiết BN | GET `/:id` | Đầy đủ: VP gửi/nhận, NV, chành, hàng hóa |
| UT-BN-11 | ❌ | Chi tiết BN — Staff xem VP khác | Staff VP1 xem BN VP2→VP3 | `403 Forbidden` |
| UT-BN-12 | ⚡ | Cập nhật BN | PUT `{gia_cuoc: 150000}` | `200`, giá cước thay đổi |
| UT-BN-13 | ⚠️ | Cập nhật BN — field không cho phép | `{trang_thai: "khach_da_nhan"}` | `additionalProperties: false` → `400` |
| UT-BN-14 | ⚡ | Xóa BN | DELETE `/:id` | `200`, BN + LichSuTrangThai bị xóa |
| UT-BN-15 | ⚡ | Next mã số preview | GET `/next-ma-so?vp_gui_id=1&vp_nhan_id=2&ngay=2026-04-22` | Mã tiếp theo (VD: `SGCT-2204-0003`) |
| UT-BN-16 | ⚡ | Xuất PDF biên nhận | GET `/:id/pdf` | `Content-Type: application/pdf`, buffer hợp lệ |
| UT-BN-17 | ⚡ | Xuất Sổ BN PDF | GET `/so-bien-nhan?ngay_tu=2026-04-01&ngay_den=2026-04-22&vp_gui_id=1&vp_nhan_id=2` | PDF sổ biên nhận |
| UT-BN-18 | ❌ | Sổ BN — VP gửi = VP nhận | `vp_gui_id = vp_nhan_id` | `400` "VP gửi và VP nhận không được trùng" |
| UT-BN-19 | ❌ | Sổ BN — ngày_tu > ngày_den | `ngay_tu=2026-04-30, ngay_den=2026-04-01` | `400` "Ngày bắt đầu không được lớn hơn ngày kết thúc" |
| UT-BN-20 | ⚡ | Xuất Sổ BN Excel | GET `/so-bien-nhan-excel?...` | `Content-Type: application/vnd...spreadsheetml.sheet` |

---

### 2.7. Chuyển trạng thái Biên nhận (State Machine)

| ID | Loại | Mô tả | Trạng thái cũ → mới | Expected |
|----|------|-------|---------------------|----------|
| UT-TT-01 | ⚡ | Chờ VC → Đang VC | `cho_vc → dang_vc` | `200`, LichSuTrangThai ghi nhận |
| UT-TT-02 | ⚡ | Đang VC → Đã đến kho | `dang_vc → da_den_kho` | `200` |
| UT-TT-03 | ⚡ | Đã đến kho → Đã báo khách | `da_den_kho → da_bao_khach` | `200` |
| UT-TT-04 | ⚡ | Đã báo khách → Khách đã nhận | `da_bao_khach → khach_da_nhan` | `200` (terminal state) |
| UT-TT-05 | ❌ | Nhảy bước: Chờ VC → Đã đến kho | `cho_vc → da_den_kho` | `400` "Không thể chuyển từ Chờ VC sang Đã đến kho" |
| UT-TT-06 | ❌ | Nhảy bước: Chờ VC → Khách đã nhận | `cho_vc → khach_da_nhan` | `400` |
| UT-TT-07 | ❌ | Quay ngược: Đang VC → Chờ VC | `dang_vc → cho_vc` | `400` |
| UT-TT-08 | ❌ | Terminal: Khách đã nhận → bất kỳ | `khach_da_nhan → da_bao_khach` | `400` (ALLOWED_TRANSITIONS = []) |
| UT-TT-09 | ❌ | Cập nhật BN không tồn tại | `id = 99999` | `404` |
| UT-TT-10 | ⚡ | Lịch sử ghi đúng | Cập nhật trạng thái | `trang_thai_cu`, `trang_thai_moi`, `nhan_vien_id`, `phuong_thuc`, `ghi_chu`, `created_at` chính xác |
| UT-TT-11 | ⚡ | Batch update — tất cả hợp lệ | 5 BN cùng `cho_vc` → `dang_vc` | `200`, 5 LichSuTrangThai records |
| UT-TT-12 | ❌ | Batch — 1 BN không hợp lệ trong nhóm | 4 BN `cho_vc` + 1 BN `da_den_kho` → `dang_vc` | `400` "Có 1 BN không hợp lệ: ..." — toàn bộ batch REJECT |
| UT-TT-13 | ❌ | Batch — mảng ids rỗng | `ids: []` | `400` minItems: 1 |

---

### 2.8. Module Scan QR (`scan.routes.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-SCAN-01 | ⚡ | Tra cứu BN theo mã | GET `/scan/SGCT-0001` | Thông tin BN + lịch sử 5 bước, KHÔNG có NV ten |
| UT-SCAN-02 | ❌ | Mã không tồn tại | GET `/scan/XXXX-9999` | `404` "Không tìm thấy biên nhận" |
| UT-SCAN-03 | ⚡ | Trạng thái tiếp theo | BN `cho_vc` | `next_trang_thai = "dang_vc"` |
| UT-SCAN-04 | ⚠️ | BN terminal (khach_da_nhan) | BN `khach_da_nhan` | `next_trang_thai = null` |
| UT-SCAN-05 | ⚡ | Không yêu cầu auth | Không gửi JWT | `200` (public endpoint) |
| UT-SCAN-06 | ⚠️ | Rate limit | Gửi > 30 requests/phút | `429 Too Many Requests` |

---

### 2.9. Module Bảng kê HĐĐT (`bang-ke.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-BK-01 | ⚡ | BN chờ bảng kê | GET `/bien-nhan-cho?ngay=2026-04-22` | BN có `can_xuat_hddt=true` + `da_vao_bang_ke=false` |
| UT-BK-02 | ⚡ | Tạo bảng kê — Case A (từ BN thật) | `{items: [{bien_nhan_id: 1}]}` | BangKe + ChiTiet + Excel base64 + BN.da_vao_bang_ke = true |
| UT-BK-03 | ⚡ | Tạo bảng kê — Case B (kê thủ công) | `{items: [{hang_hoa: "Hàng A", gia_cuoc: 100000, ngay, tuyen, nguoi_gui}]}` | BangKe + ChiTiet (bien_nhan_id = NULL) |
| UT-BK-04 | ❌ | Tạo bảng kê — items rỗng | `{items: []}` | `400` minItems: 1 |
| UT-BK-05 | ⚡ | Download bảng kê | GET `/:id/download` | Excel base64 |
| UT-BK-06 | ⚡ | Danh sách lịch sử | GET `/` | Phân trang, có mã_bảng_kê, ngày, số BN, tổng cước |

---

### 2.10. Module DN HĐĐT (`doanh-nghiep-hddt.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-DN-01 | ⚡ | CRUD doanh nghiệp | POST→GET→PUT→PATCH | Tạo, lấy, sửa, toggle active |
| UT-DN-02 | ❌ | Tạo DN thiếu `ten` | `{ma_so_thue: "xxx"}` | `400` required |

---

### 2.11. Module Công nợ (`cong-no.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-CN-01 | ⚡ | Danh sách công nợ | GET `/` | CongNo records, include BienNhan info |
| UT-CN-02 | ⚡ | Xác nhận thanh toán | POST `/:id/xac-nhan-thanh-toan` | CongNo.trang_thai → `da_thu`, PhieuThu tự tạo |
| UT-CN-03 | ❌ | Xác nhận CN đã thu rồi | CN.trang_thai = `da_thu` | `400` "Công nợ đã được thanh toán" |
| UT-CN-04 | ⚡ | Report công nợ theo đối tượng | `?doi_tuong=Cty ABC&from=2026-04-01&to=2026-04-30` | Tổng hợp công nợ KH |
| UT-CN-05 | ⚡ | Đối soát cước | `?doi_tuong=Cty ABC&thang=4&nam=2026` | Số BN, tổng cước, so sánh dữ liệu |
| UT-CN-06 | ⚡ | Bảng kê cn theo tháng | `?thang=4&nam=2026` | Nhóm theo đối tượng, có tổng |
| UT-CN-07 | ⚡ | Export Excel bảng kê CN | `/bang-ke-thang/export?thang=4&nam=2026` | Excel base64 |
| UT-CN-08 | ⚡ | Export PDF bảng kê CN | `/bang-ke-thang/export-pdf?thang=4&nam=2026&doi_tuong=Cty` | PDF base64 |
| UT-CN-09 | ⚡ | Đối soát chi tiết | `/doi-soat-chi-tiet?thang=4&nam=2026` | BN chi tiết, cảnh báo bất thường |
| UT-CN-10 | ❌ | `thang` = 0 hoặc 13 | `?thang=0` | `400` minimum: 1, maximum: 12 |
| UT-CN-11 | ❌ | `nam` ngoài range | `?nam=2019` | `400` minimum: 2020 |

---

### 2.12. Module Doanh thu (`doanh-thu.service.js`)

| ID | Loại | Mô tả | Input | Expected |
|----|------|-------|-------|----------|
| UT-DT-01 | ⚡ | Báo cáo theo ngày | `?from=2026-04-01&to=2026-04-22&nhom=ngay` | Mảng {ngay, so_bn, tong_cuoc, tong_thu_ho} |
| UT-DT-02 | ⚡ | Báo cáo theo tuần | `?nhom=tuan` | Group theo tuần |
| UT-DT-03 | ⚡ | Báo cáo theo tháng | `?nhom=thang` | Group theo tháng |
| UT-DT-04 | ⚡ | Báo cáo theo năm | `?nhom=nam` | Group theo năm |
| UT-DT-05 | ⚠️ | Lọc theo VP | `?van_phong_id=1` | Chỉ BN của VP 1 |
| UT-DT-06 | ⚠️ | Không có dữ liệu | Khoảng thời gian trống | Mảng rỗng, không lỗi |

---

## 3. Cấp 2: Integration Test

### 3.1. Luồng Biên nhận + Công nợ

| ID | Mô tả | Các bước | Expected |
|----|-------|---------|----------|
| IT-BN-CN-01 | Tạo BN công nợ → tự phát sinh CongNo | 1. POST /bien-nhan với `trang_thai_thu = "cong_no"` | CongNo record xuất hiện, doi_tuong = don_vi_gui, so_tien_no = gia_cuoc |
| IT-BN-CN-02 | Xóa BN có CongNo | 1. Tạo BN công nợ<br>2. DELETE BN | Cả BN + CongNo đều bị xóa (CASCADE) |
| IT-BN-CN-03 | Cập nhật gia_cuoc BN → CongNo đồng bộ? | 1. Tạo BN công nợ (cước 100k)<br>2. PUT BN `{gia_cuoc: 200k}` | _(Xác minh: CongNo có tự update theo không)_ |

### 3.2. Luồng Biên nhận + Bảng kê

| ID | Mô tả | Các bước | Expected |
|----|-------|---------|----------|
| IT-BN-BK-01 | BN vào bảng kê → cờ da_vao_bang_ke | 1. Tạo BN `can_xuat_hddt=true`<br>2. POST /bang-ke chứa BN này | BN.da_vao_bang_ke = true |
| IT-BN-BK-02 | BN đã vào bảng kê không xuất hiện ở "chờ" | 1. BN.da_vao_bang_ke = true<br>2. GET /bien-nhan-cho | BN không xuất hiện |
| IT-BN-BK-03 | Xóa BN đã vào bảng kê | 1. BN có BangKeChiTiet<br>2. DELETE BN | Lỗi FK constraint (không cho xóa) |

### 3.3. Luồng Công nợ + Phiếu thu

| ID | Mô tả | Các bước | Expected |
|----|-------|---------|----------|
| IT-CN-PT-01 | Xác nhận thanh toán → tạo PhieuThu | 1. POST /cong-no/:id/xac-nhan-thanh-toan | CongNo.trang_thai = `da_thu`, PhieuThu tạo mới, `bien_nhan_id` liên kết |
| IT-CN-PT-02 | Xác nhận lần 2 → reject | 1. CongNo đã `da_thu`<br>2. POST lại | `400` |

### 3.4. Luồng Trạng thái + Lịch sử + Scan

| ID | Mô tả | Các bước | Expected |
|----|-------|---------|----------|
| IT-TT-SCAN-01 | Cập nhật TT → Scan thấy lịch sử | 1. PATCH /bien-nhan/:id/trang-thai cho_vc→dang_vc<br>2. GET /scan/:ma_so | `lich_su[0].trang_thai_moi = "dang_vc"` |
| IT-TT-SCAN-02 | Batch TT → Scan | 1. Batch 3 BN ch0_vc→dang_vc<br>2. Scan mỗi BN | Tất cả 3 BN đều đã cập nhật trạng thái |

### 3.5. Luồng NV + Biên nhận (VP Scope)

| ID | Mô tả | Các bước | Expected |
|----|-------|---------|----------|
| IT-NV-BN-01 | Staff VP1 chỉ thấy BN VP1 | 1. Login staff VP Tp.HCM<br>2. GET /bien-nhan | Chỉ BN có vp_gui hoặc vp_nhan = VP TP.HCM |
| IT-NV-BN-02 | Staff VP1 xem detail BN VP2-VP3 | 1. Staff VP1 GET /bien-nhan/:id (VP2→VP3) | `403 Forbidden` |

---

## 4. Cấp 3: System Test — Luồng nghiệp vụ E2E

### 4.1. ST-01: Luồng tạo BN → Vận chuyển → Giao hàng → Đối soát

```
Bước 1:  Admin đăng nhập → Trang Home hiện hero section + greeting
Bước 2:  Vào Biên nhận → Thêm mới
Bước 3:  Điền đầy đủ: đơn vị gửi, nhận, hàng hóa, cước, trang_thai_thu = "da_thu"
Bước 4:  Lưu → Tự in PDF → Kiểm tra PDF có đúng thông tin
Bước 5:  Chọn BN vừa tạo → Right panel hiện stepper "Chờ VC" (active)
Bước 6:  Nhấn "Chuyển sang: Đang VC" → Dialog → Xác nhận
Bước 7:  Stepper update → Đang VC active
Bước 8:  Tiếp tục: Đang VC → Đã đến kho → Đã báo khách → Khách đã nhận
Bước 9:  Tại step cuối → hiện "Đã hoàn tất giao hàng" (không có nút tiếp)
Bước 10: Vào Doanh thu → kiểm tra BN xuất hiện trong tổng cước ngày tạo
Bước 11: Scan QR trên điện thoại → Timeline hiển thị 5 bước
```
**Kết quả mong đợi:** Toàn bộ luồng hoàn tất không lỗi, dữ liệu nhất quán.

---

### 4.2. ST-02: Luồng công nợ đầy đủ

```
Bước 1:  Tạo BN với trang_thai_thu = "cong_no", gia_cuoc = 500,000đ
Bước 2:  Vào Công nợ → filter theo tháng → tìm thấy CN vừa tạo
Bước 3:  Đối soát: kiểm tra số BN, tổng cước, cảnh báo bất thường
Bước 4:  Export PDF bảng kê CN → kiểm tra nội dung PDF
Bước 5:  Xác nhận thanh toán → chọn tiền mặt/chuyển khoản → xác nhận
Bước 6:  CongNo chuyển "đã thu" → PhieuThu tự tạo
Bước 7:  Vào lại CN → record hiện trang_thai = "da_thu"
Bước 8:  Doanh thu: kiểm tra phiếu thu phản ánh đúng kỳ
```

---

### 4.3. ST-03: Luồng batch cập nhật trạng thái (gửi xe)

```
Bước 1:  Tạo 5 BN mới (trang_thai = "cho_vc")
Bước 2:  Lọc theo trạng thái "Chờ vận chuyển"
Bước 3:  Tick checkbox 5 BN
Bước 4:  Action bar hiện "Cập nhật TT (5)" 
Bước 5:  Nhấn → Dialog batch → Chọn "Đang vận chuyển" → Nhập ghi chú "Xe 51A-123"
Bước 6:  Xác nhận → Toast "Đã cập nhật 5 biên nhận"
Bước 7:  Bảng tự reload → 5 BN giờ hiện badge "Đang VC"  
Bước 8:  Chọn 1 BN bất kỳ → Timeline hiện "Đang vận chuyển — Batch: 5 biên nhận"
```

---

### 4.4. ST-04: Luồng bảng kê HĐĐT

```
Bước 1:  Tạo 3 BN có can_xuat_hddt = true
Bước 2:  Vào Bảng kê → "BN chờ" hiển thị 3 BN
Bước 3:  Chọn 2 BN + 1 dòng kê thủ công → Nhấn "Tạo bảng kê"
Bước 4:  Excel download → kiểm tra nội dung
Bước 5:  Quay lại "BN chờ" → chỉ còn 1 BN (2 BN đã da_vao_bang_ke)
Bước 6:  Vào Lịch sử → thấy bảng kê vừa tạo, tải lại OK
```

---

### 4.5. ST-05: Luồng quản lý nhân viên + phân quyền

```
Bước 1:  Admin tạo NV mới (role: staff, VP: Cần Thơ)  
Bước 2:  Login bằng NV mới → yêu cầu đổi MK
Bước 3:  Đổi MK → đăng nhập lại
Bước 4:  Staff truy cập Biên nhận → thấy BN liên quan VP Cần Thơ  
Bước 5:  Staff thử truy cập Nhân viên → 403 Forbidden
Bước 6:  Staff thử truy cập Công nợ → 403
Bước 7:  Staff cập nhật trạng thái BN VP mình → OK
Bước 8:  Admin deactivate NV → NV call API → 401 "Tài khoản đã bị vô hiệu hóa"
```

---

## 5. Cấp 4: Non-functional & Bảo mật

### 5.1. An ninh (Security)

| ID | Mô tả | Phương pháp | Expected |
|----|-------|-------------|----------|
| SEC-01 | API không auth → 401 | Gọi bất kỳ `GET /api/bien-nhan` không JWT | `401 UNAUTHORIZED` |
| SEC-02 | JWT hết hạn | Đổi MK → dùng token cũ | `401 TOKEN_REVOKED` |
| SEC-03 | Accountant truy cập API admin-only | PATCH /nhan-vien/:id/active | `403 FORBIDDEN` |
| SEC-04 | Staff truy cập công nợ | GET /cong-no | `403` |
| SEC-05 | Staff xem BN VP khác | GET /bien-nhan/:id (VP khác) | `403` |
| SEC-06 | Sort injection | `?sortBy=password_hash` | Whitelist chặn → fallback created_at |
| SEC-07 | Rate limit login | 6 requests/phút | Từ request thứ 6: `429` |
| SEC-08 | Rate limit scan | 31 requests/phút | `429` |
| SEC-09 | Body injection | `additionalProperties: false` trên tất cả schema | Bất kỳ field lạ → `400` |
| SEC-10 | Account lockout | 5 lần sai → locked_until | Đúng 15 phút lock |
| SEC-11 | Password hash | Kiểm tra DB | `password_hash` là bcrypt, không plain text |
| SEC-12 | Single session | Login 2 nơi → token cũ revoke | `token_version` tăng → JWT cũ fail |
| SEC-13 | Audit log | Tạo/sửa/xóa BN | AuditLog record chính xác (action, entity, old/new data) |

### 5.2. Ma trận phân quyền (RBAC)

| API | Admin | Staff | Accountant | No Auth |
|-----|:-----:|:-----:|:----------:|:-------:|
| POST /auth/login | ✅ | ✅ | ✅ | ✅ |
| GET /auth/me | ✅ | ✅ | ✅ | ❌ |
| GET /van-phong | ✅ | ✅ | ✅ | ❌ |
| POST/PUT/PATCH /van-phong | ✅ | ❌ | ❌ | ❌ |
| GET /nhan-vien | ✅ | ❌ | ❌ | ❌ |
| POST/PUT/PATCH /nhan-vien | ✅ | ❌ | ❌ | ❌ |
| GET /khach-hang | ✅ | ✅ | ✅ | ❌ |
| POST/PUT /khach-hang | ✅ | ✅ | ❌ | ❌ |
| PATCH /khach-hang/:id/active | ✅ | ❌ | ❌ | ❌ |
| GET /bien-nhan | ✅ | ✅ (scoped VP) | ✅ | ❌ |
| POST/PUT/DELETE /bien-nhan | ✅ | ✅ | ❌ | ❌ |
| PATCH /bien-nhan/trang-thai | ✅ | ✅ | ❌ | ❌ |
| PATCH /bien-nhan/batch | ✅ | ✅ | ❌ | ❌ |
| GET /scan/:ma_so | ✅ | ✅ | ✅ | ✅ (public) |
| GET /chanh | ✅ | ✅ | ✅ | ❌ |
| POST/PUT/PATCH /chanh | ✅ | ❌ | ❌ | ❌ |
| */bang-ke | ✅ | ❌ | ❌ | ❌ |
| */doanh-nghiep-hddt | ✅ | ❌ | ❌ | ❌ |
| GET /cong-no/* | ✅ | ❌ | ✅ | ❌ |
| POST /cong-no/xac-nhan | ✅ | ❌ | ✅ | ❌ |
| GET /doanh-thu | ✅ | ❌ | ✅ | ❌ |

> **Cách kiểm thử:** Với mỗi ô `❌`, gọi API với JWT của role đó → verify `403`.

### 5.3. Validation & Boundary

| ID | Mô tả | Expected |
|----|-------|----------|
| SEC-V-01 | `ma_vp` max 10 ký tự | `400` nếu > 10 |
| SEC-V-02 | `dien_thoai` pattern `^0[2-9]\d{8,9}$` | `400` nếu sai |
| SEC-V-03 | `email` format | `400` nếu sai |
| SEC-V-04 | `gia_cuoc` âm | `400` (minimum: 0) |
| SEC-V-05 | `hang_hoa_json.so_luong` âm | `400` (minimum: 0) |
| SEC-V-06 | `thang` = 0, 13 | `400` min/max |
| SEC-V-07 | `nam` = 2019, 2031 | `400` min/max |
| SEC-V-08 | JSON body rỗng cho POST | `400` required fields |
| SEC-V-09 | String rỗng cho required fields | `400` minLength: 1 |
| SEC-V-10 | Numeric id = "abc" | `400` type validation |

---

## 6. Cấp 5: UAT — Kiểm thử Chấp nhận

### 6.1. Kịch bản người dùng thực tế

| ID | Vai trò | Kịch bản | Kết quả mong đợi |
|----|---------|---------|-------------------|
| UAT-01 | NV VP gửi (Staff) | Nhận hàng → Tạo BN → In biên nhận → Giao khách | BN tạo + PDF đúng format |
| UAT-02 | NV VP gửi (Staff) | Sáng chuẩn bị xe → Batch 20 BN "Đang VC" | Batch thành công < 5 giây |
| UAT-03 | NV VP nhận (Staff) | Xe đến → Batch BN "Đã đến kho" | Batch → "Đã báo khách" → "Khách đã nhận" |
| UAT-04 | Kế toán (Accountant) | Cuối tháng: lập bảng kê CN → đối soát → xuất PDF → thu tiền | PDF đúng, CN tự đóng, phiếu thu tự tạo |
| UAT-05 | Kế toán (Accountant) | Báo cáo doanh thu tuần/tháng → so với sổ | Số liệu khớp |
| UAT-06 | Admin | Tạo VP mới → Tạo NV → Phân quyền → Monitoring audit log | Hệ thống phân quyền đúng |
| UAT-07 | Khách hàng | Quét mã QR → xem trạng thái | Timeline hiện đúng, không lộ thông tin nội bộ |
| UAT-08 | Admin | Xuất bảng kê HĐĐT → gửi DN | Excel đúng format kế toán |

### 6.2. Edge Cases nghiệp vụ

| ID | Kịch bản | Expected |
|----|---------|----------|
| UAT-EC-01 | Tạo BN back-date (ngày trước) | Mã số sinh đúng theo ngày đã chọn, không phải hôm nay |
| UAT-EC-02 | 2 NV tạo BN cùng VP cùng lúc | Mã số không trùng (race condition handling) |
| UAT-EC-03 | Sửa BN sau khi đã vào bảng kê | Vẫn sửa được BN nhưng bảng kê giữ snapshot cũ |
| UAT-EC-04 | KH gửi ít (3 BN/tháng) nhưng đòi xuất HĐ cao | Đối soát cảnh báo, admin thấy anomaly |
| UAT-EC-05 | VP chỉ có 1 tuyến (vp_gui = vp_nhan) | _(Xác minh behavior)_ |
| UAT-EC-06 | Hàng hóa JSON tất cả so_luong = 0 | Validation phải yêu cầu ít nhất 1 hàng hóa |
| UAT-EC-07 | BN không có đơn vị gửi + nhận | _(Xác minh: field required hay optional)_ |
| UAT-EC-08 | Concurrent batch update cùng BN | Lần 2 fail (trạng thái đã thay đổi) |

---

## Phụ lục A: Checklist Frontend UI

### A.1. Trang Đăng nhập

| # | Kiểm tra | ✅/❌ |
|---|---------|:----:|
| 1 | Logo TMQ Express hiển thị | ⏳ |
| 2 | Input username + password | ⏳ |
| 3 | Hiển thị lỗi khi sai mật khẩu | ⏳ |
| 4 | Hiển thị lỗi khi tài khoản bị khóa | ⏳ |
| 5 | Redirect về Home sau đăng nhập | ⏳ |
| 6 | Responsive (mobile) | ⏳ |

### A.2. Trang Biên nhận

| # | Kiểm tra | ✅/❌ |
|---|---------|:----:|
| 1 | Filter VP giao dịch + Ngày + Trạng thái | ⏳ |
| 2 | Tìm kiếm (debounce 300ms) | ⏳ |
| 3 | Phân trang (20 dòng/trang) | ⏳ |
| 4 | Sort cột (Mã, Ngày, Đơn vị, Cước) | ⏳ |
| 5 | Click dòng → Right panel detail | ⏳ |
| 6 | Right panel: Stepper 5 bước hiển thị đúng | ⏳ |
| 7 | Right panel: Nút "Chuyển sang..." hoạt động | ⏳ |
| 8 | Right panel: Timeline lịch sử hiển thị | ⏳ |
| 9 | Checkbox batch → Nút "Cập nhật TT (N)" | ⏳ |
| 10 | Batch dialog → Chọn TT → Xác nhận | ⏳ |
| 11 | Lưu & in PDF | ⏳ |
| 12 | Lưu & thêm mới (liên tục) | ⏳ |
| 13 | Sửa → form edit đúng dữ liệu | ⏳ |
| 14 | Xóa → dialog confirm → xóa thành công | ⏳ |
| 15 | Autocomplete KH (gửi/nhận) | ⏳ |
| 16 | Validation form (highlight lỗi, scroll to error) | ⏳ |
| 17 | In sổ BN (PDF + Excel, preset ngày) | ⏳ |

### A.3. Trang Scan QR (Mobile)

| # | Kiểm tra | ✅/❌ |
|---|---------|:----:|
| 1 | Logo TMQ Express | ⏳ |
| 2 | StatusStepper 5 bước | ⏳ |
| 3 | StatusBadge trạng thái | ⏳ |
| 4 | Route gửi → nhận | ⏳ |
| 5 | Timeline lịch sử | ⏳ |
| 6 | Mã không tồn tại → error page | ⏳ |
| 7 | Responsive mobile viewport | ⏳ |

### A.4. Các trang quản trị

| # | Trang | Kiểm tra chính | ✅/❌ |
|---|-------|---------------|:----:|
| 1 | Văn phòng | CRUD + toggle active | ⏳ |
| 2 | Nhân viên | CRUD + reset MK + toggle | ⏳ |
| 3 | Khách hàng | CRUD + search + toggle | ⏳ |
| 4 | Chành | CRUD + filter VP + toggle | ⏳ |
| 5 | Bảng kê | BN chờ + tạo + lịch sử + download | ⏳ |
| 6 | Công nợ | DS + xác nhận TT + đối soát + export | ⏳ |
| 7 | Doanh thu | Chart + filter ngày/tuần/tháng/năm + VP | ⏳ |
| 8 | Home | Logo + greeting + thống kê | ⏳ |

---

## Phụ lục B: Data Test chuẩn bị

### B.1. Seed data cần có
| Dữ liệu | Số lượng | Ghi chú |
|---------|---------|---------|
| Văn phòng | 2+ | SG (Tp.HCM) + CT (Cần Thơ) |
| Nhân viên | 3+ | 1 admin, 1 staff, 1 accountant |
| Khách hàng | 10+ | Mix doanh nghiệp + cá nhân |
| Chành | 2+ | Thuộc VP khác nhau |
| Biên nhận | 50+ | Mix trạng thái (cho_vc → khach_da_nhan), mix trang_thai_thu |
| Công nợ | 10+ | Mix chua_thu + da_thu |
| Bảng kê | 2+ | BN đã vào bảng kê |
| DN HĐĐT | 3+ | Cho autocomplete |

### B.2. Tài khoản test
| Username | Password | Role | VP |
|----------|----------|------|------|
| admin | Tmq@1234 | admin | SG |
| staff01 | Tmq@1234 | staff | SG |
| staff02 | Tmq@1234 | staff | CT |
| ketoan01 | Tmq@1234 | accountant | SG |

---

## Phụ lục C: Cookbook — Request/Response mẫu

> **Quy ước:** `$TOKEN` = JWT lấy từ API login. Copy-paste curl, thay `$TOKEN`.
> **Base URL:** `http://localhost:3000/api`

### C.1. Xác thực (Auth)

#### ✅ UT-AUTH-01: Đăng nhập thành công
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Tmq@1234"}'
```
**Kỳ vọng (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "ma_nv": "ADMIN-01",
      "ten": "ADMIN Tổng",
      "role": "admin",
      "van_phong": { "id": 1, "ma_vp": "SG", "ten": "VP Tp.HCM" },
      "require_password_change": false,
      "token_version": 5
    }
  }
}
```

#### ❌ UT-AUTH-02: Username không tồn tại
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"noexist","password":"xxx"}'
```
**Kỳ vọng (401):**
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Sai tài khoản hoặc mật khẩu" }
}
```

#### ❌ UT-AUTH-04: Khóa tài khoản sau 5 lần sai
```bash
# Chạy 5 lần liên tiếp:
for i in $(seq 1 5); do
  curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"staff01","password":"wrong"}'
  echo ""
done

# Lần thứ 6 (đúng mật khẩu cũng bị khóa):
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"staff01","password":"Tmq@1234"}'
```
**Kỳ vọng (423):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần.",
    "locked_until": "2026-04-22T12:15:00.000Z"
  }
}
```
> **⚠️ Sau test:** Mở Prisma Studio → bảng `nhan_vien` → reset `failed_login_count=0`, `locked_until=NULL` cho staff01.

#### ✅ UT-AUTH-08: Đổi mật khẩu
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"current_password":"Tmq@1234","new_password":"NewPass123"}'
```
**Kỳ vọng (200):**
```json
{ "success": true, "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." }
```
**Verify:** Token cũ giờ sẽ bị reject (401 TOKEN_REVOKED).

#### ✅ UT-AUTH-11: Lấy profile
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```
**Kỳ vọng (200):**
```json
{
  "success": true,
  "data": { "id": 1, "ma_nv": "ADMIN-01", "ten": "ADMIN Tổng", "role": "admin", "van_phong": {...} }
}
```

---

### C.2. Văn phòng

#### ✅ UT-VP-03: Tạo VP mới
```bash
curl -X POST http://localhost:3000/api/van-phong \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ma_vp":"HN","ten":"VP Hà Nội","dia_chi":"123 Hoàng Hoa Thám, HN","dien_thoai":"0241234567"}'
```
**Kỳ vọng (201):**
```json
{ "success": true, "data": { "id": 3, "ma_vp": "HN", "ten": "VP Hà Nội", ... }, "message": "Tạo văn phòng thành công" }
```

#### ❌ UT-VP-04: Tạo VP trùng mã
```bash
curl -X POST http://localhost:3000/api/van-phong \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"ma_vp":"SG","ten":"VP Sài Gòn 2"}'
```
**Kỳ vọng (400 hoặc 500):** Unique constraint error

---

### C.3. Nhân viên

#### ✅ UT-NV-02: Tạo NV
```bash
curl -X POST http://localhost:3000/api/nhan-vien \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ma_nv": "TEST-NV01",
    "ten": "Nguyễn Kiểm Thử",
    "username": "testnv01",
    "password": "Test@1234",
    "role": "staff",
    "van_phong_id": 2
  }'
```
**Kỳ vọng (200):** NV mới tạo, `require_password_change: true`

#### ❌ UT-NV-07: Admin tự deactivate
```bash
# Lấy ID admin từ token payload hoặc /me
curl -X PATCH http://localhost:3000/api/nhan-vien/1/active \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"active": false}'
```
**Kỳ vọng (400):**
```json
{ "statusCode": 400, "message": "Không thể vô hiệu hóa tài khoản đang đăng nhập" }
```

---

### C.4. Biên nhận — CRUD

#### ✅ UT-BN-01: Tạo BN happy path
```bash
curl -X POST http://localhost:3000/api/bien-nhan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "van_phong_gui_id": 1,
    "van_phong_nhan_id": 2,
    "ngay_bien_nhan": "2026-04-22",
    "don_vi_gui": "Công ty Test ABC",
    "nguoi_gui": "Nguyễn Văn A",
    "dien_thoai_gui": "0912345678",
    "don_vi_nhan": "Công ty XYZ",
    "nguoi_nhan": "Trần Văn B",
    "dien_thoai_nhan": "0987654321",
    "hang_hoa_json": [
      {"don_vi": "kiện", "so_luong": 3, "ghi_chu": "Hàng điện tử"},
      {"don_vi": "bao", "so_luong": 1}
    ],
    "gia_cuoc": 150000,
    "trang_thai_thu": "da_thu",
    "hinh_thuc_giao": "goi_dien",
    "gio_tao": "14:30"
  }'
```
**Kỳ vọng (201):**
```json
{
  "success": true,
  "data": {
    "id": 51,
    "ma_so": "SGCT-2204-0051",
    "trang_thai": "cho_vc",
    "ten_hang_hoa": "3 kiện, 1 bao",
    ...
  },
  "message": "Tạo biên nhận thành công"
}
```
**Verify DB:** Bản ghi `LichSuTrangThai` với `trang_thai_moi = "cho_vc"`, `ghi_chu = "Tạo biên nhận mới"`.

#### ✅ UT-BN-05: Tạo BN công nợ → tự sinh CongNo
```bash
curl -X POST http://localhost:3000/api/bien-nhan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "van_phong_gui_id": 1,
    "van_phong_nhan_id": 2,
    "don_vi_gui": "Công ty Nợ Test",
    "hang_hoa_json": [{"don_vi": "thùng", "so_luong": 2}],
    "gia_cuoc": 500000,
    "trang_thai_thu": "cong_no"
  }'
```
**Verify DB:** Bảng `cong_no` có record mới: `doi_tuong = "Công ty Nợ Test"`, `so_tien_no = 500000`, `trang_thai = "chua_thu"`.

#### ✅ UT-BN-08: Danh sách filter đầy đủ
```bash
curl "http://localhost:3000/api/bien-nhan?search=Test&trang_thai=cho_vc&from=2026-04-01&to=2026-04-30&page=1&limit=10&sortBy=ngay_bien_nhan&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"
```
**Kỳ vọng (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
}
```

---

### C.5. Chuyển trạng thái

#### ✅ UT-TT-01: Chờ VC → Đang VC
```bash
# Thay :id bằng ID biên nhận thực tế
curl -X PATCH http://localhost:3000/api/bien-nhan/51/trang-thai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"trang_thai": "dang_vc", "ghi_chu": "Xe 51A-12345 đã xuất bến"}'
```
**Kỳ vọng (200):**
```json
{ "success": true, "message": "Đã cập nhật trạng thái thành Đang VC" }
```
**Verify DB:** `bien_nhan.trang_thai = "dang_vc"`, `lich_su_trang_thai` có record mới.

#### ❌ UT-TT-05: Nhảy bước (Chờ VC → Đã đến kho)
```bash
curl -X PATCH http://localhost:3000/api/bien-nhan/52/trang-thai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"trang_thai": "da_den_kho"}'
```
**Kỳ vọng (400):**
```json
{ "statusCode": 400, "message": "Không thể chuyển từ \"Chờ VC\" sang \"Đã đến kho\"" }
```

#### ✅ UT-TT-11: Batch update
```bash
curl -X PATCH http://localhost:3000/api/bien-nhan/batch-trang-thai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "ids": [53, 54, 55],
    "trang_thai": "dang_vc",
    "ghi_chu": "Batch: xe chiều 22/04"
  }'
```
**Kỳ vọng (200):**
```json
{ "success": true, "message": "Đã cập nhật 3 biên nhận" }
```

---

### C.6. Scan QR (Public)

#### ✅ UT-SCAN-01: Tra cứu BN
```bash
# Không cần Authorization header!
curl http://localhost:3000/api/scan/SGCT-2204-0051
```
**Kỳ vọng (200):**
```json
{
  "success": true,
  "data": {
    "ma_so": "SGCT-2204-0051",
    "trang_thai": "dang_vc",
    "next_trang_thai": "da_den_kho",
    "van_phong_gui": { "ma_vp": "SG", "ten": "VP Tp.HCM" },
    "van_phong_nhan": { "ma_vp": "CT", "ten": "VP Cần Thơ" },
    "lich_su": [
      { "trang_thai_moi": "dang_vc", "created_at": "...", "ghi_chu": "Xe 51A-12345..." },
      { "trang_thai_moi": "cho_vc", "created_at": "...", "ghi_chu": "Tạo biên nhận mới" }
    ]
  }
}
```
**Lưu ý kiểm tra:** KHÔNG có trường `nhan_vien.ten` (thông tin nội bộ).

---

### C.7. Công nợ

#### ✅ UT-CN-02: Xác nhận thanh toán
```bash
# :id = ID công nợ (lấy từ GET /cong-no)
curl -X POST http://localhost:3000/api/cong-no/1/xac-nhan-thanh-toan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"hinh_thuc": "tien_mat", "ghi_chu": "Thu tiền mặt tại VP"}'
```
**Kỳ vọng (200):**
```json
{ "success": true, "data": {...}, "message": "Đã xác nhận thanh toán và tạo phiếu thu" }
```
**Verify DB:**
- `cong_no.trang_thai` = `da_thu`
- `phieu_thu` có record mới link `cong_no_id`

#### ✅ UT-CN-06: Bảng kê CN theo tháng
```bash
curl "http://localhost:3000/api/cong-no/bang-ke-thang?thang=4&nam=2026" \
  -H "Authorization: Bearer $TOKEN"
```
**Kỳ vọng (200):**
```json
{
  "success": true,
  "data": [
    { "doi_tuong": "Công ty ABC", "so_cong_no": 3, "tong": 1500000, "da_thu": 500000, "con_no": 1000000 },
    ...
  ],
  "tong": { "so_cong_no": 10, "tong": 5000000, "da_thu": 2000000, "con_no": 3000000 }
}
```

---

### C.8. Bảo mật — Mẫu test

#### ❌ SEC-01: Gọi API không token
```bash
curl http://localhost:3000/api/bien-nhan
```
**Kỳ vọng (401):**
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." } }
```

#### ❌ SEC-03: Accountant gọi API admin
```bash
# Login bằng ketoan01, lấy token
TOKEN_KT=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ketoan01","password":"Tmq@1234"}' | jq -r '.data.token')

# Thử tạo nhân viên (admin-only)
curl -X POST http://localhost:3000/api/nhan-vien \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_KT" \
  -d '{"ma_nv":"X","ten":"X","username":"x","password":"123456","van_phong_id":1}'
```
**Kỳ vọng (403):**
```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Bạn không có quyền thực hiện thao tác này." } }
```

#### ❌ SEC-06: Sort injection
```bash
curl "http://localhost:3000/api/bien-nhan?sortBy=password_hash&sortOrder=asc" \
  -H "Authorization: Bearer $TOKEN"
```
**Kỳ vọng (200):** Trả data bình thường nhưng sort theo `created_at` (fallback), KHÔNG phải `password_hash`.

---

## Phụ lục D: Hướng dẫn chi tiết Test UI (Giao diện)

### D.1. ST-01 chi tiết: Tạo BN → Chuyển trạng thái → Scan

| Bước | Thao tác cụ thể | Kỳ vọng |
|------|-----------------|---------|
| 1 | Mở `http://localhost:5173/login` | Trang đăng nhập hiện logo TMQ Express, 2 ô input, nút "Đăng nhập" |
| 2 | Nhập `admin` / `Tmq@1234` → Click "Đăng nhập" | Redirect về `/`, hero section hiện "Xin chào, ADMIN Tổng" |
| 3 | Click icon 📝 **"Biên nhận"** trên sidebar trái | Trang danh sách BN, header có: VP giao dịch, Từ ngày, Đến ngày, **Trạng thái** |
| 4 | Click nút **"+ Thêm"** ở action bar dưới | Right panel chuyển sang form tạo mới |
| 5 | Tại form, điền: | |
| | — VP nhận: **VP Cần Thơ** (dropdown) | Mã BN preview hiện "SGCT-..." |
| | — Đơn vị gửi: gõ "Công ty" → chờ autocomplete → chọn hoặc nhập mới | Autocomplete dropdown xuất hiện |
| | — Người gửi: "Nguyễn Văn A" | |
| | — ĐT gửi: "0912345678" | |
| | — Đơn vị nhận: "Công ty XYZ" | |
| | — Người nhận: "Trần Văn B" | |
| | — Hàng hóa: thêm 2 dòng (kiện: 3, bao: 1) | |
| | — Giá cước: 150000 (gõ thấy tự format "150.000") | |
| | — TT thu: "Đã thu" | |
| 6 | Click **"Lưu"** | Toast xanh "Tạo biên nhận thành công", panel chuyển view mode |
| 7 | Scroll xuống phần **"TRẠNG THÁI VẬN CHUYỂN"** | Stepper 5 bước, "Chờ VC" đang glow xanh (active) |
| 8 | Click nút **"🔄 Chuyển sang: Đang vận chuyển"** | Dialog xác nhận: hiện mã BN, ô ghi chú |
| 9 | Nhập ghi chú "Xe 51A-12345" → Click **"Xác nhận"** | Dialog đóng, stepper update "Đang VC" active, Timeline thêm dòng mới |
| 10 | Lặp lại bước 8-9 cho: | |
| | — Đang VC → Đã đến kho | Stepper bước 3 active |
| | — Đã đến kho → Đã báo khách | Stepper bước 4 active |
| | — Đã báo khách → Khách đã nhận | Stepper tất cả ✓, hiện "✅ Đã hoàn tất giao hàng" |
| 11 | Tại bước cuối: kiểm tra KHÔNG CÒN nút chuyển TT | Chỉ hiện badge xanh lá "Đã hoàn tất" |
| 12 | Mở tab mới → `http://localhost:5173/scan/SGCT-XXXX-XXXX` | Trang scan: logo, stepper 5 ✓, timeline 5 dòng, KHÔNG có tên NV |

### D.2. ST-03 chi tiết: Batch cập nhật trạng thái

| Bước | Thao tác | Kỳ vọng |
|------|---------|---------|
| 1 | Vào Biên nhận, đảm bảo có ≥ 3 BN "Chờ VC" (dùng filter **Trạng thái: Chờ vận chuyển**) | Bảng chỉ hiện BN Chờ VC |
| 2 | Tick checkbox ☐ ở đầu 3 dòng bất kỳ | Action bar hiện nút **"🔄 Cập nhật TT (3)"** màu tím |
| 3 | Click nút **"Cập nhật TT (3)"** | Dialog "Cập nhật trạng thái hàng loạt" mở ra |
| 4 | Trong dialog: | |
| | — Dropdown "Chuyển sang trạng thái": chọn **"Đang vận chuyển"** | |
| | — Ghi chú: nhập "Xe chiều 22/04" | |
| | — Preview: hiện 3 dòng mã BN + đơn vị gửi/nhận | |
| 5 | Click **"Xác nhận"** | Toast "Đã cập nhật 3 biên nhận", dialog đóng |
| 6 | Bảng tự reload | 3 BN giờ hiện badge "Đang VC" (hoặc biến mất nếu filter vẫn "Chờ VC") |
| 7 | Click 1 BN vừa cập nhật → scroll xuống Timeline | Dòng mới: "Đang vận chuyển — Xe chiều 22/04", phương thức = "batch" |

### D.3. Kiểm tra phân quyền UI (ST-05)

| Bước | Thao tác | Kỳ vọng |
|------|---------|---------|
| 1 | Logout (click tên góc phải → icon logout) | Redirect về `/login` |
| 2 | Đăng nhập `staff01` / `Tmq@1234` | Redirect Home, sidebar CHỈ hiện: Home, Biên nhận, Khách hàng |
| 3 | Thử gõ URL `http://localhost:5173/nhan-vien` | Redirect về Home hoặc hiện "Không có quyền" |
| 4 | Thử gõ URL `http://localhost:5173/cong-no` | Redirect về Home hoặc hiện "Không có quyền" |
| 5 | Vào Biên nhận → kiểm tra data | Chỉ thấy BN liên quan VP Tp.HCM (vp_gui hoặc vp_nhan) |
| 6 | Tạo BN → OK | Staff tạo được BN |
| 7 | Xóa BN → OK | Staff xóa được BN |
| 8 | Logout → Login `ketoan01` | Sidebar hiện: Home, Công nợ, Doanh thu, Biên nhận (chỉ xem) |
| 9 | Vào Biên nhận → thử tạo mới | Nút "Thêm" không hiện hoặc disabled |

