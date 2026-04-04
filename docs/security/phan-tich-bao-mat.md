# TMQ Express — Phân Tích & Đề Xuất Bảo Mật

> **Cập nhật lần cuối:** 2026-04-05
> **Trạng thái:** Phase 1 đã triển khai (S-01 → S-05, S-07, S-08)

## I. Hiện Trạng Bảo Mật

### Đã có ✅

| # | Biện pháp | Chi tiết | Phiên bản |
|---|---|---|---|
| 1 | JWT Authentication | Token ký bằng secret ≥ 16 ký tự, hết hạn 8h | v1.0 |
| 2 | Role-Based Access Control | 3 role (admin/staff/accountant), kiểm tra cả backend lẫn frontend | v1.0 |
| 3 | Password Hashing | bcrypt (10 rounds) | v1.0 |
| 4 | Rate Limiting | Global 100 req/min, Login 5 req/min | v1.0 |
| 5 | Schema Validation | Fastify JSON Schema trên mọi body request + `additionalProperties: false` | v1.0 → v1.1 |
| 6 | CORS | Giới hạn origin | v1.0 |
| 7 | Soft Delete | Không xóa dữ liệu, chỉ đánh `active = false` / `da_huy = true` | v1.0 |
| 8 | Error Sanitization | Ẩn lỗi server (500), chỉ trả message chung | v1.0 |
| 9 | Staff scope filter | Staff chỉ thấy BN liên quan VP mình, chỉ sửa BN mình tạo | v1.0 |
| 10 | Lịch sử trạng thái BN | `LichSuTrangThai` ghi ai đổi, lúc nào, ghi chú gì | v1.0 |
| 11 | **Audit Log toàn diện** | Ghi mọi CREATE/UPDATE/DELETE vào bảng `audit_log` (IP, user-agent, old/new data) | **v1.1** |
| 12 | **Login Activity Log** | Ghi mọi login thành công/thất bại vào bảng `login_log` (IP, user-agent) | **v1.1** |
| 13 | **Account Lock** | 5 lần đăng nhập sai → khóa tạm 15 phút | **v1.1** |
| 14 | **JWT Revocation** | `token_version` trong JWT payload — verify mỗi request against DB | **v1.1** |
| 15 | **Single Session** | Login mới → tăng `token_version` → session cũ tự vô hiệu | **v1.1** |
| 16 | **Edit Time Limit** | Staff chỉ sửa BN trong 24 giờ sau tạo, Admin không giới hạn | **v1.1** |
| 17 | **PDF Watermark** | Tên NV + timestamp in mờ (opacity 0.08) trên mọi PDF xuất ra | **v1.1** |
| 18 | **Whitelist Update Fields** | `updateBienNhan` chỉ cho phép sửa 17 fields cụ thể, chống field injection | **v1.1** |

### Chưa có ❌ (Backlog — Phase tiếp theo)

| # | Thiếu sót | Rủi ro | Ưu tiên |
|---|---|---|:---:|
| 1 | **Không có 2FA** | Mất mật khẩu = mất tài khoản | 🟢 |
| 2 | **Không có Admin Dashboard giám sát** | Không thấy NV nào online, hoạt động bất thường | 🟢 |
| 3 | **Không checksumming dữ liệu tài chính** | Sửa DB trực tiếp → không phát hiện | 🟢 |
| 4 | **Chưa backup tự động** | Mất dữ liệu nếu server hỏng | 🟢 |
| 5 | **Không có cảnh báo bất thường** | Tạo 100 BN/giờ, sửa cước hàng loạt — không ai biết | 🟢 |

---

## II. Chi Tiết Giải Pháp Đã Triển Khai (v1.1)

### S-01: Audit Log Toàn Diện ✅

**Bảng:** `audit_log`
**File:** `src/plugins/audit-log.js`, `src/plugins/request-context.js`

```
AuditLog:
  id, timestamp,
  nhan_vien_id,    -- Ai làm
  action,          -- CREATE | UPDATE | DELETE | EXPORT
  entity,          -- bien_nhan | phieu_thu | phieu_chi | cong_no | ...
  entity_id,       -- Record nào
  old_data (JSON), -- Dữ liệu trước (cho UPDATE)
  new_data (JSON), -- Dữ liệu sau
  ip_address,      -- IP client
  user_agent       -- Trình duyệt
```

**Cách hoạt động:** Dùng `AsyncLocalStorage` (`request-context.js`) truyền request context (user, IP, UA) xuống service layer mà không cần parameter drilling. Hàm `writeAuditLog()` gọi trong mỗi service sau CREATE/UPDATE/DELETE.

**Entities được track:** `bien_nhan`, `phieu_thu`, `phieu_chi`

**An toàn:** Audit log failure **KHÔNG** block business operation (try-catch, console.warn).

