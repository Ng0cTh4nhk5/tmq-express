# Task 1 — Danh sách việc cần làm

---

## 🎨 SỬA UI (Frontend only)

### Sidebar
- [ ] Sidebar bị co rút khi di chuột qua lại — fix animation/layout để ổn định

### Màn hình đăng nhập
- [ ] Bỏ các mô tả thống kê tào lao bên cạnh form đăng nhập
- [ ] Đổi tiêu đề "Hệ thống Quản lý Vận chuyển & Tài chính" → "App vận hành nội bộ"
- [ ] Thêm ảnh nền trắng đen chụp chi nhánh HCM vào màn hình đăng nhập

### Trang Quản lý nhân viên (`/nhan-vien`)
- [ ] Dịch toàn bộ nhãn tiếng Anh sang tiếng Việt ở giao diện chính (bảng danh sách)
- [ ] Cắt bớt độ rộng cột "Họ tên", nhường chỗ cho các cột còn lại rộng hơn
- [ ] Form tạo nhân viên mới:
  - [ ] Có badge màu tương ứng khi chọn vai trò (Admin / Kế toán / Nhân viên)
  - [ ] Placeholder mặc định trường Vai trò: `"Chọn vai trò"`
  - [ ] Placeholder mặc định trường Văn phòng: `"Chọn văn phòng"`
  - [ ] Cải thiện UI form: bớt đơn sắc, thêm visual hierarchy

### Trang & Form Khách hàng (`/khach-hang`)
- [ ] Nút "Thêm KH" → đổi thành "Thêm khách hàng mới"
- [ ] Form thêm khách hàng:
  - [ ] Trường Địa chỉ nên full-width (dài bằng trường Ghi chú)
  - [ ] Trường Tên đơn vị cũng nên full-width tương tự Ghi chú
  - [ ] Badge màu cho Loại khách hàng (Doanh nghiệp / Cá nhân)
  - [ ] Placeholder mặc định Loại KH: `"Chọn nhóm khách hàng"` (bỏ default = cá nhân)
  - [ ] Đổi placeholder SĐT: `"0901234567"` → `"Nhập SĐT"`
  - [ ] Đổi placeholder CCCD: `"Số CCCD..."` → `"Nhập số CCCD"`
  - [ ] Đổi placeholder Email: `"Email"` → `"Nhập địa chỉ email"`
  - [ ] Làm rõ badge/style của nút `← Quay lại`
  - [ ] Label "Mã KH" → ghi rõ "Mã khách hàng"
  - [ ] Form cá nhân hoá layout theo từng loại KH:
    - **Cá nhân:** dòng 1: Người liên hệ & CCCD | dòng 2: Địa chỉ | dòng 3: SĐT & Email
    - **Doanh nghiệp:** dòng 1: Tên đơn vị & MST | dòng 2: Địa chỉ | dòng 3: Người liên hệ & CCCD | dòng 4: SĐT & Email
- [ ] Trang danh sách `/khach-hang` chia thành 2 tab: **Doanh nghiệp** và **Cá nhân**, có phân trang đầy đủ

---

## ⚙️ SỬA LOGIC / METHOD

### Xác thực & Tài khoản
- [ ] **[Nghiên cứu]** Cho phép nhân viên tự đổi mật khẩu tài khoản (hiện chưa có tính năng này)
- [ ] Tính năng **đổi mật khẩu lần đầu** chưa hoạt động dù DB đã có trường `require_password_change`
- [ ] Tính năng **đổi mật khẩu** cho nhân viên đang hoạt động cũng chưa có

### Quản lý nhân viên
- [ ] **[Nghiên cứu]** Cơ chế tự sinh mã nhân viên — xem logic hiện tại, đánh giá có cần cải thiện không
- [ ] Form tạo nhân viên: thêm trường **Mật khẩu** + **Nhập lại mật khẩu** để xác nhận (hiện chưa có)

### Quản lý khách hàng
- [ ] **[Nghiên cứu]** Cơ chế tự nhảy mã khách hàng — xem logic hiện tại, đánh giá có cần cải thiện không
- [ ] Frontend tự format số điện thoại dạng `0901 234 567` (tách 3-3-4) khi người dùng nhập
- [ ] Chỉ cho phép nhập số ở các trường: Số điện thoại, Mã số thuế _(Địa chỉ cần cho phép chữ)_
- [ ] **[Nghiên cứu]** Phân tích lại tính năng tìm kiếm khách hàng: 1 ô tìm kiếm tổng hợp vs nhiều trường riêng biệt — so sánh lợi/hại về UX và hiệu năng DB/frontend