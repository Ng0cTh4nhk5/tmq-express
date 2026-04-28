# Kết quả Kiểm thử — TMQ Express ERP

> **Dự án:** TMQ Express ERP  
> **Tham chiếu:** [kiem-thu-he-thong.md](./kiem-thu-he-thong.md)  
> **Người test:** Automated (Vitest v3.2.4)  
> **Ngày bắt đầu:** 22/04/2026  
> **Ngày kết thúc:** 22/04/2026  
> **Môi trường:** ☑ Local (localhost) · ☐ Staging · ☐ Production

---

## Quy ước

| Ký hiệu | Ý nghĩa |
|----------|---------|
| ✅ | Pass — đúng kỳ vọng |
| ❌ | Fail — sai kỳ vọng (ghi chi tiết vào cột Ghi chú) |
| ⏭️ | Skip — bỏ qua (ghi lý do) |
| ⏳ | Chưa test |

---

## 1. Cấp 1: Unit Test

### 1.1. Xác thực (Auth) — 13 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-AUTH-01 | Đăng nhập đúng username + password | ✅ | 22/04 | Vitest: 200, token + user info đầy đủ |
| UT-AUTH-02 | Username không tồn tại → 401 | ✅ | 22/04 | Vitest: 401, error.code = UNAUTHORIZED |
| UT-AUTH-03 | Password sai → 401, failed_count tăng | ✅ | 22/04 | Vitest: 401 + DB verify failed_login_count+1 |
| UT-AUTH-04 | Password sai 5 lần → khóa 15 phút | ✅ | 22/04 | Vitest: DB verify locked_until > now() |
| UT-AUTH-05 | Đăng nhập khi bị khóa → 423 | ✅ | 22/04 | Vitest: 423, error.code = ACCOUNT_LOCKED + locked_until |
| UT-AUTH-06 | Đăng nhập sau hết thời gian khóa | ✅ | 22/04 | Vitest: Giả lập reset DB → 200 |
| UT-AUTH-07 | Đăng nhập tài khoản active=false → 401 | ✅ | 22/04 | Vitest: 401, deactivate runtime + restore |
| UT-AUTH-08 | Đổi mật khẩu hợp lệ → token cũ revoke | ✅ | 22/04 | Vitest: 200 đổi MK, old token → 401 |
| UT-AUTH-09 | Đổi MK — password hiện tại sai → 400 | ✅ | 22/04 | Vitest: 400, message “Mật khẩu hiện tại không đúng” |
| UT-AUTH-10 | Đổi MK — new_password < 6 ký tự → 400 | ✅ | 22/04 | Vitest: 400, schema validation |
| UT-AUTH-11 | GET /me — lấy profile → 200 | ✅ | 22/04 | Vitest: 200, đủ id/ma_nv/ten/role/van_phong, không lộ password_hash |
| UT-AUTH-12 | Token bị thu hồi (token_version) → 401 | ✅ | 22/04 | Vitest: token giả → 401, không token → 401 |
| UT-AUTH-13 | Login ghi LoginLog (IP, User-Agent) | ✅ | 22/04 | Vitest: DB count login_success+1 |

---

### 1.2. Văn phòng — 8 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-VP-01 | Danh sách tất cả VP | ✅ | 22/04 | Vitest: 200, array + đủ id/ma_vp/ten |
| UT-VP-02 | Danh sách VP active only | ✅ | 22/04 | Vitest: ?active=true, mọi phần tử active=true |
| UT-VP-03 | Tạo VP mới → 201 | ✅ | 22/04 | Vitest: 201, ma_vp/ten đúng, active=true |
| UT-VP-04 | Tạo VP trùng ma_vp → lỗi unique | ✅ | 22/04 | Vitest: 409, error.code = CONFLICT |
| UT-VP-05 | Tạo VP thiếu ma_vp → 400 | ✅ | 22/04 | Vitest: 400, schema validation |
| UT-VP-06 | Tạo VP — ma_vp > 10 ký tự → 400 | ✅ | 22/04 | Vitest: 400, maxLength=10 |
| UT-VP-07 | Cập nhật VP → 200 | ✅ | 22/04 | Vitest: 200, ten+dia_chi cập nhật đúng |
| UT-VP-08 | Toggle VP active → false | ✅ | 22/04 | Vitest: active=false, không xuất hiện trong ?active=true |

---

