# TMQ Express ERP — Tổng Quan Phân Hệ & Chức Năng

> **Phiên bản tài liệu:** 1.0
> **Cập nhật lần cuối:** Tháng 06/2026
> **Hệ thống:** TMQ Express — Phần mềm quản lý vận hành nội bộ

---

## 👥 Phân Quyền Người Dùng

| Role | Tên hiển thị | Quyền truy cập |
|---|---|---|
| **admin** | Quản trị viên | Toàn bộ hệ thống |
| **staff** | Nhân viên | Vận hành + một phần tài chính (không có Quản trị) |

---

## 🚛 PHÂN HỆ 1 — VẬN HÀNH

### 📦 1.1 Biên Nhận (Vận Đơn)
- Tạo biên nhận mới với thông tin người gửi/nhận, hàng hóa, cước
- Hình thức thu cước: **Đã thu / Chưa thu (cước nhận) / Công nợ**
- Tự động gợi ý khách hàng có sẵn trong hệ thống
- Hỗ trợ **Thu hộ COD** ngay trên biên nhận
- Gửi qua **Chành** (đối tác vận chuyển trung gian)
- Xem chi tiết, lịch sử cập nhật trạng thái từng biên nhận
- In biên nhận PDF, in sổ tổng hợp
- Bộ lọc: VP gửi/nhận, ngày, trạng thái, tìm kiếm nhanh
- Lưu & thêm mới, Lưu & in ngay

### 🚚 1.2 Chờ Vận Chuyển
- Danh sách biên nhận trạng thái **"Chờ giao xe"**
- Thống kê: số BN chờ, tổng cước, số COD cần thu
- **Giao xe hàng loạt** (chọn nhiều BN, xác nhận 1 lần)
- Giao xe từng biên nhận riêng lẻ
- Badge màu COD/Cước để nhân viên nhận biết nhanh

### 🏭 1.3 Giao Nhận Hàng (Hàng Đến)
- Theo dõi hàng qua 5 tab trạng thái:
  - 🚛 Đang đến → 🏭 Tại kho → 📞 Đã báo khách → 🚐 Đang giao → 🏳️ Đã giao Chành
- Thao tác hàng loạt: Xác nhận đến kho, Báo khách, Giao hàng, Khách đã nhận
- Badge COD/Cước nhắc nhở nhân viên thu tiền trước khi giao

---

## 💳 PHÂN HỆ 2 — TÀI CHÍNH

### 💵 2.1 Thu Hộ COD *(Cash on Delivery)*
- Theo dõi 6 trạng thái COD:
  - ⏰ Chờ thu → 📍 Chành đã thu → ✅ Đã thu → ✂️ Chờ chuyển → 📤 Đã chuyển → 🏁 **Hoàn tất**
- **Tự động thu COD** khi xác nhận "Khách đã nhận"
- Lập **Phiếu chuyển COD** gom tiền liên văn phòng
- Xác nhận nhận tiền ở VP gửi → Hoàn tất chu trình

### 🚢 2.2 Cước Nhận
- Theo dõi 4 trạng thái:
  - ⏰ Chưa thu → ✅ Đã thu → ✂️ Chờ chuyển → 🏁 **Hoàn tất**
- Thu cước từ người nhận hàng
- Lập **Phiếu chuyển cước** liên văn phòng
- Xác nhận nhận tiền → Hoàn tất

### 🧾 2.3 Bảng Kê HĐĐT *(Admin only)*
- Quản lý xuất hóa đơn VAT cho khách hàng doanh nghiệp
- Tổng hợp theo tháng

### 📋 2.4 Bảng Kê Công Nợ *(Admin only)*
- Theo dõi cước ghi nợ khách hàng doanh nghiệp
- Đối soát cuối tháng: Số CN, Tổng, Đã thu, Còn nợ
- **Phát hiện bất thường HĐĐT** — cảnh báo khi HĐĐT cao hơn cước thực tế (cột Chênh lệch màu đỏ)

### 📊 2.5 Báo Cáo Doanh Thu
- Thống kê theo kỳ tùy chọn (ngày/tuần/tháng/năm)
- Lọc theo văn phòng hoặc toàn hệ thống
- **Biểu đồ cột** Tổng cước vs Đã thu
- Các thẻ KPI: Số BN, Tổng doanh thu, Đã thu, Chưa thu+Nợ, **Tỷ lệ thu hồi %**

