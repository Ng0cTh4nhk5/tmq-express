# Code Review Report — TMQ Express ERP

**Ngày review:** 2026-07-01  
**Phạm vi:** Toàn bộ codebase (backend Fastify + Prisma, frontend Vue 3 + Pinia)  
**Mục tiêu:** Security, Performance, Code Quality, Bugs & Correctness  
**Phương pháp:** Automated scanning + manual review → xác minh độc lập

---

## KẾT QUẢ TỔNG QUAN

| Severity | Số lượng | Key areas |
|----------|----------|-----------|
| 🔴 **Critical** | 2 | Race condition, in-memory aggregation |
| 🟠 **High** | 6 | Missing authorization, PII exposure, error inconsistency, PDF blocking, duplicate code, batch validation |
| 🟡 **Medium** | 8 | Array limits, schema validation gaps, missing rate limit, missing indexes, silent catches, env var config, PII at rest |
| 🔵 **Low** | 7 | CSP, N+1 queries, Decimal precision, test coverage, API response envelope |

---

## 🔴 CRITICAL (cần xử lý ngay)

### C-01: Race condition trong batch auto-thu COD/Cước
- **File:** `backend/src/routes/bien-nhan.routes.js:795-842`
- **Vấn đề:** Khi `PATCH /batch-trang-thai` với `trang_thai = 'khach_da_nhan'`, vòng lặp `for (const bn of codBNs)` gọi `xacNhanThuCODAuto()` từng cái — mỗi cái là một transaction riêng. Nếu 2 request batch chạy đồng thời trên cùng BN, có thể double-thu hoặc data corruption.
- **Risk:** Mất tiền (double refund) hoặc inconsistent state
- **Khuyến nghị:** 
  1. Wrap toàn bộ auto-thu loop trong 1 transaction lớn
  2. Thêm pessimistic lock (`SELECT ... FOR UPDATE`) hoặc dùng Prisma `updateMany` với `where` kèm state check
  3. Dùng queue (Bull/BullMQ) để serialize batch operations

### C-02: In-memory aggregation không giới hạn
- **File:** `backend/src/services/cong-no.service.js` — function `bangKeCongNoTheoThang()`
- **Vấn đề:** Load ALL `congNo` records của một tháng và group bằng JS loop. Không có `take`/`limit`. Với 1 tháng dữ liệu logistics company, có thể 10.000+ records. Function `doiSoatCuoc()` cũng cùng pattern.
- **Risk:** OOM crash, slow response > 30s timeout
- **Khuyến nghị:** 
  1. Chuyển sang SQL `groupBy` như `bao-cao.service.js` đã làm
  2. Thêm `take` limit trên tất cả `findMany`
  3. Thêm pagination cho các report data

---

## 🟠 HIGH

### H-01: Missing `authorize()` trên bao-cao routes
- **File:** `backend/src/routes/bao-cao.routes.js:16,32`
- **Vấn đề:** `preHandler: [fastify.authenticate]` — không gọi `authorize()`. Service layer có check `role === 'staff'` nhưng nếu thêm role mới (accountant), role đó sẽ bypass VP scope và xem tất cả dữ liệu.
- **Khuyến nghị:** Thêm `authorize(['admin', 'staff'])` vào preHandler

### H-02: KhachHang GET routes không có role check, expose PII
- **File:** `backend/src/routes/khach-hang.routes.js:6,35,51`
- **Vấn đề:** 3 GET routes chỉ có `authenticate`. Staff có thể xem toàn bộ customer data: `so_cccd` (căn cước), `dien_thoai`, `email`, `dia_chi`. Đây là PII cần bảo vệ.
- **Khuyến nghị:** 
  1. Nếu staff cần dùng → explicit authorize + documentation
  2. Filter `so_cccd` khỏi response nếu không cần thiết

### H-03: Inconsistent error handling — `doanh-nghiep.routes.js` dùng try-catch bypass error plugin
- **File:** `backend/src/routes/doanh-nghiep.routes.js:52-58,110-116,148-154,169-175`
- **Vấn đề:** try-catch → `reply.status(e.statusCode || 500).send(...)` bypasses error-handler plugin → mất translation tiếng Việt + logging cho 5xx errors
- **Khuyến nghị:** Refactor all 4 locations to use `throw` pattern