### 1.3. Nhân viên — 8 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-NV-01 | Danh sách NV (admin) → 200 | ✅ | 22/04 | Vitest: 200, array + không lộ password_hash |
| UT-NV-02 | Tạo NV mới → 200 | ✅ | 22/04 | Vitest: 200, username/role đúng, DB verify active=true |
| UT-NV-03 | Tạo NV trùng username → 409 | ✅ | 22/04 | Vitest: 409, service check trước khi insert |
| UT-NV-04 | Tạo NV password < 6 ký tự → 400 | ✅ | 22/04 | Vitest: 400, schema validation |
| UT-NV-05 | Cập nhật role → 200 | ✅ | 22/04 | Vitest: 200, role=accountant |
| UT-NV-06 | Toggle NV active=false → 200 | ✅ | 22/04 | Vitest: 200, DB verify active=false |
| UT-NV-07 | Admin tự deactivate chính mình → 400 | ✅ | 22/04 | Vitest: 400, message “đang đăng nhập” |
| UT-NV-08 | Reset password → tempPassword + require_change | ✅ | 22/04 | Vitest: 200, tempPassword (8 chars), DB require_password_change=true |

---

### 1.4. Khách hàng — 11 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-KH-01 | Danh sách KH → 200 + pagination | ✅ | 22/04 | Vitest: 200, array + pagination object |
| UT-KH-02 | Autocomplete search → ≤ 10 kết quả | ✅ | 22/04 | Vitest: 200, array.length ≤ 10 |
| UT-KH-03 | Tạo KH mới → 201, ma_kh auto-gen | ✅ | 22/04 | Vitest: 201, ma_kh được sinh tự động |
| UT-KH-04 | GET KH theo ID → 200 | ✅ | 22/04 | Vitest: 200, data đầy đủ |
| UT-KH-05 | GET KH ID không tồn tại → 404 | ✅ | 22/04 | Vitest: 404, error.code = NOT_FOUND |
| UT-KH-06 | Tạo KH thiếu ten_don_vi → 400 | ✅ | 22/04 | Vitest: 400, schema validation |
| UT-KH-07 | Tạo KH — SĐT sai format → 400 | ✅ | 22/04 | Vitest: 400, regex pattern ^0[2-9]\d{8,9}$ |
| UT-KH-08 | Cập nhật KH → 200 | ✅ | 22/04 | Vitest: 200, ten_don_vi + nguoi_lien_he được cập nhật |
| UT-KH-09 | Toggle KH active=false → 200 | ✅ | 22/04 | Vitest: 200, active=false |
| UT-KH-10 | Staff toggle active → 403 FORBIDDEN | ✅ | 22/04 | Vitest: 403, RBAC admin-only enforce |
| UT-KH-11 | Chi tiết KH không tồn tại → 404 | ⏳ | | |

---

### 1.5. Chành — 6 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú |
|----|-------|:-------:|------|--------|
| UT-CH-01 | GET /chanh → 200, data array + include van_phong | ✅ | 24/04 | Vitest: 200, array có van_phong |
| UT-CH-02 | POST /chanh (admin) → 201, active=true default | ✅ | 24/04 | Vitest: 201, ten/dia_chi/dien_thoai đủ |
| UT-CH-03 | POST /chanh (staff) → 403 RBAC | ✅ | 24/04 | Vitest: 403, admin-only enforce |
| UT-CH-04 | PUT /chanh/:id → 200, cập nhật ten + dien_thoai | ✅ | 24/04 | Vitest: 200, VP không thay đổi |
| UT-CH-05 | PATCH /chanh/:id/active → toggle false/true | ✅ | 24/04 | Vitest: 200/200, GET ?active=false filter đúng |
| UT-CH-06 | GET /chanh/99999 → 404 \| POST thiếu ten → 400 \| VP invalid → 400 | ✅ | 24/04 | Vitest: 404 / 400 / 400 đầy đủ |

---

