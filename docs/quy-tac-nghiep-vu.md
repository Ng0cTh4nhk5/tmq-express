# TMQ Express ERP — Quy tắc Nghiệp vụ

> **Phiên bản:** 1.0  
> **Ngày cập nhật:** 02/04/2026  
> **Mục đích:** Liệt kê đầy đủ tất cả các quy tắc nghiệp vụ được cấu hình và thực thi trong phần mềm, bao gồm: ràng buộc dữ liệu, luồng trạng thái, tự động hoá, phân quyền, và quy tắc bảo mật.

---

## Mục lục

1. [Quy tắc Biên nhận](#1-quy-tắc-biên-nhận)
2. [Quy tắc Trạng thái vận chuyển](#2-quy-tắc-trạng-thái-vận-chuyển)
3. [Quy tắc Tài chính — Công nợ, Phiếu thu, Phiếu chi](#3-quy-tắc-tài-chính--công-nợ-phiếu-thu-phiếu-chi)
4. [Quy tắc Bảng kê HĐĐT](#4-quy-tắc-bảng-kê-hđđt)
5. [Quy tắc Sinh mã tự động](#5-quy-tắc-sinh-mã-tự-động)
6. [Quy tắc Phân quyền (RBAC)](#6-quy-tắc-phân-quyền-rbac)
7. [Quy tắc Quản lý Văn phòng](#7-quy-tắc-quản-lý-văn-phòng)
8. [Quy tắc Quản lý Nhân viên](#8-quy-tắc-quản-lý-nhân-viên)
9. [Quy tắc Quản lý Khách hàng](#9-quy-tắc-quản-lý-khách-hàng)
10. [Quy tắc Xác thực & Bảo mật](#10-quy-tắc-xác-thực--bảo-mật)
11. [Quy tắc Toàn vẹn dữ liệu](#11-quy-tắc-toàn-vẹn-dữ-liệu)
12. [Quy tắc Tra cứu công khai (QR Scan)](#12-quy-tắc-tra-cứu-công-khai-qr-scan)
13. [Tổng hợp nhanh](#13-tổng-hợp-nhanh)

---

## 1. Quy tắc Biên nhận

### QT-BN-01: VP gửi phải khác VP nhận

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi tạo biên nhận, văn phòng gửi (`van_phong_gui_id`) phải **khác** văn phòng nhận (`van_phong_nhan_id`) |
| **Lý do** | Không có nghiệp vụ gửi hàng nội bộ trong cùng VP |
| **Thời điểm** | Validate khi POST `/api/bien-nhan` |
| **Lỗi trả về** | HTTP 400 — "Văn phòng gửi và văn phòng nhận không được trùng nhau" |
| **Nơi thực thi** | `routes/bien-nhan.routes.js` → handler POST |

### QT-BN-02: VP gửi và VP nhận phải tồn tại

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Cả `van_phong_gui_id` và `van_phong_nhan_id` phải tham chiếu đến VP thực tế trong DB |
| **Thời điểm** | Validate khi tạo BN (`createBienNhan`) |
| **Lỗi trả về** | HTTP 400 — "VP không tồn tại" |
| **Nơi thực thi** | `services/bien-nhan.service.js` |

### QT-BN-03: Tên hàng hoá bắt buộc

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Trường `ten_hang_hoa` là bắt buộc, không được rỗng (`minLength: 1`) |
| **Thời điểm** | Schema validation khi tạo / sửa BN |
| **Lỗi trả về** | HTTP 400 — VALIDATION_ERROR |

### QT-BN-04: Không được sửa mã biên nhận

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Trường `ma_so` bị loại bỏ (strip) trước khi cập nhật BN |
| **Lý do** | Mã BN là định danh duy nhất, liên kết QR code, PDF — thay đổi sẽ phá vỡ truy xuất |
| **Nơi thực thi** | `services/bien-nhan.service.js` → `updateBienNhan()` |

### QT-BN-05: Staff chỉ sửa biên nhận do mình tạo

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Nhân viên role `staff` chỉ được sửa BN mà `nhan_vien_nhap_id === userId` |
| **Ngoại lệ** | Admin được sửa tất cả BN |
| **Lỗi trả về** | HTTP 403 — "Bạn chỉ được sửa biên nhận do mình tạo" |
| **Nơi thực thi** | `services/bien-nhan.service.js` → `updateBienNhan()` |

### QT-BN-06: Staff chỉ xem BN liên quan đến VP mình

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Nhân viên role `staff` chỉ thấy các BN có `van_phong_gui_id` hoặc `van_phong_nhan_id` bằng VP của mình |
| **Ngoại lệ** | Admin và Accountant thấy tất cả |
| **Nơi thực thi** | `services/bien-nhan.service.js` → `listBienNhan()` |

### QT-BN-07: Tự động tạo lịch sử trạng thái khi tạo BN

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi tạo BN, hệ thống tự tạo bản ghi `lich_su_trang_thai` với `trang_thai_moi = 'cho_vc'`, `trang_thai_cu = NULL`, `ghi_chu = "Tạo biên nhận mới"` |
| **Transaction** | Cùng transaction với tạo BN — nếu 1 thất bại, cả 2 đều rollback |
| **Nơi thực thi** | `services/bien-nhan.service.js` → `createBienNhan()` |

### QT-BN-08: Tự động tạo công nợ khi TT thu = "Công nợ"

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi tạo BN với `trang_thai_thu = 'cong_no'`, hệ thống tự tạo bản ghi `cong_no`: `doi_tuong = don_vi_gui || nguoi_gui || 'N/A'`, `so_tien_no = gia_cuoc`, `trang_thai = 'chua_thu'` |
| **Transaction** | Cùng transaction với tạo BN |
| **Nơi thực thi** | `services/bien-nhan.service.js` → `createBienNhan()` |

### QT-BN-09: Tự động tạo KH mới khi tạo BN (nếu có SĐT)

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi tạo BN, với mỗi bên (gửi / nhận): nếu có **tên + SĐT** và SĐT chưa tồn tại trong bảng `KhachHang`, hệ thống tự tạo KH mới với `loai_kh = 'ca_nhan'`. Không tạo nếu thiếu tên hoặc SĐT (khách vãng lai) |
| **Lookup** | Tìm theo `dien_thoai` (SĐT) — yếu tố phân biệt đáng tin nhất |
| **Phân loại KH** | Mặc định `ca_nhan`. NV/Admin có thể sửa thành `doanh_nghiep` sau |
| **Error handling** | Wrap `try-catch` — nếu auto-create fail thì BN vẫn được tạo bình thường |
| **Thông báo** | API response trả thêm `auto_created_kh[]`, frontend hiện toast |
| **Transaction** | Cùng transaction với tạo BN |
| **Nơi thực thi** | `services/bien-nhan.service.js` → `autoCreateKhachHang()` + `createBienNhan()` |

---

## 2. Quy tắc Trạng thái vận chuyển

### QT-TT-01: Chuyển trạng thái tuần tự (State Machine)

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Trạng thái vận chuyển chỉ được chuyển **tuần tự** theo luồng cố định, không được nhảy bước hay quay ngược |
| **Nơi thực thi** | `routes/bien-nhan.routes.js` → `ALLOWED_TRANSITIONS` map + `validateTransition()` |

**Bảng chuyển đổi cho phép:**

| Trạng thái hiện tại | Cho phép chuyển sang |
|---|---|
| `cho_vc` (Chờ VC) | `dang_vc` (Đang VC) |
| `dang_vc` (Đang VC) | `da_den_kho` (Đã đến kho) |
| `da_den_kho` (Đã đến kho) | `da_bao_khach` (Đã báo khách) |
| `da_bao_khach` (Đã báo khách) | `khach_da_nhan` (Khách đã nhận) |
| `khach_da_nhan` (Khách đã nhận) | _(không cho chuyển — trạng thái kết thúc)_ |

**Ví dụ vi phạm:**
```
❌ cho_vc → da_den_kho     (nhảy bước — thiếu dang_vc)
❌ khach_da_nhan → dang_vc (quay ngược)
❌ dang_vc → cho_vc        (quay ngược)
```

**Lỗi trả về:** HTTP 400 — `"Không thể chuyển từ \"Chờ VC\" sang \"Đã đến kho\""`

### QT-TT-02: Ghi lịch sử mỗi lần chuyển trạng thái

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Mỗi lần chuyển trạng thái (đơn lẻ hoặc batch), hệ thống tạo bản ghi `lich_su_trang_thai` ghi nhận: trạng thái cũ/mới, NV thực hiện, phương thức cập nhật, thời điểm |
| **Transaction** | UPDATE trạng thái + INSERT lịch sử trong cùng 1 transaction |
| **Nơi thực thi** | `routes/bien-nhan.routes.js` → PATCH `/:id/trang-thai` và `/batch-trang-thai` |

### QT-TT-03: Batch phải đồng nhất trạng thái

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi cập nhật hàng loạt (`batch-trang-thai`), hệ thống validate **tất cả** BN trước khi thực hiện. Nếu bất kỳ BN nào không hợp lệ, **toàn bộ batch bị từ chối** |
| **Lỗi trả về** | HTTP 400 — Liệt kê tối đa 3 BN vi phạm |

---

## 3. Quy tắc Tài chính — Công nợ, Phiếu thu, Phiếu chi

### QT-TC-01: Xác nhận thanh toán công nợ → Tự tạo phiếu thu

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi xác nhận thanh toán (`xacNhanThanhToan`), hệ thống tự động: (1) Tạo phiếu thu liên kết BN gốc, (2) Cập nhật công nợ `trang_thai = 'da_thu'`, gắn `phieu_thu_id`, `ngay_thu = now()` |
| **Transaction** | Cả 2 thao tác trong cùng transaction |
| **Retry** | Sinh mã phiếu thu với retry max 3 lần nếu trùng unique |
| **Nơi thực thi** | `services/cong-no.service.js` → `xacNhanThanhToan()` |

### QT-TC-02: Không được thu công nợ đã thu

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Nếu công nợ đã có `trang_thai = 'da_thu'`, không cho phép xác nhận lại |
| **Lỗi trả về** | HTTP 400 — "Công nợ đã được thu" |

### QT-TC-03: Huỷ phiếu thu → Revert công nợ

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi huỷ phiếu thu, nếu PT liên kết với công nợ (qua `phieu_thu_id`), hệ thống tự revert: `trang_thai = 'chua_thu'`, `phieu_thu_id = NULL`, `ngay_thu = NULL` |
| **Transaction** | Huỷ PT + revert CN trong cùng transaction |
| **Nơi thực thi** | `services/phieu-thu.service.js` → `huyPhieuThu()` |

### QT-TC-04: Không được huỷ phiếu thu đã huỷ

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Nếu `da_huy = true`, không cho phép huỷ lại |
| **Lỗi trả về** | HTTP 400 — "Phiếu đã hủy trước đó" |

### QT-TC-05: Chỉ Admin được huỷ phiếu thu / phiếu chi

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Endpoint huỷ PT (PATCH `/:id/huy`) chỉ cho phép role `admin` |
| **Lỗi trả về** | HTTP 403 — "Bạn không có quyền thực hiện thao tác này" |

### QT-TC-06: Non-admin chỉ sửa phiếu do mình tạo

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi sửa phiếu thu/chi, nếu user không phải admin thì `nhan_vien_id` phải bằng `userId` |
| **Lỗi trả về** | HTTP 403 — "Chỉ sửa phiếu do mình tạo" |
| **Nơi thực thi** | `services/phieu-thu.service.js` / `phieu-chi.service.js` |

### QT-TC-07: Tạo phiếu thu từ BN → Auto-fill thông tin

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi tạo phiếu thu có `bien_nhan_id`, hệ thống tự điền nếu user không cung cấp: `doi_tuong = bn.don_vi_gui || bn.nguoi_gui`, `ly_do = "Thu cước BN {ma_so}"`, `so_tien = bn.gia_cuoc` |
| **Nơi thực thi** | `services/phieu-thu.service.js` → `createPhieuThu()` |

### QT-TC-08: Quá hạn công nợ (>30 ngày)

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Công nợ có `trang_thai = 'chua_thu'` và `ngay_phat_sinh` cách hiện tại >30 ngày sẽ được đánh dấu `qua_han = true` khi hiển thị danh sách |
| **Loại** | Runtime check (không lưu vào DB), tính tại thời điểm truy vấn |
| **Nơi thực thi** | `services/cong-no.service.js` → `listCongNo()` |

### QT-TC-09: Phiếu thu/chi đã huỷ không hiển thị trong danh sách

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Mặc định list phiếu thu/chi chỉ hiện phiếu có `da_huy = false` |
| **Nơi thực thi** | `services/phieu-thu.service.js` / `phieu-chi.service.js` → `where: { da_huy: false }` |

### QT-TC-10: Số tiền phiếu thu/chi tối thiểu = 1

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Trường `so_tien` khi tạo phiếu thu phải có `minimum: 1` (schema validation) |
| **Nơi thực thi** | `routes/phieu-thu.routes.js` → schema POST |

---

## 4. Quy tắc Bảng kê HĐĐT

### QT-BK-01: Chỉ BN đánh dấu HĐĐT và chưa vào bảng kê

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Danh sách "BN chờ" chỉ hiện BN có `can_xuat_hddt = true` AND `da_vao_bang_ke = false` |
| **Nơi thực thi** | `services/bang-ke.service.js` → `getBienNhanCho()` |

### QT-BK-02: Phải chọn ít nhất 1 BN khi xuất bảng kê

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Không cho phép xuất bảng kê rỗng |
| **Lỗi trả về** | HTTP 400 — "Chọn ít nhất 1 biên nhận" |

### QT-BK-03: Tự đánh dấu BN đã vào bảng kê

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Sau khi xuất bảng kê, tất cả BN trong bảng kê được cập nhật `da_vao_bang_ke = true`. BN sẽ **không xuất hiện lại** trong danh sách "BN chờ" |
| **Transaction** | Tạo BangKe + BangKeChiTiet + UpdateMany BN trong cùng transaction |
| **Nơi thực thi** | `services/bang-ke.service.js` → `createBangKe()` |

### QT-BK-04: Unique constraint — 1 BN chỉ xuất hiện 1 lần trong 1 bảng kê

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Cặp `(bang_ke_id, bien_nhan_id)` có ràng buộc UNIQUE ở DB level |
| **Loại** | Database constraint |

---

## 5. Quy tắc Sinh mã tự động

### QT-MA-01: Format mã theo bảng

| Bảng | Trường | Format | Ví dụ |
|---|---|---|---|
| bien_nhan | ma_so | `{VP_GUI}{VP_NHAN}-XXXX` | `SGCT-0001`, `CTSG-0012` |
| khach_hang | ma_kh | `KH-XXXX` | `KH-0001` |
| phieu_thu | ma_phieu | `PT-XXXX` | `PT-0001` |
| phieu_chi | ma_phieu | `PC-XXXX` | `PC-0001` |
| bang_ke | ma_bang_ke | `BK-XXXX` | `BK-0001` |
| nhan_vien | ma_nv | `NV-{VP}-XXX` | `NV-SG-001` _(nhập thủ công)_ |

### QT-MA-02: Tự tăng dần

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Mã được sinh bằng cách: `findFirst(orderBy: desc)` → parse số cuối → +1 |
| **Pad** | Số luôn pad 4 chữ số (0001, 0002, ...) |

### QT-MA-03: Retry khi trùng unique (Race condition safety)

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Hàm `createWithCode()` bọc việc sinh mã + INSERT trong vòng retry. Nếu gặp lỗi Prisma `P2002` (unique violation), tự tăng số và thử lại |
| **Max retry** | 3 lần |
| **Lỗi cuối** | "Không thể tạo mã {prefix} sau 3 lần thử" |
| **Nơi thực thi** | `utils/ma-so-generator.js` → `createWithCode()` |

---

## 6. Quy tắc Phân quyền (RBAC)

### QT-PQ-01: Ma trận phân quyền

| Chức năng | Admin | Staff | Accountant |
|---|:---:|:---:|:---:|
| **Dashboard** | ✅ | ✅ | ✅ |
| **Xem BN** | ✅ (tất cả VP) | ✅ (chỉ VP mình) | ✅ |
| **Tạo / Sửa BN** | ✅ | ✅ (chỉ BN mình) | ❌ |
| **Cập nhật trạng thái BN** | ✅ | ✅ | ❌ |
| **Xem KH** | ✅ | ✅ | ✅ |
| **Tạo / Sửa KH** | ✅ | ✅ | ❌ |
| **Bật / Tắt KH** | ✅ | ❌ | ❌ |
| **Phiếu thu (xem/tạo/sửa)** | ✅ | ❌ | ✅ |
| **Phiếu thu (huỷ)** | ✅ | ❌ | ❌ |
| **Phiếu chi (xem/tạo/sửa)** | ✅ | ❌ | ✅ |
| **Phiếu chi (huỷ)** | ✅ | ❌ | ❌ |
| **Công nợ** | ✅ | ❌ | ✅ |
| **Bảng kê HĐĐT** | ✅ | ❌ | ❌ |
| **Báo cáo** | ✅ | ❌ | ✅ |
| **Quản lý VP** | ✅ | ❌ | ❌ |
| **Quản lý NV** | ✅ | ❌ | ❌ |

### QT-PQ-02: Kiểm tra quyền 2 lớp

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Phân quyền được kiểm tra ở **cả backend** (`fastify.authorize()`) **lẫn frontend** (ẩn/hiện menu). Backend là nguồn tin cậy chính |
| **Nơi thực thi** | `plugins/rbac.js` + routes `preHandler` |

---

## 7. Quy tắc Quản lý Văn phòng

### QT-VP-01: Không được sửa mã VP

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Trường `ma_vp` bị strip trước khi update — không cho phép thay đổi |
| **Lý do** | Mã VP là thành phần trong mã biên nhận (`SGCT-0001`) — thay đổi sẽ mất truy xuất |
| **Nơi thực thi** | `services/van-phong.service.js` → `updateVanPhong()` |

### QT-VP-02: Không tắt VP nếu còn BN đang xử lý

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi deactivate VP, hệ thống kiểm tra: còn BN nào có `trang_thai != 'khach_da_nhan'` mà VP là `van_phong_gui_id` hoặc `van_phong_nhan_id` không? |
| **Lỗi trả về** | HTTP 400 — "Không thể vô hiệu hóa VP: còn X biên nhận đang xử lý" |
| **Nơi thực thi** | `services/van-phong.service.js` → `toggleVanPhongActive()` |

### QT-VP-03: Không tắt VP nếu còn NV hoạt động

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi deactivate VP, kiểm tra: còn NV nào `active = true` thuộc VP đó không? |
| **Lỗi trả về** | HTTP 400 — "Không thể vô hiệu hóa VP: còn X nhân viên đang hoạt động" |
| **Lưu ý** | Cả 2 check (QT-VP-02 + QT-VP-03) chạy song song, lỗi được gộp lại |

---

## 8. Quy tắc Quản lý Nhân viên

### QT-NV-01: Mã NV và Username phải duy nhất

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi tạo NV mới, kiểm tra cả `ma_nv` lẫn `username` đã tồn tại chưa |
| **Lỗi trả về** | HTTP 409 — "Mã NV hoặc Username đã tồn tại" |
| **Nơi thực thi** | `services/nhan-vien.service.js` → `createNhanVien()` |

### QT-NV-02: NV mới phải đổi mật khẩu

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | NV mới tạo luôn có `require_password_change = true`. Sau khi đổi MK lần đầu, flag chuyển `false` |
| **Nơi thực thi** | `services/nhan-vien.service.js` → `createNhanVien()` + `services/auth.service.js` → `changePassword()` |

### QT-NV-03: Không cho Admin tự vô hiệu chính mình

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Nếu `targetId === request.user.id` và `active = false`, từ chối |
| **Lỗi trả về** | HTTP 400 — "Không thể vô hiệu hóa tài khoản đang đăng nhập" |
| **Nơi thực thi** | `routes/nhan-vien.routes.js` → PATCH `/:id/active` |

### QT-NV-04: Reset mật khẩu tạo MK ngẫu nhiên

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi Admin reset MK, hệ thống sinh MK ngẫu nhiên (8 ký tự hex), hash bằng bcrypt, đặt `require_password_change = true` |
| **Hiển thị** | MK tạm chỉ hiển thị **1 lần** cho Admin — không lưu dạng plain text |
| **Nơi thực thi** | `services/nhan-vien.service.js` → `resetPassword()` |

### QT-NV-05: Không sửa được mã NV và username

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Endpoint PUT chỉ cho sửa: `ten`, `role`, `van_phong_id`. `ma_nv` và `username` không có trong schema |
| **Nơi thực thi** | `routes/nhan-vien.routes.js` → PUT schema `additionalProperties: false` |

### QT-NV-06: NV bị vô hiệu không đăng nhập được

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Hàm `login()` kiểm tra `user.active` — nếu `false`, trả về `null` (đăng nhập thất bại) |
| **Nơi thực thi** | `services/auth.service.js` → `login()` |

---

## 9. Quy tắc Quản lý Khách hàng

### QT-KH-01: Mã KH tự động sinh

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi tạo KH, mã `ma_kh` được tự sinh theo format `KH-XXXX` |
| **Nơi thực thi** | `services/khach-hang.service.js` → `createKhachHang()` |

### QT-KH-02: Không sửa được mã KH

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Trường `ma_kh` bị strip trước khi update |
| **Nơi thực thi** | `services/khach-hang.service.js` → `updateKhachHang()` |

### QT-KH-03: Auto-complete chỉ hiện KH active

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Khi gợi ý KH trên form BN, chỉ query KH có `active = true`. Cần nhập ≥ 2 ký tự, tối đa 5 kết quả |
| **Nơi thực thi** | `services/khach-hang.service.js` → `autocompleteKhachHang()` |

### QT-KH-04: Chỉ Admin được bật/tắt KH

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Endpoint PATCH `/:id/active` yêu cầu role `admin` |
| **Staff / Accountant** | Chỉ được xem và tạo/sửa KH |

---

## 10. Quy tắc Xác thực & Bảo mật

### QT-BM-01: Xác thực bằng JWT

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Mỗi request cần header `Authorization: Bearer {token}`. Token chứa: `id`, `role`, `van_phong_id` |
| **Hết hạn** | Theo cấu hình `JWT_EXPIRES_IN` trong ENV |
| **Nơi thực thi** | `plugins/auth.js` → `fastify.authenticate` |

### QT-BM-02: Rate limiting — Login

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Endpoint `/api/auth/login` giới hạn **5 request/phút** |
| **Lý do** | Chống brute force mật khẩu |
| **Nơi thực thi** | `routes/auth.routes.js` → `rateLimit: { max: 5, timeWindow: '1 minute' }` |

### QT-BM-03: Rate limiting — Global

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Tất cả API giới hạn **100 request/phút** per IP |
| **Nơi thực thi** | `server.js` → `rateLimit: { max: 100, timeWindow: '1 minute' }` |

### QT-BM-04: Rate limiting — QR Scan

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Endpoint `/api/scan/:ma_so` giới hạn **30 request/phút** |
| **Lý do** | Public endpoint — cần bảo vệ khỏi abuse |
| **Nơi thực thi** | `routes/scan.routes.js` → `rateLimit: { max: 30, timeWindow: '1 minute' }` |

### QT-BM-05: Mật khẩu hash bcrypt (10 rounds)

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Tất cả mật khẩu hash bằng `bcrypt` với salt rounds = 10 trước khi lưu DB |
| **Nơi thực thi** | `services/auth.service.js`, `services/nhan-vien.service.js` |

### QT-BM-06: Mật khẩu mới tối thiểu 6 ký tự

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Schema validation: `new_password: { type: 'string', minLength: 6 }` |
| **Nơi thực thi** | `routes/auth.routes.js` → POST `/change-password` schema |

### QT-BM-07: Schema validation nghiêm ngặt

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Tất cả endpoint có schema validation (Fastify JSON Schema). Nhiều endpoint có `additionalProperties: false` để chặn trường lạ |
| **Lỗi trả về** | HTTP 400 — `VALIDATION_ERROR` với danh sách trường sai |

---

## 11. Quy tắc Toàn vẹn dữ liệu

### QT-TV-01: Soft delete — Không xoá dữ liệu

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | PM không xoá bản ghi. Phiếu thu/chi sử dụng `da_huy = true`. NV/VP/KH sử dụng `active = false` |
| **Lý do** | Bảo toàn audit trail, báo cáo chính xác |

### QT-TV-02: Foreign Key RESTRICT — Không xoá bản ghi đang tham chiếu

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Hầu hết FK có `ON DELETE RESTRICT`. VD: Không thể xoá VP nếu còn NV/BN tham chiếu |
| **Ngoại lệ** | `phieu_thu.bien_nhan_id` → `ON DELETE SET NULL` (xoá BN, PT vẫn tồn tại). `cong_no.phieu_thu_id` → `ON DELETE SET NULL` |

### QT-TV-03: Atomic transactions

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Các thao tác liên quan nhiều bảng luôn sử dụng Prisma `$transaction` để đảm bảo tính nguyên tử. Nếu 1 bước thất bại, tất cả rollback |
| **Áp dụng** | Tạo BN (+ lịch sử + công nợ), cập nhật TT (+ lịch sử), xác nhận CN (+ PT), huỷ PT (+ revert CN), xuất BK (+ chi tiết + update BN) |

### QT-TV-04: Prisma error handler thống nhất

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Error handler plugin xử lý tập trung: `P2002` → 409 Conflict, `P2025` → 404 Not Found, Validation → 400 |
| **Nơi thực thi** | `plugins/error-handler.js` |

---

## 12. Quy tắc Tra cứu công khai (QR Scan)

### QT-QR-01: Endpoint công khai, không cần auth

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | `/api/scan/:ma_so` **không yêu cầu** JWT token — khách hàng truy cập tự do |

### QT-QR-02: Ẩn thông tin nhạy cảm

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | Trang scan **không trả về**: giá cước, trạng thái thanh toán, tên nhân viên, thông tin tài chính |
| **Chỉ trả về** | Mã BN, ngày nhận, VP gửi/nhận (mã + tên), tên hàng hoá, trạng thái VC, timeline lịch sử (tối đa 5), trạng thái tiếp theo |
| **Nơi thực thi** | `routes/scan.routes.js` — `select` chỉ lấy trường cần thiết |

### QT-QR-03: Tính trạng thái tiếp theo

| Thuộc tính | Chi tiết |
|---|---|
| **Mô tả** | API scan tự tính `next_trang_thai` để frontend hiển thị cho khách biết bước tiếp theo |
| **Logic** | Lấy index hiện tại trong mảng trạng thái, index+1 là trạng thái tiếp. Nếu đã cuối (`khach_da_nhan`) → `null` |

---

## 13. Tổng hợp nhanh

### Bảng tóm tắt tất cả quy tắc

| Mã | Tóm tắt | Loại |
|---|---|---|
| QT-BN-01 | VP gửi ≠ VP nhận | Validation |
| QT-BN-02 | VP gửi, VP nhận phải tồn tại | Validation |
| QT-BN-03 | Tên hàng hoá bắt buộc | Validation |
| QT-BN-04 | Không sửa mã BN | Immutable field |
| QT-BN-05 | Staff chỉ sửa BN mình | Authorization |
| QT-BN-06 | Staff chỉ xem BN VP mình | Data filtering |
| QT-BN-07 | Tạo BN → auto tạo lịch sử | Auto-trigger |
| QT-BN-08 | TT thu = Công nợ → auto tạo CongNo | Auto-trigger |
| QT-TT-01 | Chuyển TT tuần tự | State machine |
| QT-TT-02 | Ghi lịch sử mỗi lần chuyển TT | Auto-trigger |
| QT-TT-03 | Batch phải đồng nhất | Validation |
| QT-TC-01 | Xác nhận CN → auto tạo PT | Auto-trigger |
| QT-TC-02 | Không thu CN đã thu | Validation |
| QT-TC-03 | Huỷ PT → revert CN | Auto-trigger |
| QT-TC-04 | Không huỷ PT đã huỷ | Validation |
| QT-TC-05 | Chỉ Admin huỷ PT/PC | Authorization |
| QT-TC-06 | Non-admin sửa phiếu mình | Authorization |
| QT-TC-07 | Tạo PT từ BN → auto-fill | Auto-fill |
| QT-TC-08 | Quá hạn CN >30 ngày | Runtime check |
| QT-TC-09 | Ẩn phiếu đã huỷ | Data filtering |
| QT-TC-10 | Số tiền ≥ 1 | Validation |
| QT-BK-01 | Chỉ BN HĐĐT chưa vào BK | Data filtering |
| QT-BK-02 | Ít nhất 1 BN khi xuất BK | Validation |
| QT-BK-03 | Auto đánh dấu BN đã vào BK | Auto-trigger |
| QT-BK-04 | Unique (BK, BN) | DB constraint |
| QT-MA-01 | Format mã theo bảng | Code generation |
| QT-MA-02 | Tự tăng dần | Code generation |
| QT-MA-03 | Retry khi trùng unique | Race condition |
| QT-PQ-01 | Ma trận phân quyền 3 role | Authorization |
| QT-PQ-02 | Kiểm tra quyền 2 lớp (FE+BE) | Authorization |
| QT-VP-01 | Không sửa mã VP | Immutable field |
| QT-VP-02 | Không tắt VP có BN đang xử lý | Dependency check |
| QT-VP-03 | Không tắt VP có NV active | Dependency check |
| QT-NV-01 | Mã NV + Username duy nhất | Validation |
| QT-NV-02 | NV mới phải đổi MK | Security |
| QT-NV-03 | Không tự vô hiệu mình | Self-protection |
| QT-NV-04 | Reset MK → MK ngẫu nhiên | Security |
| QT-NV-05 | Không sửa mã NV, username | Immutable field |
| QT-NV-06 | NV inactive không login | Authentication |
| QT-KH-01 | Mã KH tự sinh | Code generation |
| QT-KH-02 | Không sửa mã KH | Immutable field |
| QT-KH-03 | Auto-complete chỉ KH active | Data filtering |
| QT-KH-04 | Chỉ Admin bật/tắt KH | Authorization |
| QT-BM-01 | JWT authentication | Authentication |
| QT-BM-02 | Login rate limit 5/phút | Security |
| QT-BM-03 | Global rate limit 100/phút | Security |
| QT-BM-04 | QR scan rate limit 30/phút | Security |
| QT-BM-05 | Bcrypt hash (10 rounds) | Security |
| QT-BM-06 | MK mới ≥ 6 ký tự | Validation |
| QT-BM-07 | Schema validation nghiêm ngặt | Validation |
| QT-TV-01 | Soft delete, không xoá | Data integrity |
| QT-TV-02 | FK RESTRICT | Data integrity |
| QT-TV-03 | Atomic transactions | Data integrity |
| QT-TV-04 | Error handler thống nhất | Error handling |
| QT-QR-01 | Scan công khai | Public access |
| QT-QR-02 | Ẩn thông tin nhạy cảm | Security |
| QT-QR-03 | Tính trạng thái tiếp theo | UX logic |