---

### S-02: Login Activity Log ✅

**Bảng:** `login_log`
**File:** `src/services/auth.service.js`

Ghi lại mọi sự kiện đăng nhập:
- `login_success` — đăng nhập thành công
- `login_failed` — sai mật khẩu hoặc tài khoản không tồn tại

Kèm theo: `ip_address`, `user_agent`, `timestamp`, `nhan_vien_id` (nếu có).

---

### S-03: Account Lock ✅

**File:** `src/services/auth.service.js`

- **Ngưỡng:** 5 lần đăng nhập sai liên tiếp
- **Thời gian khóa:** 15 phút
- **Fields trong NhanVien:** `failed_login_count` (Int), `locked_until` (DateTime?)
- **Reset:** Đăng nhập thành công → reset `failed_login_count = 0`, `locked_until = null`
- **HTTP Response:** 423 Locked kèm `locked_until` timestamp
- **Frontend:** `LoginView.vue` hiển thị thời gian còn lại ("Vui lòng thử lại sau X phút")

---

### S-04: JWT Revocation (token_version) ✅

**File:** `src/plugins/auth.js`, `src/services/auth.service.js`

- Thêm `token_version` (Int, default 0) vào `NhanVien`
- JWT payload chứa `tv` (token version)
- **Mỗi request:** auth plugin verify `request.user.tv === dbUser.token_version`
- **Revoke trigger:**
  - Đổi mật khẩu → `token_version++` → force re-login
  - Admin deactivate NV → `token_version++` → force logout
  - Reset password → `token_version++` → force re-login
- **Frontend:** `client.js` interceptor catch `TOKEN_REVOKED` error → redirect `/login`

---

### S-05: Single Session ✅

Kết hợp miễn phí với S-04:
- Login mới → `token_version++` → token cũ (trên thiết bị khác) tự vô hiệu
- **Không cần** Redis/session store

---

### S-07: Edit Time Limit ✅

**File:** `src/services/bien-nhan.service.js`

```js
if (userRole === 'staff') {
  const hoursSinceCreated = (Date.now() - existing.created_at) / 3600000;
  if (hoursSinceCreated > 24) {
    throw Error('Biên nhận đã quá 24 giờ. Liên hệ Admin để sửa.');
  }
}
```

Admin không bị giới hạn thời gian sửa.

---

### S-08: PDF Watermark ✅

**File:** `src/services/pdf.service.js`

Mọi PDF (Biên nhận, Phiếu thu, Phiếu chi) đều chứa watermark:
```
{NV name} — {timestamp}
```
- `opacity: 0.08` (gần như vô hình trên bản in, nhưng thấy rõ trên file digital)
- `angle: -45°`, `fontSize: 14`
- Thông tin NV lấy từ auth plugin (`request.user.ten`)

---

## III. Đề Xuất Cho Phase Tiếp Theo

| Giải pháp | Mô tả | Ưu tiên |
|---|---|:---:|
| **S-09** 2FA (TOTP) | Google Authenticator cho tài khoản Admin | 🟢 |
| **S-10** Admin Dashboard giám sát | NV online, hoạt động bất thường, log gần nhất | 🟢 |
| **S-11** Financial Checksumming | Hash SHA-256 cho `gia_cuoc`, `thu_ho`, `so_tien` | 🟢 |
| **S-12** DB Backup tự động | pg_dump + cron + cloud storage | 🟢 |

---

## IV. Ma Trận Giải Pháp vs Mục Tiêu

| Giải pháp | Bảo mật | Giám sát NV | Chống phá hoại | Trạng thái |
|---|:---:|:---:|:---:|:---:|
| **S-01** Audit Log | ⬜ | ✅✅✅ | ✅✅ | ✅ Done |
| **S-02** Login Log | ✅✅ | ✅✅ | ⬜ | ✅ Done |
| **S-03** Account Lock | ✅✅ | ⬜ | ⬜ | ✅ Done |
| **S-04** JWT Revoke | ✅✅ | ⬜ | ✅ | ✅ Done |
| **S-05** Single Session | ✅ | ✅✅ | ⬜ | ✅ Done |
| **S-07** Edit Time Limit | ⬜ | ✅✅✅ | ⬜ | ✅ Done |
| **S-08** PDF Watermark | ⬜ | ✅ | ✅ | ✅ Done |
| **S-09** 2FA | ✅✅✅ | ⬜ | ⬜ | ❌ Backlog |
| **S-10** Admin Dashboard | ⬜ | ✅✅✅ | ⬜ | ❌ Backlog |
| **S-11** Financial Hash | ⬜ | ⬜ | ✅✅✅ | ❌ Backlog |
| **S-12** DB Backup | ⬜ | ⬜ | ✅✅✅ | ❌ Backlog |
