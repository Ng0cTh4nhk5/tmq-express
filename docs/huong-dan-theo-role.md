# Hướng Dẫn Theo Vai Trò — TMQ Express ERP

> **Phiên bản tài liệu:** 1.0  
> **Cập nhật lần cuối:** Tháng 06/2026  
> **Đối tượng:** Nhân viên — Biết ngay mình cần làm gì mỗi ngày

---

## Viết Tắt Thường Dùng

| Viết tắt | Nghĩa đầy đủ |
|---|---|
| **NV** | Nhân viên |
| **VP** | Văn phòng |
| **BN** | Biên nhận (vận đơn) |
| **KH** | Khách hàng |

---

## Mục Lục

1. [Hướng Dẫn Admin (Quản Trị Viên)](#1-hướng-dẫn-admin)
2. [Hướng Dẫn Staff — VP Gửi (Nhập Liệu)](#2-hướng-dẫn-staff-vp-gửi)
3. [Hướng Dẫn Staff — VP Nhận (Kho & Giao Hàng)](#3-hướng-dẫn-staff-vp-nhận)
4. [Ma Trận Quyền Truy Cập](#4-ma-trận-quyền-truy-cập)

---

## 1. Hướng Dẫn Admin

### Tổng Quan Quyền Admin

Admin có **toàn quyền** trên hệ thống, bao gồm tất cả chức năng Staff cộng thêm:
- Bảng kê HĐĐT & Công nợ
- Quản lý Nhân viên, Văn phòng, Chành
- Xóa biên nhận (khi chưa phát sinh)
- Xem báo cáo toàn hệ thống

### Checklist Hàng Ngày (Admin)

#### Buổi Sáng — Kiểm Tra Tổng Quan
- [ ] Đăng nhập → Xem **Trang chủ**: kiểm tra KPI tháng hiện tại
- [ ] Xem **Biên nhận gần đây**: có vấn đề gì cần xử lý không?
- [ ] Kiểm tra **Chờ vận chuyển**: bao nhiêu hàng đang chờ xuất đi?
- [ ] Kiểm tra **Giao nhận hàng** tab "Tại kho": hàng đang chờ giao bao nhiêu kiện?

#### Trong Ngày — Vận Hành
- [ ] Xử lý các biên nhận cần can thiệp (sửa, xóa nếu cần)
- [ ] Theo dõi COD và cước nhận còn tồn đọng
- [ ] Hỗ trợ staff khi cần reset mật khẩu hoặc khóa/mở tài khoản

#### Cuối Ngày — Tài Chính
- [ ] Xem **Báo cáo doanh thu**: so sánh với hôm qua
- [ ] Kiểm tra phiếu chuyển COD/Cước nhận cần xác nhận

### Checklist Cuối Tháng (Admin)

- ● Đăng nhập → Vào **Bảng kê công nợ** → Chọn tháng vừa qua → Xem tổng công nợ theo khách
- ● Liên hệ từng khách doanh nghiệp → Ghi nhận thanh toán bằng nút **Xác nhận thanh toán**
- ● Xuất báo cáo công nợ ra **Excel** gửi khách hàng (nếu cần)
- ● Kiểm tra cột **Chênh lệch** — xử lý màu đỏ nếu có
- ● Cập nhật **Bảng kê HĐĐT** cho các khách doanh nghiệp
- ● Tổng hợp **Báo cáo doanh thu** theo tháng để báo cáo ban lãnh đạo

### Quản Lý Nhân Viên

**Tạo tài khoản mới:**
1. Quản trị → **Nhân viên** → **+ Thêm nhân viên**
2. Điền: Họ tên, tài khoản đăng nhập, email, văn phòng, role
3. Hệ thống tự sinh mật khẩu tạm
4. Nhân viên sẽ bắt buộc đổi mật khẩu lần đầu đăng nhập

**Khóa tài khoản (thủ công):**
- Tìm nhân viên → Nhấn **Khóa** → Tài khoản không thể đăng nhập
- Để mở lại: Nhấn **Kích hoạt**

**Mở khóa khi nhập sai mật khẩu nhiều lần (brute-force):**
- Tìm nhân viên → Nhấn **Mở khóa** *(khác với nút Kích hoạt)*
- Sau đó nên **Reset mật khẩu** ngay để bảo mật

**Reset mật khẩu:**
- Tìm nhân viên → Nhấn **Reset mật khẩu** → Hệ thống tạo mật khẩu tạm, nhân viên đổi khi đăng nhập lần sau

---

## 2. Hướng Dẫn Staff VP Gửi

> Áp dụng cho nhân viên tại văn phòng **tiếp nhận và gửi hàng** (ví dụ: VP TP.HCM - SG)

### Nhiệm Vụ Chính

1. **Tiếp nhận hàng** → Tạo biên nhận
2. **Xuất hàng** → Giao xe
3. **Xác nhận nhận tiền** từ VP nhận (phiếu chuyển COD/Cước)

### Checklist Hàng Ngày (Staff VP Gửi)

#### Buổi Sáng — Chuẩn Bị
- [ ] Đăng nhập, kiểm tra Dashboard
- [ ] Xem **Chờ vận chuyển**: hàng nào đang chờ giao xe hôm nay?

#### Trong Ca — Tiếp Nhận
- ● Với mỗi khách hàng đến gửi hàng:
  - ● Mở **Biên nhận** → **+ Thêm**
  - ● Điền đầy đủ thông tin (dùng gợi ý tự động cho KH quen)
  - ● Chọn đúng **Hình thức thu cước** (Tiền mặt / Cước nhận / Công nợ)
  - ● Chọn đúng **Hình thức giao hàng** (Khách tự đến / Gọi điện / Giao tận nơi)
  - ● Nhấn **Lưu & In** → Giao biên nhận cho khách

#### Khi Xe Chuẩn Bị Xuất
- [ ] Vào **Chờ vận chuyển**
- [ ] Tích ✅ tất cả BN lên xe này
- [ ] Nhấn **Giao xe X BN** → Xác nhận

#### Xử Lý Phiếu Chuyển (Khi VP Nhận Thông Báo Đã Gửi Tiền)
- ● **Thu hộ COD** → Tab **Phiếu chuyển COD** → Tìm phiếu → **Xác nhận đã nhận**
- ● **Cước nhận** → Tab **Phiếu chuyển cước** → Tìm phiếu → **Xác nhận đã nhận**
- ● Sau đó nhớ **Trả tiền COD lại cho người gửi hàng** (chọn BN → **Trả lô**)

### Mẹo Thao Tác Nhanh

| Tình huống | Giải pháp nhanh |
|---|---|
| KH quen thuộc | Gõ vài ký tự tên/SĐT → chọn từ gợi ý |
| Cần in ngay | Nhấn **Lưu & In** thay vì **Lưu** |
| Tạo nhiều BN liên tiếp | Nhấn **Lưu & Thêm mới** |
| Sửa BN vừa tạo | Mở chi tiết → Nhấn **✏️ Sửa** |

---

## 3. Hướng Dẫn Staff VP Nhận

> Áp dụng cho nhân viên tại văn phòng **nhận và giao hàng** (ví dụ: VP Cần Thơ - CT, VP Rạch Giá - RG)

### Nhiệm Vụ Chính

1. **Nhận hàng** khi xe về
2. **Báo khách** và **giao hàng**
3. **Thu COD** và **thu cước nhận** từ người nhận
4. **Lập phiếu chuyển** tiền về VP gửi

### Checklist Hàng Ngày (Staff VP Nhận)

#### Khi Xe Hàng Về Kho
- [ ] **Giao nhận hàng** → Tab **Đang đến**
- [ ] Kiểm tra danh sách, tích ✅ các BN đã về kho
- [ ] Nhấn **Xác nhận đến kho**

#### Báo Khách
- [ ] Tab **Tại kho**: gọi điện/nhắn tin cho từng người nhận
- [ ] Sau khi báo: Chọn BN → **Đã báo khách**

> ⚠️ Kiểm tra badge 🔴COD và 🟠Cước trước khi giao — nhắc thu tiền!

#### Giao Hàng
- [ ] Tab **Đã báo khách** → Chọn BN → **Giao hàng** (hàng lên xe giao)
- [ ] Sau khi giao thành công: Tab **Đang giao** → **Khách đã nhận**
- [ ] COD tự động thu khi nhấn **Khách đã nhận**

#### Thu Cước Nhận (Thủ Công)
- [ ] **Cước nhận** → Tab **Biên nhận cước**
- [ ] Tìm BN → **Thu cước** khi khách trả tiền

#### Lập Phiếu Chuyển Cuối Ngày/Tuần
- ● Gom các BN COD đã thu → **Lập phiếu chuyển COD**
- ● Gom các BN Cước đã thu → **Lập phiếu chuyển cước**
- ● Sau khi lập phiếu: Nhấn **Xác nhận đã gửi tiền** trên phiếu (bước VP Nhận cần làm trước)
- ● Chuyển tiền thực tế cho VP gửi (sau khi đã xác nhận trên hệ thống)
- ● Thông báo mã phiếu cho VP gửi

### Các Trường Hợp Đặc Biệt

| Tình huống | Xử lý |
|---|---|
| Hàng giao qua chành | Tab **Đã giao Chành** ghi nhận, không cần xác nhận "Khách đã nhận" |
| Chành đã thu COD | **Thu hộ COD** → Tìm BN → **Chành đã thu** |
| Khách chưa ra lấy hàng | Giữ nguyên trạng thái "Đã báo khách", liên hệ lại sau |
| Hàng hư/hỏng | Ghi chú trong chi tiết BN, báo admin xử lý |

---

## 4. Ma Trận Quyền Truy Cập

### Bảng Quyền Theo Module

| Module | Admin | Staff |
|---|---|---|
| **Trang chủ / Dashboard** | ✅ Đầy đủ | ✅ Đầy đủ |
| **Biên nhận — Xem danh sách** | ✅ | ✅ |
| **Biên nhận — Tạo mới** | ✅ | ✅ |
| **Biên nhận — Sửa** | ✅ | ✅ |
| **Biên nhận — Xóa** | ✅ Có | ❌ Không |
| **Chờ vận chuyển** | ✅ | ✅ |
| **Giao nhận hàng** | ✅ | ✅ |
| **Thu hộ COD** | ✅ | ✅ |
| **Cước nhận** | ✅ | ✅ |
| **Báo cáo doanh thu** | ✅ Tất cả VP | ✅ VP của mình |
| **Xuất Excel sổ biên nhận** | ✅ | ✅ |
| **Bảng kê HĐĐT** | ✅ | ❌ |
| **Quản lý danh sách DN HDDT** | ✅ | ❌ |
| **Bảng kê công nợ (xem)** | ✅ | ❌ |
| **Xác nhận thanh toán công nợ** | ✅ | ❌ |
| **Xuất công nợ Excel/PDF** | ✅ | ❌ |
| **Khách hàng — Xem** | ✅ | ✅ |
| **Khách hàng — Thêm/Sửa** | ✅ | ✅ |
| **Nhân viên — Quản lý** | ✅ | ❌ |
| **Nhân viên — Mở khóa brute-force** | ✅ | ❌ |
| **Văn phòng** | ✅ | ❌ |
| **Chành** | ✅ | ❌ |
| **Trả lô COD** | ✅ | ✅ |
| **Quét mã QR xem hành trình** | ✅ | ✅ (không cần tài khoản) |

### Quyền Theo Văn Phòng

| Thao tác | Phạm vi Admin | Phạm vi Staff |
|---|---|---|
| Xem biên nhận | Tất cả văn phòng | Văn phòng đang đăng nhập + filter |
| Tạo biên nhận | Từ bất kỳ VP | Từ VP đang đăng nhập |
| Báo cáo doanh thu | Có thể lọc "Tất cả" | Chỉ VP của mình |
| Quản lý nhân viên | Tất cả VP | Không có |

---

*Tài liệu được biên soạn bởi Antigravity AI - Tháng 06/2026*  
*Phiên bản tài liệu: 1.1 — Bổ sung Bảng viết tắt, Hình thức giao, Mở khóa brute-force, Xác nhận chuyển cước, Cập nhật checklist*  
*Phiên bản hệ thống: TMQ Express ERP v1.0*