### H-04: PDF/Excel generation blocking request thread
- **File:** `backend/src/services/pdf.service.js` (1173 lines)
- **Vấn đề:** `generateSoBienNhan()` và `generateSoBienNhanExcel()` load ALL BN records matching criteria vào memory. Với request timeout 30s, monthly report có thể timeout. Không có streaming hay chunked response.
- **Khuyến nghị:** 
  1. Tách PDF generation ra worker thread (Worker Threads / Piscina)
  2. Giới hạn records per generation (max 1000)
  3. Generate async + polling endpoint để lấy kết quả

### H-05: Duplicate date/timezone boundary code
- **Files bị ảnh hưởng:**
  - `backend/src/services/bien-nhan.service.js:68-69` — inline
  - `backend/src/services/doanh-thu.service.js:58-59` — inline
  - `backend/src/services/bao-cao.service.js:6-13` — inline (có function riêng)
  - `backend/src/services/bang-ke.service.js` — inline
  - `backend/src/services/cong-no.service.js:167-168` — **đã dùng `utils/date.js`** ✅
  - `backend/src/services/pdf.service.js:16-23` — helpers riêng
- **Vấn đề:** 4 files dùng inline `new Date(from + 'T00:00:00.000+07:00')`; pdf.service.js viết helpers riêng. Tất cả nên dùng chung từ `utils/date.js`.
- **Khuyến nghị:** Migrate all về `parseStartOfDayVN()` / `parseEndOfDayVN()` từ `utils/date.js`

### H-06: Batch validation thiếu maxItems trên 3 routes
- **Files:**
  - `backend/src/routes/phieu-chuyen-cod.routes.js:43` — `bien_nhan_ids` thiếu `maxItems`
  - `backend/src/routes/thu-ho.routes.js:131` — `bien_nhan_ids` thiếu `maxItems`
  - `backend/src/routes/cuoc-nhan.routes.js:130` — `bien_nhan_ids` thiếu `maxItems`
- **Vấn đề:** Array size không giới hạn. Gửi 10000+ IDs có thể gây transaction lock contention và DoS. (So sánh: `bien-nhan.routes.js:719` đã có `maxItems: 200`)
- **Khuyến nghị:** Thêm `maxItems: 200` hoặc `maxItems: 500` cho tất cả batch routes

---

## 🟡 MEDIUM

### M-01: `resetPassword` trả về temp password dù route không dùng
- **File:** `backend/src/services/nhan-vien.service.js:169`
- **Vấn đề:** Service `resetPassword()` return `{ tempPassword }` nhưng route handler (`nhan-vien.routes.js:117`) không dùng — `await nhanVienService.resetPassword(...)` rồi tự trả message riêng. Latent bug: nếu sau này đổi thành `return await resetPassword(...)` thì leak password.
- **Khuyến nghị:** Xóa `return { tempPassword }`, chuyển thành `void` hoặc return `{ success: true }`

### M-02: Missing schema validation trên `cong-no.routes.js` GET `/doi-soat`
- **File:** `backend/src/routes/cong-no.routes.js:60-68`
- **Vấn đề:** Route này không có `schema` block. Query params `doi_tuong`, `thang`, `nam` không được validate type hay format. Cũng không có `additionalProperties: false`.
- **Khuyến nghị:** Thêm schema validation cho cả querystring

### M-03: `POST /auth/change-password` không có rate limit
- **File:** `backend/src/routes/auth.routes.js:78-102`
- **Vấn đề:** Chỉ global 100/min. Các endpoint sensitive khác (login: 5/min, reset-password: 5/min) đều có rate limit riêng. Change-password cũng là sensitive operation.
- **Khuyến nghị:** Thêm `config: { rateLimit: { max: 3, timeWindow: '1 minute' } }`

### M-04: `APP_PUBLIC_URL` env var không được validate
- **File:** `backend/src/services/pdf.service.js:103` (usage); `backend/src/config/env.js` (missing)
- **Vấn đề:** `APP_PUBLIC_URL` dùng để tạo QR code URL nhưng không có trong env.js. Fallback về `CORS_ORIGIN` — vốn là config CORS, không phải public URL.
- **Khuyến nghị:** Khai báo `APP_PUBLIC_URL` trong `env.js` với validation URL format

