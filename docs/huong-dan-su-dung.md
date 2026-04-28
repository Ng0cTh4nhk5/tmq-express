# TMQ Express ERP — Hướng dẫn Sử dụng

> **Phiên bản:** 1.3  
> **Ngày cập nhật:** 22/04/2026  
> **Đối tượng:** Nhân viên, Kế toán, Quản trị viên

---

## Mục lục

1. [Đăng nhập & Giao diện](#1-đăng-nhập--giao-diện)
2. [Trang chủ](#2-trang-chủ)
3. [Quản lý Biên nhận](#3-quản-lý-biên-nhận)
4. [Quản lý Khách hàng](#4-quản-lý-khách-hàng)
5. [Công nợ & Đối soát](#5-công-nợ--đối-soát)
6. [Bảng kê HĐĐT](#6-bảng-kê-hđđt)
7. [Báo cáo Doanh thu](#7-báo-cáo-doanh-thu)
8. [Quản lý Văn phòng](#8-quản-lý-văn-phòng)
9. [Quản lý Nhân viên](#9-quản-lý-nhân-viên)
10. [Quản lý Chành](#10-quản-lý-chành)
11. [Tra cứu QR công khai](#11-tra-cứu-qr-công-khai)
12. [Câu hỏi thường gặp](#12-câu-hỏi-thường-gặp)

---

## 1. Đăng nhập & Giao diện

### 1.1. Đăng nhập

1. Mở trình duyệt, truy cập địa chỉ hệ thống (VD: `http://your-domain.com`)
2. Nhập **Tên đăng nhập** và **Mật khẩu** được cấp
3. Nhấn **Đăng nhập**

> **Lưu ý:**  
> - Đăng nhập sai **5 lần liên tiếp** sẽ bị khóa **1 phút** (rate limit)
> - Nếu quên mật khẩu, liên hệ Admin để được reset
> - Tài khoản mới (hoặc vừa reset MK) sẽ được yêu cầu **đổi mật khẩu** ngay lần đăng nhập đầu tiên
> - Mật khẩu mới phải có **ít nhất 6 ký tự**
> - Nhân viên bị **vô hiệu hoá** (inactive) sẽ không thể đăng nhập

### 1.2. Giao diện chính

Sau khi đăng nhập, giao diện gồm 3 phần:

```
┌─────────┬──────────────────────────────────┐
│         │         Header (thanh trên)       │
│ Sidebar ├──────────────────────────────────┤
│ (Menu   │                                  │
│  bên    │         Nội dung chính            │
│  trái)  │                                  │
│         │                                  │
└─────────┴──────────────────────────────────┘
```

- **Sidebar (bên trái):** Menu điều hướng các module. Các mục hiển thị tùy theo quyền của bạn.
- **Header (trên cùng):** Thông tin người dùng, nút đăng xuất.
- **Nội dung chính:** Khu vực làm việc, thay đổi khi bạn chọn menu.

### 1.3. Thanh sidebar — Ý nghĩa các mục menu

| Icon | Tên | Ai thấy |
|---|---|---|
| 🏠 | Trang chủ | Tất cả |
| 📝 | Biên nhận | Tất cả (Staff chỉ xem BN liên quan VP mình) |
| 👥 | Khách hàng | Tất cả |
| 📋 | Bảng kê HĐĐT | Admin |
| 📈 | Bảng kê công nợ | Admin, Kế toán |
| 📊 | Báo cáo doanh thu | Admin, Kế toán |
| 🏢 | Văn phòng | Admin |
| 🪪 | Nhân viên | Admin |
| 🚚 | Chành | Admin |

### 1.4. Đăng xuất

Nhấn **nút đăng xuất** ở góc trên phải Header. Bạn sẽ được chuyển về trang đăng nhập.

---

## 2. Trang chủ

Sau khi đăng nhập, trang chủ hiển thị:

- **Lời chào** theo buổi (sáng/chiều/tối) + tên người dùng
- **Thao tác nhanh**: Các nút truy cập nhanh đến modules chính (tuỳ quyền)
- **Biên nhận gần đây**: 5 biên nhận mới nhất để tra cứu nhanh

---

## 3. Quản lý Biên nhận

### 3.1. Xem danh sách biên nhận

1. Vào menu **Biên nhận**
2. Danh sách hiển thị với các cột: Mã số, Ngày, VP gửi, VP nhận, Hàng hóa, Cước, Trạng thái
3. **Lọc** bằng các bộ lọc trên cùng:
   - **Tìm kiếm:** Nhập mã BN, tên hàng, tên người gửi/nhận, tên đơn vị gửi/nhận
   - **Trạng thái:** Chọn 1 trạng thái cụ thể
   - **VP gửi / VP nhận:** Lọc theo văn phòng
   - **Khoảng ngày:** Chọn ngày bắt đầu — kết thúc
4. Kết quả tự động phân trang (20 dòng/trang)

> **Lưu ý phân quyền:** Nhân viên (Staff) chỉ thấy BN liên quan đến VP mình (VP gửi hoặc VP nhận = VP của NV). Admin và Kế toán thấy tất cả.

### 3.2. Tạo biên nhận mới

1. Nhấn nút **+ Tạo biên nhận** (góc trên phải)
2. Điền form:

   **Bước 1 — Chọn tuyến:**
   - Chọn **VP gửi** (mặc định = VP của bạn) và **VP nhận**
   - VP gửi và VP nhận **không được trùng nhau**
   - Mã biên nhận sẽ tự động hiển thị ở trên (VD: `SGCT-0045`)

   **Bước 2 — Thông tin người gửi:**
   - Có thể gõ trực tiếp hoặc **chọn từ danh sách khách hàng** (auto-complete)
   - Khi chọn KH, các trường Tên, SĐT, Địa chỉ sẽ tự động điền

   **Bước 3 — Thông tin người nhận:**
   - Tương tự người gửi, hỗ trợ auto-complete

   **Bước 4 — Hàng hóa & Tài chính:**
   - **Tên hàng hóa** (bắt buộc)
   - Giá trị hàng, Trọng lượng (tùy chọn)
   - **Thu hộ** (nếu có)
   - **Giá cước** nhập thủ công
   - **Trạng thái thu:** Đã thu / Chưa thu / Công nợ
   - **Hình thức giao:** Tận nơi / Gọi điện / Tự tới
   - Tích ☑️ **Cần xuất HĐĐT** nếu khách yêu cầu

3. Nhấn **Lưu biên nhận**
4. Sau khi lưu, form tự động reset (giữ nguyên VP gửi/nhận) để tạo BN tiếp

> **Lưu ý:** Nếu chọn TT thu = "Công nợ", hệ thống tự động tạo khoản công nợ tương ứng.

### 3.3. Sửa biên nhận

1. Trong danh sách, nhấn **biểu tượng bút chì** ✏️ trên dòng cần sửa
2. Form mở ra với dữ liệu hiện tại
3. Chỉnh sửa → Nhấn **Cập nhật**

> **Lưu ý:**
> - **Mã biên nhận** không thể thay đổi
> - Staff chỉ được sửa BN **do mình tạo**. Admin được sửa tất cả
> - Sau khi lưu, form tự reset (giữ VP gửi/nhận) để tạo tiếp BN mới

### 3.4. In PDF biên nhận

1. Nhấn **biểu tượng PDF** 📄 trên dòng biên nhận
2. PDF mở trong tab mới, bao gồm:
   - Thông tin biên nhận đầy đủ
   - **Mã QR** để khách tra cứu trạng thái
3. Nhấn **Ctrl+P** để in

### 3.5. Cập nhật trạng thái

**Cập nhật đơn lẻ:**
1. Trong danh sách, mỗi dòng có nút cập nhật trạng thái
2. Hệ thống chỉ cho phép chuyển sang trạng thái **kế tiếp**

**Cập nhật hàng loạt (Batch):**
1. Tích ☑️ chọn nhiều biên nhận cùng trạng thái
2. Nhấn nút cập nhật trạng thái ở thanh công cụ
3. Tất cả BN được chọn sẽ chuyển sang trạng thái tiếp theo

**Các trạng thái:**

| Trạng thái | Ý nghĩa | Chuyển tiếp sang |
|---|---|---|
| Chờ VC | Hàng đã tiếp nhận, chờ gửi đi | Đang VC |
| Đang VC | Hàng đang trên đường | Đã đến kho |
| Đã đến kho | Hàng đã tới VP nhận | Đã báo khách |
| Đã báo khách | Đã liên hệ khách đến lấy | Khách đã nhận |
| Khách đã nhận | Hoàn tất | — |

---

## 4. Quản lý Khách hàng

### 4.1. Xem danh sách

1. Vào menu **Khách hàng**
2. Tìm kiếm bằng ô tìm kiếm (tên, SĐT, mã KH)
3. Danh sách hiển thị mã KH, tên, người liên hệ, SĐT, địa chỉ, trạng thái

### 4.2. Thêm khách hàng

1. Nhấn **Thêm KH**
2. Điền thông tin:
   - **Tên đơn vị** (bắt buộc)
   - Người liên hệ, SĐT, Địa chỉ, Email, Mã số thuế, Ghi chú
3. **Lưu** — Mã KH được tạo tự động (VD: `KH-0001`)

### 4.3. Sửa khách hàng

1. Nhấn **biểu tượng bút chì** ✏️ trên dòng KH
2. Chỉnh sửa → **Cập nhật**

### 4.4. Bật/Tắt khách hàng (Admin)

1. Nhấn **biểu tượng khóa** trên dòng KH
2. KH bị tắt sẽ không xuất hiện trong auto-complete khi tạo BN

---

## 5. Công nợ & Đối soát

*Dành cho: Admin, Kế toán*

### 5.1. Bảng kê công nợ tháng

1. Vào menu **Bảng kê công nợ**
2. Chọn **Tháng** và **Năm** → Nhấn **Xem**
3. Bảng hiển thị tổng hợp công nợ theo **đối tượng** (đơn vị gửi)
4. **3 thẻ tổng hợp**: Tổng nợ, Đã thu, Còn nợ
5. Nhấn **Xuất tất cả (Excel)** để tải bảng kê toàn bộ

### 5.2. Chi tiết đối tượng

1. **Click vào tên đối tượng** trên bảng kê → Dialog chi tiết mở ra
2. Xem từng phiếu công nợ: STT, Ngày, Mã BN, Hàng hoá, Số tiền, Trạng thái
3. Trong dialog có 2 nút:
   - **Xuất PDF** — Tải báo cáo công nợ chi tiết (khổ A4, có header TMQ, bảng chi tiết, tổng cộng)
   - **Xuất Excel** — Tải bảng kê Excel cho đối tượng đó

### 5.3. Đối soát cước

Phần **"Đối soát cước"** nằm bên dưới bảng kê tháng:

1. Chọn **Tháng/Năm** → Nhấn **Đối soát**
2. Bảng so sánh cho từng đối tượng:
   - **Cước thực tế** — tổng cước trên biên nhận gửi trong tháng
   - **Cước HĐĐT** — tổng cước trên bảng kê HĐĐT đã xuất
   - **Chênh lệch** — HĐĐT − Thực tế
3. Dòng **bất thường** được highlight đỏ + icon ⚠️

> **Bất thường là gì?** Khi HĐĐT cao hơn cước thực tế, hoặc đối tượng gửi ≤5 BN nhưng xuất HĐĐT >1 triệu.

### 5.4. Xác nhận thu công nợ

1. Nhấn **biểu tượng xác nhận** ✅ trên dòng công nợ
2. Chọn hình thức thanh toán → Nhấn **Xác nhận**
3. Hệ thống tự tạo **Phiếu thu** liên kết + chuyển công nợ thành "Đã thu"

---

## 6. Bảng kê HĐĐT

*Dành cho: Admin*

### 6.1. Tab "BN chờ"

Hiển thị danh sách biên nhận đã đánh dấu **"Cần xuất HĐĐT"** nhưng chưa vào bảng kê nào.

### 6.2. Xuất bảng kê

1. Ở tab **BN chờ**, tích ☑️ chọn các biên nhận cần xuất
2. Nhấn **Xuất bảng kê**
3. Hệ thống:
   - Tạo bảng kê mới (VD: `BK-0001`)
   - **Tải file Excel** tự động
   - Các BN được đánh dấu "Đã vào bảng kê"

### 6.3. Tab "Lịch sử"

- Xem danh sách bảng kê đã xuất (mã, ngày, số BN, tổng cước)
- Nhấn **biểu tượng tải** ⬇️ để tải lại file Excel

---

## 7. Báo cáo Doanh thu

*Dành cho: Admin, Kế toán*

### 7.1. Xem báo cáo

1. Vào menu **Báo cáo doanh thu**
2. Chọn bộ lọc:
   - **Từ ngày / Đến ngày** — khoảng thời gian
   - **VP gửi** — lọc theo văn phòng gửi (hoặc Tất cả)
   - **Nhóm theo** — Ngày / Tuần / Tháng / Năm
3. Nhấn **Xem**

### 7.2. Kết quả

- **4 thẻ tổng hợp**: Số BN, Tổng doanh thu, Đã thu, Chưa thu + Công nợ
- **Bảng chi tiết** theo kỳ: Kỳ, Số BN, Tổng cước, Đã thu, Chưa thu, Công nợ, Thu hộ
- **Footer tổng cộng** phía dưới bảng

> **Mẹo:** Trang tự động load tháng hiện tại khi mở. Dùng nhóm "Ngày" để đối soát cuối ngày, "Tháng" cho báo cáo tháng.

---

## 8. Quản lý Văn phòng

*Dành cho: Admin*

### 8.1. Xem & Tạo

1. Vào menu **Văn phòng**
2. Nhấn **Thêm VP** → Điền:
   - **Mã VP** (VD: `HCM`, `HN`, `DN`)
   - **Tên** (VD: "VP Hồ Chí Minh")
   - Địa chỉ, SĐT
3. **Lưu**

### 8.2. Sửa

Nhấn ✏️ → Chỉnh sửa (không sửa được mã VP) → **Cập nhật**

### 8.3. Bật/Tắt

- Bật/Tắt bằng **toggle switch** trên mỗi dòng
- **Không thể tắt** VP nếu:
  - Còn biên nhận đang xử lý (chưa giao khách)
  - Còn nhân viên đang hoạt động thuộc VP đó

---

## 9. Quản lý Nhân viên

*Dành cho: Admin*

### 9.1. Xem danh sách

1. Vào menu **Nhân viên**
2. Danh sách hiển thị: Mã NV, Tên, VP, Vai trò, Trạng thái

### 9.2. Thêm nhân viên

1. Nhấn **+ Thêm NV**
2. Điền:
   - **Mã NV** (VD: `NV01`)
   - **Tên**
   - **Username** (tên đăng nhập)
   - **Password** (mật khẩu đầu tiên)
   - **Vai trò**: Admin / Nhân viên / Kế toán
   - **Văn phòng**: Chọn VP
3. **Lưu**

### 9.3. Sửa thông tin

Nhấn ✏️ → Sửa tên, vai trò, VP → **Cập nhật**

> Không sửa được mã NV và username.

### 9.4. Bật/Tắt nhân viên

- Nhấn toggle để tắt (vô hiệu hóa) NV
- NV bị tắt không thể đăng nhập
- **Không thể tự tắt chính mình**

### 9.5. Reset mật khẩu

1. Nhấn **biểu tượng khóa** 🔒 trên dòng NV
2. Xác nhận reset
3. Hệ thống tạo **mật khẩu ngẫu nhiên** và hiển thị
4. **Ghi lại mật khẩu** và gửi cho nhân viên

> **Quan trọng:** Mật khẩu chỉ hiển thị **1 lần**. Nếu quên, cần reset lại.

---

## 10. Quản lý Chành

*Dành cho: Admin*

### 10.1. Xem & Tạo

1. Vào menu **Chành**
2. Nhấn **Thêm chành** → Điền:
   - **Tên chành**, Địa chỉ, Điện thoại, Người liên hệ
   - **Văn phòng** thuộc
3. **Lưu**

### 10.2. Sửa & Bật/Tắt

- Nhấn ✏️ → Chỉnh sửa → **Cập nhật**
- Bật/Tắt bằng toggle switch

---

## 11. Tra cứu QR công khai

### 11.1. Khách hàng tra cứu trạng thái

Khi khách nhận biên nhận (bản in PDF), trên đó có **Mã QR**:

1. Khách dùng điện thoại **quét mã QR** (hoặc truy cập link)
2. Trang tra cứu hiển thị:
   - Thông tin biên nhận (VP gửi, VP nhận, hàng hóa)
   - **Timeline trạng thái** (lịch sử cập nhật từng bước)
   - Trạng thái hiện tại

> **Ghi chú:** Trang này **công khai** (không cần đăng nhập) và **không hiển thị** thông tin tài chính (giá cước, công nợ) hay tên nhân viên.

---

## 12. Câu hỏi thường gặp

### Q: Tôi quên mật khẩu, phải làm sao?
**A:** Liên hệ Admin để reset mật khẩu. Admin vào module Nhân viên → nhấn biểu tượng khóa → gửi mật khẩu mới cho bạn.

### Q: Tại sao tôi không thấy menu Phiếu thu / Phiếu chi?
**A:** Chỉ vai trò **Admin** và **Kế toán** mới có quyền truy cập. Liên hệ Admin nếu cần thay đổi vai trò.

### Q: Tại sao không cập nhật được trạng thái biên nhận?
**A:** Hệ thống yêu cầu cập nhật **tuần tự**. VD: "Chờ VC" chỉ có thể chuyển sang "Đang VC", không được nhảy sang "Đã đến kho".

### Q: Hủy phiếu thu có ảnh hưởng đến công nợ không?
**A:** Có. Nếu phiếu thu liên kết với công nợ (từ xác nhận thu), hệ thống sẽ **tự động revert** công nợ về trạng thái "Chưa thu".

### Q: Tại sao không tắt được văn phòng?
**A:** VP không thể tắt nếu còn biên nhận đang xử lý hoặc nhân viên đang hoạt động thuộc VP đó. Cần hoàn tất tất cả BN và vô hiệu hóa NV trước.

### Q: Làm sao để xuất HĐĐT?
**A:** 
1. Khi tạo BN, tích ☑️ "Cần xuất HĐĐT"
2. Admin vào module **Bảng kê** → chọn các BN → Xuất Excel
3. Gửi file Excel cho bộ phận kế toán / bên thứ 3 để xuất hóa đơn

### Q: Tại sao phải đổi mật khẩu ngay khi đăng nhập lần đầu?
**A:** Admin cấp mật khẩu tạm (hoặc reset MK) luôn yêu cầu NV đổi MK ngay lần đăng nhập đầu. Mật khẩu mới phải ≥ 6 ký tự.

### Q: Tại sao tôi (Staff) không thấy tất cả biên nhận?
**A:** Nhân viên chỉ thấy BN liên quan đến VP mình (VP gửi hoặc VP nhận = VP của bạn). Admin và Kế toán thấy tất cả VP.

### Q: Những trình duyệt nào hỗ trợ?
**A:** Hệ thống hoạt động tốt trên **Google Chrome**, **Microsoft Edge**, **Firefox** phiên bản mới nhất. Khuyến nghị dùng Chrome.

### Q: Dữ liệu có an toàn không?
**A:** Hệ thống áp dụng nhiều lớp bảo mật: xác thực JWT, giới hạn rate (login: 5/phút, global: 100/phút), kiểm tra dữ liệu đầu vào nghiêm ngặt, phân quyền cả frontend lẫn backend, mật khẩu hash bcrypt, và giao dịch nguyên tử cho dữ liệu tài chính.