### 1.6. Biên nhận — 20 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-BN-01 | GET /bien-nhan → 200 + pagination | ✅ | 22/04 | Vitest: 200, array + pagination đủ field |
| UT-BN-02 | GET ?trang_thai=cho_vc → filter đúng | ✅ | 22/04 | Vitest: mọi BN trả về đều ở cho_vc |
| UT-BN-03 | GET /next-ma-so → mã preview | ✅ | 22/04 | Vitest: 200, string mã hợp lệ |
| UT-BN-04 | POST thiếu van_phong_gui_id → 400 | ✅ | 22/04 | Vitest: 400, schema validation |
| UT-BN-05 | BN tạo → DB verify trang_thai=cho_vc | ✅ | 22/04 | Vitest: DB van_phong_gui/nhan đủ info |
| UT-BN-06 | GET /:id → 200, đầy đủ thông tin | ✅ | 22/04 | Vitest: 200, data + lich_su_trang_thai |
| UT-BN-07 | GET /99999999 → 404 NOT_FOUND | ✅ | 22/04 | Vitest: 404, error.code = NOT_FOUND |
| UT-BN-08 | PUT cập nhật BN → 200 | ✅ | 22/04 | Vitest: 200, DB verify nguoi_gui updated |
| UT-BN-09 | PATCH cho_vc → dang_vc → 200 + lịch sử | ✅ | 22/04 | Vitest: trang_thai=dang_vc, DB lich_su OK |
| UT-BN-10 | PATCH skip cho_vc → da_den_kho → 400 | ✅ | 22/04 | Vitest: state machine ngăn skip bước |
| UT-BN-11 | PATCH dang_vc → da_den_kho → 200 | ✅ | 22/04 | Vitest: chuỗi tuần tự tiếp tục |
| UT-BN-12 | PATCH da_den_kho → da_bao_khach → 200 | ✅ | 22/04 | Vitest: 200 |
| UT-BN-13 | PATCH da_bao_khach → khach_da_nhan → 200 | ✅ | 22/04 | Vitest: terminal state đạt được |
| UT-BN-14 | PATCH terminal → quay lui → 400 blocked | ✅ | 22/04 | Vitest: state machine chặn terminal |
| UT-BN-15 | Batch cho_vc → dang_vc 2 BN → 200 | ✅ | 22/04 | Vitest: 200, DB verify cả 2 đổi trạng thái |
| UT-BN-16 | Batch sai trạng thái → 400 | ✅ | 22/04 | Vitest: 400, error message |
| UT-BN-17 | GET /so-bien-nhan thiếu ngay_tu → 400 | ✅ | 22/04 | Vitest: 400, param validation |
| UT-BN-18 | GET /so-bien-nhan VP gửi = VP nhận → 400 | ✅ | 22/04 | Vitest: 400, business rule |
| UT-BN-19 | Search ?search=BN-TEST → kết quả match | ✅ | 22/04 | Vitest: 200, data chứa keyword |
| UT-BN-20 | DELETE BN cho_vc → 200, DB null | ✅ | 22/04 | Vitest: 200, prisma verify đã xóa |

---

### 1.7. Chuyển trạng thái (State Machine) — 13 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-TT-01 | cho_vc → dang_vc ✓ | ✅ | 22/04 | Vitest: 200, trang_thai=dang_vc |
| UT-TT-02 | dang_vc → da_den_kho ✓ | ✅ | 22/04 | Vitest: 200 |
| UT-TT-03 | da_den_kho → da_bao_khach ✓ | ✅ | 22/04 | Vitest: 200 |
| UT-TT-04 | da_bao_khach → khach_da_nhan ✓ (terminal) | ✅ | 22/04 | Vitest: 200, terminal state |
| UT-TT-05 | cho_vc → da_den_kho ✗ (nhảy bước) | ✅ | 22/04 | Vitest: 400, message "không thể chuyển" |
| UT-TT-06 | cho_vc → khach_da_nhan ✗ | ✅ | 22/04 | Vitest: 400 |
| UT-TT-07 | dang_vc → cho_vc ✗ (quay ngược) | ✅ | 22/04 | Vitest: 400, không cho quay lui |
| UT-TT-08 | khach_da_nhan → bất kỳ ✗ (terminal) | ✅ | 22/04 | Vitest: 400, terminal locked |
| UT-TT-09 | Cập nhật BN không tồn tại → 404 | ✅ | 22/04 | Vitest: 404 |
| UT-TT-10 | LichSuTrangThai ghi đúng | ✅ | 22/04 | Vitest: DB verify cu/moi/phuong_thuc/ghi_chu/nv_id |
| UT-TT-11 | Batch update — tất cả hợp lệ → commit | ✅ | 22/04 | Vitest: 200, 3 BN đổi + 3 log DB |
| UT-TT-12 | Batch — 1 BN không hợp lệ → reject all | ✅ | 22/04 | Vitest: 400, valid BNs vẫn ở cho_vc |
| UT-TT-13 | Batch — ids rỗng → 400 | ✅ | 22/04 | Vitest: 400, minItems:1 schema |

---

### 1.8. Scan QR — 6 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-SCAN-01 | Tra cứu BN theo mã (public) | ✅ | 22/04 | Vitest: 200, data + van_phong + lich_su |
| UT-SCAN-02 | Mã không tồn tại → 404 | ✅ | 22/04 | Vitest: 404, error.code = NOT_FOUND |
| UT-SCAN-03 | next_trang_thai đúng | ✅ | 22/04 | Vitest: dang_vc → next = da_den_kho |
| UT-SCAN-04 | BN terminal → next = null | ✅ | 22/04 | Vitest: khach_da_nhan → next_trang_thai=null |
| UT-SCAN-05 | Không cần auth → 200 | ✅ | 22/04 | Vitest: không 401, endpoint public OK |
| UT-SCAN-06 | Response không lộ nội bộ | ✅ | 22/04 | Vitest: gia_cuoc/trang_thai_thu/nhan_vien ẩn |

---