---

## ⚙️ PHÂN HỆ 3 — QUẢN TRỊ *(Admin only)*

### 👤 3.1 Quản Lý Khách Hàng *(cả Staff)*
- Danh sách khách hàng (Doanh nghiệp / Cá nhân)
- Tìm kiếm theo tên, SĐT, mã số thuế
- Lọc theo loại và trạng thái (Hoạt động / Ngưng)
- Thêm/sửa thông tin: MST, CCCD, email, địa chỉ, ghi chú nội bộ

### 👨‍💼 3.2 Quản Lý Nhân Viên *(Admin only)*
- Danh sách nhân viên theo văn phòng và role
- Thêm tài khoản mới (hệ thống tự sinh mật khẩu tạm)
- Kích hoạt / Khóa tài khoản
- Reset mật khẩu về mặc định
- Bắt buộc đổi mật khẩu lần đầu đăng nhập

### 🏢 3.3 Quản Lý Văn Phòng *(Admin only)*
- Quản lý 3 văn phòng: SG (TP.HCM), CT (Cần Thơ), RG (Rạch Giá)
- Thông tin địa chỉ, điện thoại từng văn phòng

### 🚌 3.4 Quản Lý Chành *(Admin only)*
- Danh sách đối tác vận chuyển trung gian (xe khách, tàu thủy, v.v.)
- Thông tin bến/điểm nhận hàng, người liên hệ, trạng thái (Hoạt động / Ngưng)

---

## 🔍 PHÂN HỆ 4 — XEM HÀNH TRÌNH ĐƠN HÀNG (DÀNH CHO KHÁCH)

### 📱 4.1 Quét Mã QR Xem Trạng Thái *(Không cần tài khoản)*
- Khách hàng dùng điện thoại quét mã QR in trên phiếu giao hàng để xem hành trình.
- Để tránh nhầm lẫn giữa các đơn hàng gửi khác ngày, hệ thống chỉ hỗ trợ xem bằng quét mã QR (không hỗ trợ gõ mã thủ công trên trang web).
- Hiển thị đầy đủ: chặng đi hiện tại, tuyến đường, số kiện hàng và nhật ký giờ giấc hàng đi qua từng nơi.

---

## 🛠️ TIỆN ÍCH CHUNG

| Tiện ích | Mô tả |
|---|---|
| 🔐 **Đổi mật khẩu** | Mọi tài khoản tự đổi được bất kỳ lúc nào |
| 🖨️ **In PDF** | In biên nhận trực tiếp từ hệ thống |
| 📋 **In sổ tổng hợp** | In danh sách tổng hợp biên nhận |
| 🎨 **Sidebar thu/mở** | Nhấn logo TMQ để thu/mở thanh menu |
| ⚡ **Nút bấm nhanh** | Các lối tắt ra các màn hình hay dùng ngoài trang chủ |
| 📅 **Xem nhanh doanh số** | Xem tổng số đơn, doanh thu, tiền đã thu ngay ngoài trang chủ |
| 🔎 **Tìm kiếm và lọc** | Có ở các danh sách để tìm nhanh theo tên, SĐT, mã số... |
| ✅ **Làm hàng loạt** | Chọn nhiều đơn để giao xe, nhận kho, giao hàng cùng lúc |
| 🌐 **Quét QR xem hành trình** | Khách hàng chỉ cần quét mã QR trên giấy để xem tình trạng hàng |

---

## 📋 Tóm Tắt Nhanh

| Phân hệ | Số chức năng chính | Đối tượng |
|---|---|---|
| 🚛 Vận hành | 3 module | Admin + Staff |
| 💳 Tài chính | 5 module | Admin + Staff (một phần) |
| ⚙️ Quản trị | 4 module | Admin only |
| 🔍 Tra cứu công khai | 1 module | Tất cả (không cần đăng nhập) |

> Hệ thống có **4 phân hệ chính**, **13 module**, **19 màn hình/view** và bao phủ toàn bộ quy trình nghiệp vụ:
> **Tiếp nhận → Vận chuyển → Giao hàng → Thu tiền → Báo cáo**

---

*Tài liệu được biên soạn bởi Antigravity AI - Tháng 06/2026*
*Phiên bản hệ thống: TMQ Express ERP v1.0*