### M-05: Thiếu index `created_at` trên `LichSuTrangThai`
- **File:** `backend/prisma/schema.prisma:441-442`
- **Vấn đề:** Index hiện có: `bien_nhan_id`, `nhan_vien_id`. Thiếu `@@index([created_at])` — query `orderBy: { created_at: 'desc' }` phổ biến trên bảng này sẽ slow.
- **Khuyến nghị:** Thêm `@@index([created_at])`

### M-06: Silent catch trên login log
- **File:** `backend/src/services/auth.service.js:30,45,69,93`
- **Vấn đề:** `.catch(() => {})` trên login log writes. Mất khả năng phát hiện sớm sự cố DB/audit. Mặc dù intentional ("Không block login flow"), nhưng cần warning log trong dev mode.
- **Khuyến nghị:** Thêm ít nhất `console.warn('[AuthLog]', err.message)` ở dev mode

### M-07: Silent catch trên frontend badge polling
- **File:**
  - `frontend/src/stores/hang-den.store.js:31-33`
  - `frontend/src/stores/thu-ho.store.js`, `cuoc-nhan.store.js` (same pattern)
- **Vấn đề:** `catch() { // Silent fail }` — không có logging ở bất kỳ mode nào. Khó debug khi production gặp vấn đề badge polling.
- **Khuyến nghị:** `catch(() => { if (import.meta.env.DEV) console.warn('[Badge]', err) })`

### M-08: PII (so_cccd) lưu plaintext trong database
- **Model:** `KhachHang.so_cccd`, `BienNhan.so_cccd_gui`, `BienNhan.so_cccd_nhan`
- **Vấn đề:** Số căn cước công dân lưu plaintext, trả về trong API responses và hiển thị trên PDF. Theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, đây là dữ liệu nhạy cảm.
- **Khuyến nghị:** 
  1. Encrypt ở DB level (PostgreSQL `pgcrypto`) hoặc application-level
  2. Mask `so_cccd` trong API response (chỉ trả 4 số cuối)

---

## 🔵 LOW / SUGGESTION

### L-01: Missing `additionalProperties: false` trên 2 routes
- **Files:**
  - `backend/src/routes/van-phong.routes.js:27` — POST body không có
  - `backend/src/routes/doanh-thu.routes.js:7-16` — GET querystring không có
- **Khuyến nghị:** Thêm `additionalProperties: false`

### L-02: No Content-Security-Policy trên frontend
- **Khuyến nghị:** Thêm CSP header qua `vite-plugin-html` hoặc reverse proxy. Backend đã có CSP strict nhưng frontend thì không.

### L-03: N+1 trong `createBienNhan`
- **File:** `backend/src/services/bien-nhan.service.js:298-299`
- **Vấn đề:** Hai `findUnique` riêng cho `vanPhong` trước transaction — có thể gộp thành 1 `findMany` với `in` clause.
- **Khuyến nghị:** Gộp thành `prisma.vanPhong.findMany({ where: { id: { in: [guiId, nhanId] } } })`

### L-04: Decimal conversion precision risk
- **Pattern:** `Number(bn.gia_cuoc || 0)` trong nhiều services
- **Vấn đề:** Prisma Decimal → JavaScript Number mất precision cho giá trị > 2^53 (~9 triệu tỷ). Low risk cho cước vận chuyển.
- **Khuyến nghị:** Dùng thư viện `decimal.js` cho các phép tính tài chính

### L-05: No test coverage cho service layer
- **Vấn đề:** Không có unit test cho service functions, đặc biệt là financial operations (thu COD, chuyển cước, đối soát công nợ). Chỉ có e2e test cơ bản.
- **Khuyến nghị:** Viết integration test cho các financial transaction flows

### L-06: No centralized API response envelope
- **Vấn đề:** Mỗi route tự construct response shape (`{success, data}`, `{success, ...result}`, `{success, data, message}`). Không đồng nhất.
- **Khuyến nghị:** Tạo reply helper: `reply.success(data)`, `reply.created(data)`, `reply.error(status, code, message)`