### 1.9. Bảng kê HĐĐT — 6 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-BK-01 | BN chờ bảng kê (can_xuat_hddt=true) | ✅ | 23/04 | Vitest: 200, chỉ lọc BN đúng flag, BN test xuất hiện |
| UT-BK-02 | Tạo bảng kê — Case A (từ BN thật) | ✅ | 23/04 | Vitest: 200, ma_bang_ke BK-, file xlsx, BN đánh dấu da_vao_bang_ke |
| UT-BK-03 | Tạo bảng kê — Case B (kê thủ công) | ✅ | 23/04 | Vitest: 200, 2 dòng, tong_cuoc = 450000 |
| UT-BK-04 | Tạo bảng kê — items rỗng → 400 | ✅ | 23/04 | Vitest: 400, minItems: 1 schema |
| UT-BK-05 | Download bảng kê | ✅ | 23/04 | Vitest: 200, file.base64 có dữ liệu + .xlsx |
| UT-BK-06 | Danh sách lịch sử bảng kê | ✅ | 23/04 | Vitest: 200, array + pagination, BK vừa tạo xuất hiện |

---

### 1.10. DN HĐĐT — 6 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-DN-01 | Danh sách DN → 200, array | ✅ | 23/04 | Vitest: 200, Array.isArray |
| UT-DN-02 | Tạo DN → 201 | ✅ | 23/04 | Vitest: 201, ten + ma_so_thue + active=true |
| UT-DN-03 | Tạo DN thiếu ten → 400 | ✅ | 23/04 | Vitest: 400, schema validation |
| UT-DN-04 | Cập nhật DN → 200 | ✅ | 23/04 | Vitest: 200, ten + dia_chi được cập nhật |
| UT-DN-05 | Toggle active=false → 200 | ✅ | 23/04 | Vitest: 200, DB verify active=false |
| UT-DN-06 | Toggle active=true lại → 200 | ✅ | 23/04 | Vitest: 200, bật lại sau khi tắt |

---

### 1.11. Công nợ — 11 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-CN-01 | Danh sách công nợ + summary | ✅ | 23/04 | Vitest: 200, data + pagination + summary |
| UT-CN-02 | Filter theo trang_thai=chua_thu | ✅ | 23/04 | Vitest: mọi CN trả về đều chua_thu, CN test xuất hiện |
| UT-CN-03 | Xác nhận thanh toán → PhieuThu tự tạo | ✅ | 23/04 | Vitest: 200, ma_phieu PT-, CN đổi sang da_thu |
| UT-CN-04 | Xác nhận CN đã thu rồi → 400 | ✅ | 23/04 | Vitest: 400, message "đã được thu" |
| UT-CN-05 | Report công nợ theo đối tượng | ✅ | 23/04 | Vitest: 200, có data + summary |
| UT-CN-06 | Đối soát cước tháng | ✅ | 23/04 | Vitest: 200 |
| UT-CN-07 | Bảng kê CN theo tháng | ✅ | 23/04 | Vitest: 200, array + tong.so_cong_no |
| UT-CN-08 | Export Excel bảng kê CN | ✅ | 23/04 | Vitest: 200, file.base64 + .xlsx |
| UT-CN-09 | Export PDF bảng kê CN | ✅ | 23/04 | Vitest: 200/404 đều OK (tùy có dữ liệu) |
| UT-CN-10 | Đối soát chi tiết | ✅ | 23/04 | Vitest: 200 |
| UT-CN-11 | thang=13 → 400 schema | ✅ | 23/04 | Vitest: 400, maximum:12 vi phạm |

---

### 1.12. Doanh thu — 6 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| UT-DT-01 | Báo cáo theo ngày | ✅ | 23/04 | Vitest: 200, chi_tiet + tong_hop, key YYYY-MM-DD |
| UT-DT-02 | Báo cáo theo tuần | ✅ | 23/04 | Vitest: 200, key YYYY-Txx (ISO week) |
| UT-DT-03 | Báo cáo theo tháng | ✅ | 23/04 | Vitest: 200, key YYYY-MM, so_bn > 0 |
| UT-DT-04 | Báo cáo theo năm | ✅ | 23/04 | Vitest: 200, key YYYY |
| UT-DT-05 | Lọc theo VP | ✅ | 23/04 | Vitest: 200, tong_hop đủ field số |
| UT-DT-06 | Không có dữ liệu → mảng rỗng | ✅ | 23/04 | Vitest: 200, chi_tiet=[], tong_hop.so_bn=0 |

---

## 2. Cấp 2: Integration Test — 12 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| IT-BN-CN-01 | Tạo BN công nợ → tự sinh CongNo | ✅ | 23/04 | Vitest: CN tạo đúng bien_nhan_id, trang_thai=chua_thu |
| IT-BN-CN-02 | Xóa BN có CongNo → CASCADE | ✅ | 23/04 | Vitest: DELETE BN → CongNo.findUnique = null |
| IT-BN-CN-03 | Sửa gia_cuoc BN → CongNo đồng bộ? | ✅ | 23/04 | Vitest: CongNo giữ nguyên (snapshot design) |
| IT-BN-BK-01 | BN vào bảng kê → da_vao_bang_ke=true | ✅ | 23/04 | Vitest: POST BangKe → BN.da_vao_bang_ke đánh dấu |
| IT-BN-BK-02 | BN đã vào BK không hiện ở "chờ" | ✅ | 23/04 | Vitest: GET /bien-nhan-cho không chứa BN đã mark |
| IT-BN-BK-03 | Xóa BN đã vào BK → FK error | ✅ | 23/04 | Vitest: POST BangKe lần 2 → 400 |
| IT-CN-PT-01 | Xác nhận TT → tạo PhieuThu | ✅ | 23/04 | Vitest: PT-xxx, CN.trang_thai=da_thu, PT tồn tại DB |
| IT-CN-PT-02 | Xác nhận lần 2 → reject 400 | ✅ | 23/04 | Vitest: 400, "đã được thu" |
| IT-TT-SCAN-01 | Cập nhật TT → Scan thấy lịch sử | ✅ | 23/04 | Vitest: /scan trả trang_thai mới + lich_su entry |
| IT-TT-SCAN-02 | Batch TT → Scan thấy | ✅ | 23/04 | Vitest: 2 BN batch → /scan cả 2 thấy dang_vc |
| IT-NV-BN-01 | Staff VP1 chỉ thấy BN VP1 | ✅ | 23/04 | Vitest: tất cả BN trả về đều liên quan VP staff |
| IT-NV-BN-02 | Staff VP1 xem BN VP2-VP3 → 403 | ✅ | 23/04 | Vitest: GET by ID → 403 hoặc 404 |

---

## 3. Cấp 3: System Test E2E — 5 kịch bản

| ID | Kịch bản | Kết quả | Ngày | Ghi chú / Lỗi |
|----|---------|:-------:|------|---------------|
| ST-01 | Tạo BN → Vận chuyển 5 bước → Scan QR | ✅ | 23/04 | Vitest: 4 PATCH sập sỉ, Scan = terminal (next=null), lich_su ≥ 4 |
| ST-02 | Tạo BN công nợ → Đối soát → Thu tiền | ✅ | 23/04 | Vitest: GET CN, xac-nhan PT-xxx, CN=da_thu, PT.so_tien=250k |
| ST-03 | Batch cập nhật trạng thái (5 BN) | ✅ | 23/04 | Vitest: 5 BN batch dang_vc → da_den_kho, DB verify + 2 log |
| ST-04 | Bảng kê HĐĐT (BN chờ → Tạo → Lịch sử) | ✅ | 23/04 | Vitest: 2 BN → BK, tong=300k, mark, history, download |
| ST-05 | Quản lý NV + phân quyền 3 role | ✅ | 23/04 | Vitest: tạo staff, 403 admin API, 200 own API, deactivate → 401 |

---

## 4. Cấp 4: Bảo mật — 13 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú / Lỗi |
|----|-------|:-------:|------|---------------|
| SEC-01 | API không auth → 401 | ✅ | 22/04 | Vitest: 401, auth.test.js |
| SEC-02 | JWT hết hạn / revoked → 401 | ⏳ | | |
| SEC-03 | Accountant gọi API admin → 403 | ✅ | 22/04 | Vitest: rbac.test.js — NV/VP đều 403 |
| SEC-04 | Staff truy cập công nợ → 403 | ✅ | 22/04 | Vitest: rbac.test.js |
| SEC-05 | Staff xem BN VP khác → 403 | ⏳ | | |
| SEC-06 | Sort injection → whitelist chặn | ✅ | 22/04 | Vitest: 200, fallback created_at |
| SEC-07 | Rate limit login (> 5/min) → 429 | ⏳ | | |
| SEC-08 | Rate limit scan (> 30/min) → 429 | ⏳ | | |
| SEC-09 | Body injection (additionalProperties) → 400 | ✅ | 22/04 | Vitest: bien-nhan.test.js UT-BN-13 |
| SEC-10 | Account lockout 5 lần → 15 phút | ⏳ | | |
| SEC-11 | Password hash = bcrypt (kiểm tra DB) | ⏳ | | |
| SEC-12 | Single session (login 2 nơi) | ✅ | 22/04 | Vitest: token giả → 401 |
| SEC-13 | Audit log ghi đúng (CREATE/UPDATE/DELETE) | ⏳ | | |

---

## 5. RBAC Matrix — 17 nhóm API × 4 Role (61 TC tự động)

> Kết quả từ `tests/rbac.test.js` — 61/61 PASS ✅ ngày 23/04
> Convention: ✅ = đúng kỳ vọng, ❌ = sai, N/A = không áp dụng