### L-07: Frontend route navigation guard race condition
- **File:** `frontend/src/router/index.js:87-89`
- **Vấn đề:** `await authStore.fetchProfile()` được gọi mỗi lần navigation nếu `!authStore.user`. Nếu user click nhanh nhiều link, fetchProfile được gọi nhiều lần đồng thời.
- **Khuyến nghị:** Thêm loading state hoặc deduplicate profile fetch

---

## ACTION CHECKLIST

### Security

- [ ] **C-01** Thêm pessimistic lock / transaction wrap cho batch auto-thu COD (`bien-nhan.routes.js`)
- [ ] **H-01** Thêm `authorize(['admin', 'staff'])` vào `bao-cao.routes.js`
- [ ] **H-02** `khach-hang.routes.js`: add role guard hoặc filter PII fields
- [ ] **M-01** Xóa `return { tempPassword }` khỏi `nhan-vien.service.js:169`
- [ ] **M-03** Thêm rate limit (3/min) cho `change-password` endpoint
- [ ] **M-04** Khai báo `APP_PUBLIC_URL` trong `config/env.js` với URL validation
- [ ] **M-08** Encrypt `so_cccd` fields trong database hoặc mask trong API response
- [ ] **L-01** Thêm `additionalProperties: false` vào `van-phong.routes.js:27` và `doanh-thu.routes.js:7-16`
- [ ] **L-02** Thêm CSP header trên frontend

### Performance

- [ ] **C-02** Chuyển JS group-by thành SQL groupBy trong `cong-no.service.js`
- [ ] **C-02** Thêm `take` limit cho tất cả `findMany` trong `cong-no.service.js`
- [ ] **H-04** Tách PDF generation ra worker thread
- [ ] **H-04** Giới hạn records per PDF generation (max 1000)
- [ ] **M-05** Thêm `@@index([created_at])` vào `schema.prisma` — model `LichSuTrangThai`
- [ ] **L-03** Gộp 2 `findUnique` thành 1 `findMany` trong `bien-nhan.service.js:298-299`
- [ ] Cân nhắc thêm Redis cache cho dashboard badges (polling 60s)

### Code Quality

- [ ] **H-03** Refactor `doanh-nghiep.routes.js`: bỏ try-catch, dùng `throw Object.assign(new Error(...))`
- [ ] **H-05** Migrate date boundary → dùng `parseStartOfDayVN`/`parseEndOfDayVN` từ `utils/date.js`
  - `bien-nhan.service.js:68-69`
  - `doanh-thu.service.js:58-59`
  - `bao-cao.service.js:6-13`
  - `bang-ke.service.js`
- [ ] **M-02** Thêm schema validation cho `cong-no.routes.js` GET `/doi-soat`
- [ ] **M-06** Thêm warning log cho silent catch trong `auth.service.js` (dev mode)
- [ ] **M-07** Thêm warning log cho silent catch trong frontend stores (dev mode)
- [ ] **L-06** Tạo reply helper `success()`, `error()`, `created()` cho response envelope
- [ ] **L-07** Thêm deduplication cho `fetchProfile()` trong router guard

### Hàng loạt: Batch routes validation

- [ ] **H-06** `phieu-chuyen-cod.routes.js:43` — thêm `maxItems: 200`
- [ ] **H-06** `thu-ho.routes.js:131` — thêm `maxItems: 200`
- [ ] **H-06** `cuoc-nhan.routes.js:130` — thêm `maxItems: 200`

### Testing

- [ ] **L-05** Viết integration test cho:
  - Thu COD flow (`xacNhanThuCOD`, `xacNhanNhanTuChanh`)
  - Chuyển cước flow (`createPhieuChuyenCuoc`, `xacNhanNhanCuoc`)
  - Công nợ flow (`xacNhanThanhToan`, `doiSoatCuoc`)
  - Batch trang-thai (race condition test)
  - Concurrent create BN (ma-so generation test)

---

## THỐNG KÊ FILE ẢNH HƯỞNG

### Backend files cần sửa (16 files)

| File | Findings | Priority |
|------|----------|----------|
| `backend/src/routes/bien-nhan.routes.js` | C-01 (batch race condition), H-06 (maxItems) | 🔴 + 🟡 |
| `backend/src/services/cong-no.service.js` | C-02 (in-memory aggregation) + M-02 (schema) | 🔴 + 🟡 |
| `backend/src/services/nhan-vien.service.js` | M-01 (return tempPassword) | 🟡 |
| `backend/src/services/doanh-thu.service.js` | H-05 (date boundary) | 🟠 |
| `backend/src/services/bien-nhan.service.js` | H-05 (date) + L-03 (N+1) | 🟠 + 🔵 |
| `backend/src/services/bao-cao.service.js` | H-05 (date boundary) | 🟠 |
| `backend/src/services/bang-ke.service.js` | H-05 (date boundary) | 🟠 |
| `backend/src/routes/bao-cao.routes.js` | H-01 (missing authorize) | 🟠 |
| `backend/src/routes/khach-hang.routes.js` | H-02 (PII exposure) | 🟠 |
| `backend/src/routes/doanh-nghiep.routes.js` | H-03 (error handling) | 🟠 |
| `backend/src/routes/phieu-chuyen-cod.routes.js` | H-06 (maxItems) | 🟠 |
| `backend/src/routes/thu-ho.routes.js` | H-06 (maxItems) | 🟠 |
| `backend/src/routes/cuoc-nhan.routes.js` | H-06 (maxItems) | 🟠 |
| `backend/src/routes/auth.routes.js` | M-03 (rate limit) | 🟡 |
| `backend/src/config/env.js` | M-04 (APP_PUBLIC_URL) | 🟡 |
| `backend/src/services/auth.service.js` | M-06 (silent catch) | 🟡 |
| `backend/prisma/schema.prisma` | M-05 (missing index) | 🟡 |
| `backend/src/services/pdf.service.js` | H-04 (PDF blocking) | 🟠 |
| `backend/src/routes/van-phong.routes.js` | L-01 (additionalProperties) | 🔵 |
| `backend/src/routes/doanh-thu.routes.js` | L-01 (additionalProperties) | 🔵 |
| `backend/src/routes/cong-no.routes.js` | M-02 (missing schema) | 🟡 |

### Frontend files cần sửa (3 files)

| File | Findings | Priority |
|------|----------|----------|
| `frontend/src/stores/hang-den.store.js` | M-07 (silent catch) | 🟡 |
| `frontend/src/stores/thu-ho.store.js` | M-07 (silent catch) | 🟡 |
| `frontend/src/stores/cuoc-nhan.store.js` | M-07 (silent catch) | 🟡 |
| `frontend/src/router/index.js` | L-07 (race condition) | 🔵 |

---

## ĐIỂM MẠNH CỦA DỰ ÁN

1. **JWT auth với token_version (S-04)** — logout và force re-login hoạt động đúng
2. **Route schema validation** — `additionalProperties: false` được áp dụng rộng rãi (80%+ routes)
3. **Error handler plugin** — dịch lỗi sang tiếng Việt, không leak stack trace
4. **VP-scope enforcement** — service layer kiểm tra staff chỉ thấy VP mình
5. **`createWithCode` với retry on P2002** — atomic code generation
6. **Transaction wrapping** — trên hầu hết financial operations (thu COD, chuyển cước)
7. **Audit log** — ghi lại tất cả CREATE/UPDATE operations
8. **Granular state machine** — validation theo context (chanh, hinh_thuc_giao, VP)
9. **Production safety checks** — env.js kiểm tra JWT_SECRET, CORS, host binding khi production

---

## RỦI RO KIẾN TRÚC

1. **Không có caching layer** — mọi request đều hit DB. Badge polling mỗi 60s tạo redundant queries.
2. **Không có message queue** — financial operations (batch auto-thu) không được queue, dễ race condition.
3. **Service layer không có unit tests** — financial transaction flows (COD, cuoc, cong-no) không có regression protection.
4. **Response envelope không chuẩn hóa** — 3-4 pattern khác nhau cho success responses.
5. **No TypeScript** — dù không bắt buộc, nhưng với complex domain như logistics ERP, TS giúp tránh runtime errors.