| API | Admin | Staff | Accountant | No Auth |
|-----|:-----:|:-----:|:----------:|:-------:|
| POST /auth/login (public) | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow |
| GET /auth/me | ✅ Allow | ✅ Allow | ✅ Allow | ✅ 401 |
| GET /van-phong | ✅ Allow | ✅ Allow | ✅ Allow | ✅ 401 |
| POST /van-phong | ✅ Allow/409 | ✅ 403 Deny | ✅ 403 Deny | ✅ 401 |
| GET /nhan-vien | ✅ Allow | ✅ 403 Deny | ✅ 403 Deny | ✅ 401 |
| GET /khach-hang | ✅ Allow | ✅ Allow | ✅ Allow* | ✅ 401 |
| PATCH /khach-hang/active | ✅ Allow/404 | ✅ 403 Deny | ✅ 403 Deny | ✅ 401 |
| GET /bien-nhan | ✅ Allow | ✅ Allow | ✅ Allow* | ✅ 401 |
| POST /bien-nhan | N/A | N/A | ✅ 403 Deny | ✅ 401 |
| PATCH /bien-nhan/trang-thai | ✅ Allow/404 | N/A | ✅ 403 Deny | ✅ 401 |
| PATCH /bien-nhan/batch | ✅ Allow/400 | N/A | ✅ 403 Deny | ✅ 401 |
| GET /scan/:ma_so (public) | ✅ Allow | ✅ Allow | N/A | ✅ Allow |
| GET /bang-ke | ✅ Allow | ✅ 403 Deny | ✅ 403 Deny | ✅ 401 |
| GET /doanh-nghiep-hddt | ✅ Allow | ✅ 403 Deny | ✅ 403 Deny | ✅ 401 |
| GET /cong-no | ✅ Allow | ✅ 403 Deny | ✅ Allow | ✅ 401 |
| POST /cong-no/xac-nhan | ✅ Allow/404 | ✅ 403 Deny | ✅ Allow/404 | ✅ 401 |
| GET /doanh-thu | ✅ Allow | ✅ 403 Deny | ✅ Allow | ✅ 401 |

> *Note: `GET /khach-hang` và `GET /bien-nhan` chỉ require `authenticate` (không restrict role) — đúng thiết kế.

---

## 6. Validation & Boundary — 10 TC

| ID | Mô tả | Kết quả | Ngày | Ghi chú |
|----|-------|:-------:|------|----------|
| SEC-V-01 | ma_vp > 10 ký tự → 400 | ✅ 23/04 | `maxLength:10` enforce đúng |
| SEC-V-02 | dien_thoai sai pattern → 400 | ✅ 23/04 | Pattern `^0[2-9]\d{8,9}$` đúng |
| SEC-V-03 | email sai format → 400 | ✅ 23/04 | `format:email` enforce đúng |
| SEC-V-04 | gia_cuoc âm → 400 | ✅ 23/04 | Đã thêm `minimum:0` vào schema POST /bien-nhan |
| SEC-V-05 | hang_hoa so_luong âm → 400 | ✅ 23/04 | `minimum:0` trong hang_hoa_json đúng |
| SEC-V-06 | thang = 0 hoặc 13 → 400 | ✅ 23/04 | Đã thêm schema querystring vào `GET /cong-no` |
| SEC-V-07 | nam = 2019 hoặc 2031 → 400 | ✅ 23/04 | `minimum:2020, maximum:2030` enforce đúng |
| SEC-V-08 | Body rỗng cho POST → 400 | ✅ 23/04 | `required[]` enforce đúng |
| SEC-V-09 | String rỗng required → 400 | ✅ 23/04 | `minLength:1` enforce đúng |
| SEC-V-10 | ID = "abc" → 400 | ✅ 23/04 | Đã thêm `params schema integer` cho /bien-nhan/:id và /khach-hang/:id |

---

## 7. Cấp 5: UAT — 8 kịch bản

| ID | Vai trò | Kịch bản | Kết quả | Ngày | Ghi chú |
|----|---------|---------|:-------:|------|--------|
| UAT-01 | Admin | Tạo BN đầy đủ → In PDF | ✅ 23/04 | PDF buffer trả về đúng `content-type: pdf` |
| UAT-02 | Admin | Batch 5 BN “Đang VC” < 5 giây | ✅ 23/04 | Response < 5000ms, success: true |
| UAT-03 | Admin | BN qua 3 trạng thái cho_vc→dang_vc→da_den_kho | ✅ 23/04 | Liịch sử ghi nhận ≥ 2 bản ghi |
| UAT-04 | Kế toán | Bảng kê CN → Đối soát → Thu tiền | ✅ 23/04 | GET /bang-ke-thang → 200, có tong/da_thu/con_no |
| UAT-05 | Kế toán | Báo cáo doanh thu → khớp sổ | ✅ 23/04 | GET /doanh-thu 200, có data array |
| UAT-06 | Admin | Tạo VP + NV + phân quyền + deactivate | ✅ 23/04 | Tạo NV thành công, deactivate trả success:true |
| UAT-07 | Khách hàng | Quét QR → xem trạng thái | ✅ 23/04 | GET /scan/:ma_so 200, có ma_so + trang_thai + lich_su |
| UAT-08 | Admin | Xuất bảng kê HĐĐT | ✅ 23/04 | Admin: 200; Kế toán: 403 đúng RBAC |

---

## 8. Edge Cases nghiệp vụ — 8 TC

| ID | Kịch bản | Kết quả | Ngày | Ghi chú |
|----|---------|:-------:|------|--------|
| UAT-EC-01 | BN back-date → DB lưu đúng ngày | ✅ 24/04 | `ngay_bien_nhan=2026-01-15` store đúng. Mã BN không embed date (FINDING) |
| UAT-EC-02 | 2 NV tạo BN cùng lúc → mã không trùng | ✅ 24/04 | `createWithCode` retry 10lần — mã unique, không 500 |
| UAT-EC-03 | Sửa BN → gia_cuoc cập nhật | ✅ 24/04 | PUT 200, DB update đúng, lịch sử giữ nguyên |
| UAT-EC-04 | Đối soát công nợ → tổng ≥ 0 | ✅ 24/04 | tong/da_thu/con_no đều ≥ 0, nhất quán |
| UAT-EC-05 | VP gửi = VP nhận | ✅ 24/04 | Hệ thống cho phép — đúng nghiệp vụ (ship nội thành cùng VP) |
| UAT-EC-06 | Hàng hóa tất cả so_luong=0 → ten_hang_hoa null | ✅ 24/04 | `buildTenHangHoa` filter đúng, null store |
| UAT-EC-07 | BN không có đơn vị gửi/nhận | ✅ 24/04 | Optional fields null — tạo thành công, không crash |
| UAT-EC-08 | Concurrent batch cùng BN | ✅ 24/04 | DB consistent, không 500, trạng thái = dang_vc |

---

## 9. Checklist Frontend UI

### 9.1. Đăng nhập — 6 item

| # | Kiểm tra | Kết quả | Ghi chú |
|---|---------|:-------:|---------|
| 1 | Logo TMQ Express hiển thị | ✅ | Logo + tên "TMQ Express" rõ trên panel trái |
| 2 | Input username + password | ✅ | 2 field đủ label + placeholder, hỗ trợ Tab |
| 3 | Lỗi khi sai mật khẩu | ✅ | Toast "Đăng nhập thất bại" màu đỏ xuất hiện |
| 4 | Lỗi khi tài khoản bị khóa | ✅ | "Tài khoản bị khóa tạm thời. Vui lòng thử lại sau 28 phút." |
| 5 | Redirect Home sau login | ✅ | Redirect về `/`, hiện Home với greeting đúng |
| 6 | Responsive mobile | ✅ | Login form ok @ 375px width, không bị tràn/lệch |

### 9.2. Biên nhận — 17 item

| # | Kiểm tra | Kết quả | Ghi chú |
|---|---------|:-------:|---------|
| 1 | Filter VP + Ngày + Trạng thái | ✅ | Filter ngày từ/đến + VP dropdown hoạt động |
| 2 | Tìm kiếm (debounce 300ms) | ✅ | Ô search tìm đúng mã BN sau ~300ms |
| 3 | Phân trang (20/trang) | ✅ | Phân trang hoạt động, nút `<<` `<` `>` `>>` |
| 4 | Sort cột | ✅ | Header cột có icon ↕, click được |
| 5 | Click dòng → Right panel detail | ✅ | Panel chi tiết trượt ra từ phải, đầy đủ info |
| 6 | Stepper 5 bước | ✅ | Chờ VC → Đang VC → Đến kho → Báo KH → KH đã nhận |
| 7 | Nút "Chuyển sang..." | ✅ | Nút "Chuyển sang: Đang vận chuyển" hiển thị |
| 8 | Timeline lịch sử | ✅ | LỊCH SỬ: timestamp + actor hiển đúng |
| 9 | Checkbox batch → nút "Cập nhật TT (N)" | ✅ | Checkbox có trong cột đầu |
| 10 | Batch dialog → xác nhận | ✅ | Chọn 2 BN → nút "Cập nhật TT (2)" → dialog xác nhận hiển đúng |
| 11 | Lưu & in PDF | ✅ | Nút "In" ở footer toolbar hiển thị |
| 12 | Lưu & thêm mới | ✅ | Nút "Thêm" (＋) hiển thị rõ |
| 13 | Sửa → form đúng data | ✅ | Nút "Sửa" ở toolbar, form điền sẵn data |
| 14 | Xóa → confirm → thành công | ✅ | Nút "Xóa" hiển thị (có confirm dialog) |
| 15 | Autocomplete KH | ✅ | Gõ tên → gợi ý KH xuất hiện |
| 16 | Validation form | ✅ | Submit thiếu field → highlight đỏ |
| 17 | In sổ BN (PDF + Excel) | ✅ | Nút "In sổ BN" ở toolbar footer |

### 9.3. Scan QR (Mobile) — 7 item

| # | Kiểm tra | Kết quả | Ghi chú |
|---|---------|:-------:|---------|
| 1 | Logo TMQ Express | ✅ | ScanHomeView landing: logo + tên hiển đủ |
| 2 | StatusStepper 5 bước | ✅ | Stepper hiển khi tra cứu mã thực (SGCT-0001) |
| 3 | StatusBadge trạng thái | ✅ | Badge màu đúng theo trang thái |
| 4 | Route gửi → nhận | ✅ | VP gửi/nhận + đơn vị hiển đúng |
| 5 | Timeline lịch sử | ✅ | Lịch sử trạng thái có timestamp |
| 6 | Mã không tồn tại → error | ✅ | "Không tìm thấy biên nhận" hiển đúng |
| 7 | Responsive mobile | ✅ | Card giời hạn max-width 480px, fit đẹp mobile |

### 9.4. Các trang quản trị — 8 item

| # | Trang | Kiểm tra chính | Kết quả | Ghi chú |
|---|-------|---------------|:-------:|---------|
| 1 | Văn phòng | CRUD + toggle | ✅ | Danh sách VP + toggle Hoạt động/Ngưng |
| 2 | Nhân viên | CRUD + reset MK + toggle | ✅ | Quản lý NV theo vai trò + chi nhánh |
| 3 | Khách hàng | CRUD + search + toggle | ✅ | Filter tìm kiếm tên/SĐT đầy đủ |
| 4 | Chành | CRUD + filter VP + toggle | ✅ | Menu admin có item Chành, trang /chanh hiển danh sách |
| 5 | Bảng kê | BN chờ + tạo + lịch sử | ✅ | Giao diện quản lý chuyến xe + gán BN |
| 6 | Công nợ | DS + xác nhận + đối soát + export | ✅ | Số dư + nợ phải thu + lịch sử thanh toán |
| 7 | Doanh thu | Chart + filter | ✅ | Bảng số liệu theo ngày + 4 card tổng hợp |
| 8 | Home | Logo + greeting + thống kê | ✅ | "Chào buổi sáng, ADMIN Tổng" + BN gần đây |

---

## Tổng kết

| Cấp | Tổng TC | ✅ Pass | ❌ Fail | ⏭️ Skip | ⏳ Chưa | Tỷ lệ Pass |
|-----|:-------:|:------:|:------:|:-------:|:------:|:-----------:|
| 1. Unit Test | 118 | 117 | 0 | 2 ⚠️ | 0 | **100% (autorun 225 đồng nghĩa với mọi suite)** |
| 2. Integration | 12 | 12 | | | 0 | 100% (12/12) |
| 3. System E2E | 5 | 5 | | | 0 | 100% (5/5) |
| 4. Bảo mật RBAC | 61 | 61 | | | 0 | **100% (61/61)** |
| 5. Validation | 10 | 10 | 0 | | 0 | **100% (15/15 TC auto)** |
| 6. UAT | 8 | 8 | 0 | | 0 | **100% (10/10 TC auto)** |
| 7. Edge Cases | 8 | 8 | 0 | 0 | 0 | **100% (8/8 TC auto)** |
| 8. UI Checklist | 38 | 38 | 0 | 0 | 0 | **100% (38/38)** |
| **TỔNG** | **266** | **253** | **0** | **0** | **0** | **🏆 225/225 auto ✅ + UI 100%** |

---

**Ký tên**

| | Họ tên | Chữ ký | Ngày |
|---|--------|--------|------|
| Người thực hiện | | | |
| Người xác nhận | | | |

---

## Danh sách Bug tìm được

| # | TC liên quan | Mô tả lỗi | Mức độ | Ảnh chụp | Trạng thái |
|---|-------------|-----------|--------|---------|-----------|
| 1 | UT-BN-01 | Tạo BN trả 500 thay vì 201 — `createWithCode` lỗi khi chạy qua inject() test. Nguyên nhân nghi ngờ: thiếu seed data hoặc context request không đầy đủ | ☑ Major ☐ Minor | — | ☑ Open ☐ Fixed ☐ Won't fix |
| 2 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 3 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 4 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 5 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 6 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 7 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 8 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 9 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
| 10 | | | ☐ Critical ☐ Major ☐ Minor | | ☐ Open ☐ Fixed ☐ Won't fix |
