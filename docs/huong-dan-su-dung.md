# Hướng Dẫn Sử Dụng — TMQ Express ERP

> **Phiên bản tài liệu:** 1.0  
> **Cập nhật lần cuối:** Tháng 06/2026  
> **Hệ thống:** TMQ Express — Phần mềm quản lý vận hành nội bộ

---

## Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Đăng Nhập & Trang Chủ](#2-đăng-nhập--trang-chủ)
3. [Quản Lý Biên Nhận](#3-quản-lý-biên-nhận)
4. [Quản Lý Vận Chuyển](#4-quản-lý-vận-chuyển)
5. [Thu Hộ COD & Cước Nhận](#5-thu-hộ-cod--cước-nhận)
6. [Tài Chính & Báo Cáo](#6-tài-chính--báo-cáo)
7. [Quản Trị Hệ Thống](#7-quản-trị-hệ-thống)
8. [Quét Mã QR Xem Tình Trạng Hàng Hóa](#8-quét-mã-qr-xem-tình-trạng-hàng-hóa)
9. [Tiện Ích Chung](#9-tiện-ích-chung)
10. [Phiếu Chuyển Liên Văn Phòng](#10-phiếu-chuyển-liên-văn-phòng)
11. [Bảng Thuật Ngữ](#11-bảng-thuật-ngữ)

---

## 1. Tổng Quan Hệ Thống

### 1.1 Giới Thiệu

**TMQ Express ERP** là phần mềm quản lý vận hành nội bộ của công ty **TMQ Express — Chuyển phát nhanh**. Hệ thống hỗ trợ toàn bộ quy trình nghiệp vụ từ tiếp nhận hàng hóa, theo dõi vận chuyển, thu hộ (COD), quản lý tài chính đến báo cáo doanh thu.

**Các chức năng chính:**
- 📦 Tạo và quản lý biên nhận (vận đơn) hàng hóa
- 🚚 Theo dõi trạng thái vận chuyển theo thời gian thực
- 💰 Quản lý thu hộ COD và cước nhận liên văn phòng
- 📊 Báo cáo doanh thu và công nợ
- 🏢 Quản trị hệ thống: nhân viên, văn phòng, khách hàng, chành

### 1.2 Cơ Cấu Tổ Chức

Hệ thống hiện quản lý **3 văn phòng**:

| Mã VP | Tên văn phòng | Địa chỉ |
|---|---|---|
| **SG** | Văn phòng TP. Hồ Chí Minh | 491 Lê Hồng Phong, P.2, Q.10, TP.HCM |
| **CT** | Văn phòng Cần Thơ | 20 Đại lộ Hòa Bình, P.Tân An, Q.Ninh Kiều, TP Cần Thơ |
| **RG** | Văn phòng Rạch Giá | 15 Nguyễn Trung Trực, P.Vĩnh Thanh, TP Rạch Giá, Kiên Giang |

### 1.3 Phân Quyền Người Dùng

Hệ thống có 2 nhóm quyền:

| Role | Tên hiển thị | Quyền truy cập |
|---|---|---|
| **admin** | Quản trị viên | Toàn bộ chức năng, bao gồm Bảng kê HĐĐT, Công nợ, Nhân viên, Văn phòng, Chành |
| **staff** | Nhân viên | Biên nhận, Vận chuyển, Thu hộ COD, Cước nhận, Khách hàng, Báo cáo doanh thu |

### 1.4 Tài Khoản Đăng Nhập

> 🔑 Tên đăng nhập và mật khẩu của bạn sẽ do **Quản trị viên** cấp trực tiếp.
> Lần đầu đăng nhập, hệ thống sẽ yêu cầu bạn đổi ngay sang mật khẩu do mình tự chọn.

Nếu chưa có tài khoản hoặc quên mật khẩu, hãy liên hệ Quản trị viên của đơn vị.

---

## 2. Đăng Nhập & Trang Chủ

### 2.1 Trang Đăng Nhập

Truy cập hệ thống tại địa chỉ: **`https://nthanh-thesis.io.vn`**

> 💡 Mở trình duyệt (Chrome, Cốc Cốc...) và gõ địa chỉ trên vào thanh địa chỉ, rồi nhấn Enter.

![Màn hình đăng nhập TMQ Express](/screenshots/01-login.png)
*Màn hình đăng nhập — Nhập tài khoản và mật khẩu để truy cập hệ thống*

**Hướng dẫn đăng nhập:**
1. Nhập **Tài khoản** vào ô "Nhập tài khoản"
2. Nhập **Mật khẩu** vào ô "Nhập mật khẩu" (có thể nhấn 👁 để hiện mật khẩu)
3. Nhấn nút **Đăng nhập** (màu xanh lá)

> Nếu quên mật khẩu, liên hệ quản trị viên hệ thống để được reset.

### 2.2 Trang Chủ — Tài Khoản Admin

Sau khi đăng nhập với tài khoản **admin**, hệ thống hiển thị trang chủ với đầy đủ thông tin:

![Trang chủ Admin](/screenshots/02-home-admin.png)
*Trang chủ dành cho Admin — Hiển thị thống kê tháng hiện tại và thao tác nhanh*

**Các thành phần trên trang chủ:**

| Vùng | Mô tả |
|---|---|
| 📦 **Biên nhận tháng này** | Số lượng biên nhận đã tạo trong tháng hiện tại |
| 💰 **Tổng doanh thu** | Tổng tiền cước đã thu và chưa thu trong tháng |
| ✅ **Đã thu** | Tổng số tiền cước đã được thu thành công |
| ⚠️ **Chưa thu + Nợ** | Tổng số tiền còn tồn đọng (cước nhận chờ + công nợ) |
| ⚡ **Thao tác nhanh** | Shortcut đến các chức năng thường dùng nhất |
| 📋 **Biên nhận gần đây** | Danh sách 3-5 biên nhận được tạo gần nhất |

### 2.3 Menu Điều Hướng (Sidebar)

Thanh menu bên trái có thể thu/mở bằng cách nhấn vào logo TMQ ở góc trên trái.

![Sidebar đầy đủ của Admin](/screenshots/03-sidebar-admin.png)
*Sidebar mở rộng — Hiển thị toàn bộ menu dành cho Admin*

**Cấu trúc menu Admin:**

**🚛 VẬN HÀNH**
- **Trang chủ** — Dashboard tổng quan
- **Biên nhận** — Danh sách và tạo vận đơn
- **Chờ vận chuyển** — Hàng đang chờ xuất đi
- **Giao nhận hàng** — Quản lý hàng đến tại kho
- **Khách hàng** — Danh mục khách hàng

**💳 TÀI CHÍNH**
- **Bảng kê HĐĐT** — Bảng kê hóa đơn điện tử *(Admin only)*
- **Bảng kê công nợ** — Quản lý công nợ *(Admin only)*
- **Thu hộ (COD)** — Quản lý tiền thu hộ
- **Cước nhận** — Cước do người nhận trả
- **Báo cáo doanh thu** — Thống kê theo kỳ

**⚙️ QUẢN TRỊ** *(Admin only)*
- **Văn phòng** — Quản lý các văn phòng
- **Nhân viên** — Quản lý tài khoản nhân viên
- **Chành** — Quản lý đối tác vận chuyển

### 2.4 Trang Chủ — Tài Khoản Staff

Tài khoản staff có giao diện tương tự nhưng **ẩn các menu Admin-only**:

![Trang chủ Staff](/screenshots/04-home-staff.png)
*Trang chủ dành cho Nhân viên (Staff) — Không có menu Quản trị và một số chức năng tài chính*

**Điểm khác biệt giữa Admin và Staff:**
- Staff **không thấy** menu: Bảng kê HĐĐT, Công nợ, Văn phòng, Nhân viên, Chành
- Mục "Thao tác nhanh" trên trang chủ cũng ẩn bớt các shortcut admin-only

### 2.5 Đổi Mật Khẩu

Có thể đổi mật khẩu bất kỳ lúc nào bằng cách:
- Nhấn vào tên người dùng ở góc trên phải → chọn **Đổi mật khẩu**
- Hoặc nhấn **Đổi mật khẩu** ở cuối sidebar bên trái

![Trang đổi mật khẩu](/screenshots/05-change-password.png)
*Form đổi mật khẩu — Cần nhập mật khẩu hiện tại trước khi đổi*

**Yêu cầu mật khẩu mới:**
- Tối thiểu **6 ký tự**
- Phải nhập lại để xác nhận (trường "Xác nhận mật khẩu mới")

> 🔒 Một số tài khoản mới được tạo sẽ **bắt buộc phải đổi mật khẩu** trước khi sử dụng hệ thống.

---

---

## 3. Quản Lý Biên Nhận

**Biên nhận** (vận đơn) là chứng từ ghi nhận việc tiếp nhận hàng hóa để vận chuyển giữa các văn phòng. Đây là nghiệp vụ cốt lõi của hệ thống.

### 3.1 Danh Sách Biên Nhận

Truy cập menu **Biên nhận** trên sidebar để xem danh sách tất cả vận đơn.

![Danh sách biên nhận](/screenshots/06-bien-nhan-list.png)
*Trang danh sách biên nhận — Hiển thị các vận đơn theo bộ lọc hiện tại*

**Cấu trúc bảng danh sách:**

| Cột | Mô tả |
|---|---|
| **Mã số** | Mã biên nhận, ví dụ: `SGCT-0001` (SG→CT, số thứ tự 0001) |
| **Ngày / Giờ** | Thời điểm tạo biên nhận |
| **Tuyến** | Hành trình, ví dụ: `SG→CT` (từ TP.HCM đến Cần Thơ) |
| **Đơn vị gửi** | Tên khách hàng / đơn vị gửi hàng |
| **Người gửi** | Tên người liên hệ gửi hàng |
| **Đơn vị nhận** | Tên đơn vị nhận hàng |

> Nhấn vào bất kỳ dòng nào để xem chi tiết biên nhận ở khung bên phải.

### 3.2 Bộ Lọc Tìm Kiếm

![Bộ lọc biên nhận](/screenshots/07-bien-nhan-filter.png)
*Khu vực bộ lọc — Hỗ trợ lọc theo nhiều tiêu chí kết hợp*

**Các bộ lọc có sẵn:**

| Bộ lọc | Mô tả |
|---|---|
| **VP gửi** | Lọc theo văn phòng gửi hàng (mặc định = văn phòng đang đăng nhập) |
| **VP nhận** | Lọc theo văn phòng nhận hàng đích |
| **Từ ngày / Đến ngày** | Lọc theo khoảng thời gian tạo biên nhận |
| **Trạng thái** | Lọc theo trạng thái vận chuyển hiện tại |
| **Ô tìm kiếm** | Tìm nhanh theo mã biên nhận, tên người gửi/nhận, số điện thoại |

### 3.3 Tạo Biên Nhận Mới

Nhấn nút **+ Thêm** ở góc dưới phải màn hình để mở form tạo biên nhận mới.

![Form tạo biên nhận mới](/screenshots/08-bien-nhan-create.png)
*Form tạo biên nhận — Điền đầy đủ thông tin người gửi, người nhận và hàng hóa*

**Hướng dẫn điền form:**

**Phần thông tin chung (đầu form):**
- **Giá cước** — Nhập tiền cước vận chuyển
- **Hình thức thu cước** — Chọn một trong 3 loại:
  - 🟢 **Đã thu** — Thu tiền ngay tại đầu gửi
  - ⚪ **Chưa thu** — Người nhận trả cước khi nhận hàng (cước nhận)
  - ⚪ **Công nợ** — Ghi nợ, khách doanh nghiệp thanh toán theo tháng
- **Địa điểm đến** — Chọn văn phòng nhận hàng đích
- **Gửi tới Chành** — Nếu giao qua đối tác vận chuyển trung gian *(xe khách, tàu thủy...)*, chọn chành ở đây
- **Hình thức giao hàng** — Chọn cách giao đến tay người nhận tại đầu đến:

  | Lựa chọn | Ý nghĩa | Hệ quả trong hệ thống |
  |---|---|---|
  | 🏠 **Khách tự đến lấy** | Người nhận ra VP lấy tự lấy | Hàng về kho → chuyển thẳng "Khách đã nhận" |
  | 📞 **Gọi điện báo khách** | Nhân viên gọi báo, khách đến lấy | Hàng về kho → bước "Đã báo khách" → "Khách đã nhận" |
  | 🚐 **Giao tận nơi** | Nhân viên mang hàng đến địa chỉ | Hàng về kho → "Đang giao" → "Khách đã nhận" |

  > ⚠️ Chọn đúng hình thức giao để luồng xử lý tại VP nhận diễn ra đúng thứ tự.

**🟦 THÔNG TIN NGƯỜI GỬI:**
- **Đơn vị gửi** — Gõ tên/SĐT để tự động gợi ý từ danh sách khách hàng
- **Người gửi / Điện thoại / CCCD / Địa chỉ** — Tự động điền khi chọn khách hàng

**🟩 THÔNG TIN NGƯỜI NHẬN:**
- Tương tự người gửi — có thể chọn từ danh sách hoặc nhập mới

**🟧 THÔNG TIN HÀNG:**
- Nhập số lượng từng loại: **Kiện**, **Bao**, **Cái**, **Kg**
- Nhập **Giá trị hàng** và **Trọng lượng**
- Nhập **Thu hộ (COD)** nếu cần thu tiền hộ người gửi

**Lưu biên nhận:**
- **Lưu & thêm mới** — Lưu rồi mở ngay form tạo mới tiếp theo
- **Lưu & in** — Lưu rồi in biên nhận ra giấy ngay
- **Lưu** — Chỉ lưu vào hệ thống

### 3.4 Xem Chi Tiết Biên Nhận

Nhấn vào một biên nhận trong danh sách để xem chi tiết ở khung bên phải.

![Chi tiết biên nhận](/screenshots/09-bien-nhan-detail.png)
*Khung chi tiết biên nhận — Hiển thị đầy đủ thông tin, trạng thái và lịch sử*

**Các thông tin hiển thị trong chi tiết:**
- 🟦 **Thông tin người nhận** — Đơn vị, tên, SĐT, CCCD, địa chỉ
- 🟧 **Thông tin hàng** — Số lượng, giá trị, trọng lượng; cờ "Hàng hư/hỏng/bể không đến"
- 🟪 **Thanh toán & Giao hàng** — Hình thức giao, thu hộ COD, tiến trình thu hộ
- 🟩 **Trạng thái vận chuyển** — Thanh tiến trình trực quan theo các bước
- 📋 **Lịch sử** — Nhật ký thay đổi trạng thái kèm thời gian

**Các nút hành động trong chi tiết:**
- **In** — In biên nhận PDF
- **+ Thêm** — Tạo biên nhận mới
- **🗑 Xóa** — Xóa biên nhận *(chỉ admin, chỉ khi chưa có phát sinh)*
- **✏️ Sửa** — Chỉnh sửa thông tin biên nhận
- **In số BN** — In sổ tổng hợp

### 3.5 Các Trạng Thái Vận Chuyển

![Thanh trạng thái vận chuyển](/screenshots/10-bien-nhan-status-badges.png)
*Thanh tiến trình vận chuyển — Mỗi bước được đánh dấu màu xanh khi hoàn thành*

Hệ thống theo dõi hàng hóa qua **5 bước chính**:

| Trạng thái | Ý nghĩa |
|---|---|
| 🔵 **Chờ VC** | Biên nhận đã tạo, hàng đang chờ xuất đi |
| 🔵 **Đang vận chuyển** | Hàng đang trên đường vận chuyển giữa các văn phòng |
| 🔵 **Đã đến kho** | Hàng đã về đến kho văn phòng nhận đích |
| 🔵 **Đang giao** | Nhân viên đang giao hàng đến tay người nhận |
| 🔵 **Khách đã nhận** | Giao hàng thành công, hoàn tất hành trình |

> Trạng thái được cập nhật bởi nhân viên tại các module **Chờ vận chuyển** và **Giao nhận hàng**.

---

## 4. Quản Lý Vận Chuyển

### 4.1 Chờ Vận Chuyển

Module **Chờ vận chuyển** hiển thị tất cả biên nhận đang ở trạng thái "Chờ giao xe" — tức là hàng đã tiếp nhận nhưng chưa được xuất đi.

![Trang Chờ vận chuyển](/screenshots/11-cho-van-chuyen.png)
*Trang Chờ vận chuyển — Danh sách hàng đang chờ xuất đi kèm tổng cước và số COD*

**Thông tin hiển thị:**

| Vùng thống kê | Mô tả |
|---|---|
| 📦 **Chờ giao xe** | Số biên nhận đang chờ xuất đi |
| 💰 **Tổng cước** | Tổng giá trị cước của hàng chờ |
| 📷 **Có thu hộ (COD)** | Số biên nhận có tiền thu hộ — tag "CẦN THU" màu đỏ |

**Bảng danh sách:**
- **Mã BN** — Mã biên nhận
- **VP nhận** — Văn phòng đích (badge màu)
- **Chành** — Đối tác chành xe nếu giao qua chành
- **Người gửi** — Tên và SĐT người gửi
- **Hàng hóa** — Số kiện/bao/cái
- **Cước** — Tiền cước (màu cam = chưa thu)
- **COD** — Tiền thu hộ (màu đỏ = cần thu)
- **Nút Giao xe** — Nhấn để xuất hàng ngay cho biên nhận đó

**Cách giao xe hàng loạt:**

![Chọn biên nhận và giao xe](/screenshots/12-cho-van-chuyen-action.png)
*Sau khi chọn checkbox — Nút "Giao xe X BN" xuất hiện để giao hàng loạt*

1. Chọn ✅ **checkbox** bên trái các biên nhận cần giao
2. Thanh hành động xuất hiện phía trên: nút **"Giao xe X BN"** (X = số lượng đã chọn)
3. Nhấn **Giao xe X BN** → Hộp thoại xác nhận → Nhấn **Xác nhận**
4. Trạng thái các biên nhận chuyển sang **Đang vận chuyển**

> 💡 Có thể giao từng biên nhận riêng lẻ bằng nút **Giao xe** ở cuối mỗi dòng mà không cần chọn checkbox.

### 4.2 Giao Nhận Hàng

Module **Giao nhận hàng** (Hàng đến) quản lý hàng hóa đã về đến kho văn phòng nhận, theo dõi qua các giai đoạn đến khi giao cho khách.

![Trang Giao nhận hàng](/screenshots/13-hang-den.png)
*Trang Giao nhận hàng — Chia theo tabs theo từng giai đoạn xử lý*

**Các tab trạng thái:**

| Tab | Ý nghĩa |
|---|---|
| 🚛 **Đang đến** | Hàng đang trên đường vận chuyển đến kho |
| 🏭 **Tại kho** | Hàng đã về kho, đang chờ xử lý giao |
| 📞 **Đã báo khách** | Đã liên hệ khách, chờ khách đến lấy hoặc xếp giao |
| 🚐 **Đang giao** | Hàng đang trên đường giao đến tay khách |
| 🏳️ **Đã giao Chành** | Hàng đã bàn giao cho chành xe trung chuyển |

**Các thao tác trên từng tab:**

![Hành động trên Giao nhận hàng](/screenshots/14-hang-den-action.png)
*Sau khi chọn checkbox — Thanh hành động xuất hiện với các lựa chọn phù hợp từng giai đoạn*

- **Xác nhận đến kho** — Xác nhận hàng đã về kho (tab Đang đến)
- **Đã báo khách** — Ghi nhận đã liên hệ khách (tab Tại kho)
- **Giao hàng** — Bắt đầu vận chuyển đến tay khách (tab Đã báo khách)
- **Khách đã nhận** — Xác nhận giao thành công, kết thúc hành trình (tab Đang giao)

> 📷 Các badge màu **COD** và **Cước** giúp nhân viên biết ngay biên nhận nào cần thu tiền trước khi giao hàng.

> ℹ️ **Tại sao có biên nhận không qua bước "Đã báo khách"?**  
> Vì khi tạo biên nhận, người gửi đã chọn hình thức giao là **"Khách tự đến lấy"** — hàng về kho là coi như sẵn sàng để khách đến lấy, không cần bước báo thêm. Xem lại Mục 3.3 để hiểu thêm về Hình thức giao hàng.

---

## 5. Thu Hộ COD & Cước Nhận

### 5.1 Thu Hộ COD

**Thu hộ (COD)** — *Cash on Delivery* — là dịch vụ thu tiền hàng hóa hộ người gửi khi giao hàng đến tay người nhận.

![Trang Thu hộ COD](/screenshots/15-thu-ho-cod.png)
*Trang Thu hộ COD — Thanh thống kê trạng thái COD và danh sách biên nhận*

**Thanh thống kê trạng thái COD:**

| Trạng thái | Màu | Ý nghĩa |
|---|---|---|
| ⏰ **Chờ thu** | Cam | COD chưa được thu — cần thu khi giao hàng |
| 📍 **Chành đã thu** | Xám | Chành xe đã thu COD hộ, chưa nộp về VP |
| ✅ **Đã thu** | Xanh | VP nhận đã thu được tiền COD |
| ✂️ **Chờ chuyển** | Vàng | COD đã thu, đang gom để lập phiếu chuyển về VP gửi |
| 📤 **Đã chuyển** | Tím | Đã lập phiếu và chuyển tiền về VP gửi |
| 🏁 **Hoàn tất** | Xanh lá | VP gửi đã nhận tiền, đã trả cho người gửi hàng |

**Hai tab chức năng:**
- **Biên nhận COD** — Danh sách biên nhận có COD và thao tác thu tiền
- **Phiếu chuyển COD** — Quản lý phiếu chuyển tiền COD liên văn phòng

![Tab Phiếu chuyển COD](/screenshots/16-thu-ho-tabs.png)
*Tab Phiếu chuyển COD — Tạo và quản lý phiếu chuyển tiền giữa các văn phòng*

**Quy trình xử lý COD đầy đủ:**
1. Nhân viên nhấn **Khách đã nhận** → COD **tự động thu** nếu giao trực tiếp (không qua chành)
2. Nếu giao qua chành → Vào **Thu hộ COD** → Tìm biên nhận → Nhấn **"Chành đã thu"** → khi chành nộp tiền về → Nhấn **"Đã thu"**
3. Nhân viên VP nhận chọn các biên nhận đã ở trạng thái **Đã thu** → Nhấn **Lập phiếu** → Tạo **Phiếu chuyển COD**
4. VP nhận chuyển tiền thực tế cho VP gửi (chuyển khoản hoặc tiền mặt)
5. VP gửi vào tab **Phiếu chuyển COD** → Tìm phiếu → Nhấn **Xác nhận đã nhận** → Trạng thái **Hoàn tất** ✅
6. VP gửi trả tiền COD lại cho người gửi hàng → Vào **Thu hộ COD** → Chọn các biên nhận → Nhấn **Trả lô** để ghi nhận đã hoàn trả

> ℹ️ **Lưu ý:** Bước 1 diễn ra tự động khi nhấn "Khách đã nhận" — trừ trường hợp giao qua chành.

**Khi tự động thu thất bại (thấy cảnh báo sau khi nhấn "Khách đã nhận"):**
1. Vào menu **Thu hộ COD**
2. Lọc theo trạng thái **Chờ thu**
3. Tìm biên nhận tương ứng → Nhấn **Thu COD thủ công**
4. Xác nhận → COD chuyển sang trạng thái **Đã thu**

### 5.2 Cước Nhận

**Cước nhận** là cước vận chuyển do **người nhận hàng** thanh toán (khác với cước gửi do người gửi trả).

![Trang Cước nhận](/screenshots/17-cuoc-nhan.png)
*Trang Cước nhận — Quản lý và thu cước từ người nhận hàng*

**Thanh thống kê trạng thái cước nhận:**

| Trạng thái | Màu | Ý nghĩa |
|---|---|---|
| ⏰ **Chưa thu** | Cam | Cước nhận chưa được thu |
| ✅ **Đã thu** | Xanh | VP nhận đã thu được cước từ người nhận |
| ✂️ **Chờ chuyển** | Vàng | Đang gom để lập phiếu chuyển cước về VP gửi |
| 🏁 **Hoàn tất** | Xanh lá | VP gửi đã nhận cước, hoàn tất chu trình |

**Hai tab chức năng:**
- **Biên nhận cước** — Danh sách biên nhận cần thu cước nhận
- **Phiếu chuyển cước** — Quản lý phiếu chuyển tiền cước liên văn phòng

**Quy trình thu cước nhận đầy đủ:**
1. Cước nhận **tự động kích hoạt** khi nhấn "Khách đã nhận"
2. Nhân viên VP nhận thu tiền cước từ người nhận → vào **Cước nhận** → Tab **Biên nhận cước** → Nhấn **Thu cước** → Trạng thái **Đã thu**
3. Chọn các biên nhận đã thu → Nhấn **Lập phiếu chuyển cước** → Phiếu được tạo
4. **VP Nhận** chuyển tiền thực tế → Vào tab **Phiếu chuyển cước** → Nhấn **Xác nhận đã gửi tiền**
5. **VP Gửi** vào tab **Phiếu chuyển cước** → Tìm phiếu → Nhấn **Xác nhận đã nhận tiền** → **Hoàn tất** ✅

> ⚠️ **Lưu ý:** Cả VP Nhận và VP Gửi đều có bước xác nhận riêng. VP Nhận phải xác nhận đã gửi tiền trước, rồi VP Gửi mới xác nhận đã nhận.

**Khi tự động thu cước thất bại (thấy cảnh báo sau khi nhấn "Khách đã nhận"):**
1. Vào menu **Cước nhận** → Tab **Biên nhận cước**
2. Lọc theo trạng thái **Chưa thu**
3. Tìm biên nhận tương ứng → Nhấn **Thu cước thủ công**
4. Xác nhận → Cước chuyển sang trạng thái **Đã thu**, tiếp tục quy trình bình thường

---



## 6. Tài Chính & Báo Cáo

### 6.1 Bảng Kê HĐĐT *(Admin only)*

**Bảng kê HĐĐT** (Hóa đơn điện tử) hỗ trợ quản lý xuất hóa đơn VAT cho các khách hàng doanh nghiệp.

![Bảng kê HĐĐT](/screenshots/18-bang-ke-hddt.png)
*Trang Bảng kê HĐĐT — Tạo và quản lý danh sách hóa đơn điện tử theo tháng*

> Chỉ tài khoản **Admin** mới truy cập được module này.

**Bước 1 — Quản lý Danh Mục Doanh Nghiệp (làm một lần):**

Trước khi lập bảng kê, cần tạo danh sách các doanh nghiệp cần xuất hóa đơn:
1. Vào **Bảng kê HĐĐT** → Nhấn tab **Doanh nghiệp**
2. Nhấn **+ Thêm doanh nghiệp** → Điền tên, mã số thuế, địa chỉ
3. Nhấn **Lưu**. Doanh nghiệp sẽ xuất hiện trong danh sách các tháng sau
4. Có thể **bật/tắt** từng doanh nghiệp nếu họ tạm ngưng hợp tác

**Bước 2 — Lập Bảng Kê Hàng Tháng:**
1. Chọn tháng/năm → Nhấn **Xem**
2. Kiểm tra danh sách biên nhận theo từng doanh nghiệp
3. Nhấn **Xuất bảng kê** để tải file về máy

> Chỉ tài khoản **Admin** mới truy cập được module này.

### 6.2 Bảng Kê Công Nợ *(Admin only)*

**Bảng kê công nợ** theo dõi các khoản cước ghi nợ cho khách hàng doanh nghiệp, hỗ trợ đối soát cuối tháng.

![Bảng kê công nợ](/screenshots/19-cong-no.png)
*Trang Bảng kê công nợ — Thống kê tổng nợ theo từng đối tượng khách hàng*

**Hai phần chính:**

**Bảng kê công nợ cuối tháng:**
- Chọn **Tháng / Năm** → Nhấn **Xem** để tải dữ liệu
- Hiển thị theo từng đối tượng khách hàng: **Số CN** (số công nợ), **Tổng**, **Đã thu**, **Còn nợ**
- Nhấn vào từng đối tượng để xem chi tiết từng biên nhận công nợ

**Ghi nhận Thanh Toán Công Nợ:**

Khi khách doanh nghiệp đã thanh toán (cuối tháng), thực hiện:
1. Chọn **Tháng / Năm** → Nhấn **Xem**
2. Nhấn vào tên đối tượng khách hàng vừa thanh toán
3. Kiểm tra danh sách biên nhận → Chọn các biên nhận cần ghi nhận (checkbox)
4. Nhấn **Xác nhận thanh toán**
5. Chọn **Hình thức**: Tiền mặt hoặc Chuyển khoản → Điền ghi chú (nếu cần) → Xác nhận
6. Hệ thống tự tạo **phiếu thu** và cập nhật trạng thái các biên nhận

**Xuất Báo Cáo Công Nợ:**
- Nhấn nút **Xuất Excel** → Tải file Excel về máy (gửi khách hàng hoặc lưu trữ)
- Nhấn nút **Xuất PDF** → Tải file PDF để in hoặc gửi qua email

**Đối soát cước — Phát hiện bất thường HĐĐT:**
- So sánh cước thực tế gửi trong tháng với giá trị HĐĐT đã/đang xuất
- Cảnh báo khi xuất HĐĐT cao hơn cước thực tế
- Cột **Chênh lệch** màu đỏ = bất thường cần kiểm tra

### 6.3 Báo Cáo Doanh Thu

**Báo cáo doanh thu** hiển thị thống kê doanh thu theo khoảng thời gian tùy chọn với biểu đồ trực quan.

![Báo cáo doanh thu](/screenshots/20-doanh-thu.png)
*Báo cáo doanh thu — Biểu đồ cột và bảng thống kê theo ngày/tuần/tháng/năm*

**Bộ lọc báo cáo:**
- **Từ ngày / Đến ngày** — Khoảng thời gian cần xem
- **VP gửi** — Lọc theo văn phòng (hoặc "Tất cả")
- **Nhóm theo** — Chọn nhóm: **Ngày**, **Tuần**, **Tháng**, **Năm**

**Thẻ thống kê tổng quan:**

| Thẻ | Mô tả |
|---|---|
| 📦 **Số biên nhận** | Tổng số BN trong kỳ |
| 💰 **Tổng doanh thu** | Tổng giá trị cước |
| ✅ **Đã thu** | Cước đã được thu |
| ⚠️ **Chưa thu + Nợ** | Cước tồn đọng |
| % **Tỷ lệ thu hồi** | Phần trăm đã thu trên tổng |

**Biểu đồ cột:**
- 🔵 **Tổng cước** — Tổng cước phát sinh mỗi kỳ
- 🟢 **Đã thu** — Phần đã được thu

---

## 7. Quản Trị Hệ Thống

> Tất cả các module trong mục này chỉ dành cho **Admin**.

### 7.1 Quản Lý Khách Hàng

![Danh sách khách hàng](/screenshots/21-khach-hang-list.png)
*Trang Quản lý khách hàng — Danh sách toàn bộ khách hàng với bộ lọc*

**Các thao tác:**
- **Tìm kiếm** theo tên, SĐT, mã số thuế
- **Lọc** theo loại khách (Doanh nghiệp / Cá nhân) và trạng thái (Hoạt động / Ngưng)
- Nhấn **+ Thêm mới** để tạo khách hàng mới
- Nhấn vào dòng khách hàng để xem/sửa thông tin

**Form thêm/sửa khách hàng:**

![Form thêm khách hàng](/screenshots/22-khach-hang-form.png)
*Form thêm khách hàng — Hỗ trợ 2 loại: Doanh nghiệp và Cá nhân*

**Thông tin điền khi tạo khách hàng:**
- **Loại khách hàng** — Doanh nghiệp hoặc Cá nhân
- **Tên đơn vị / Tên cá nhân**
- **Người liên hệ** (với doanh nghiệp)
- **Điện thoại** *(bắt buộc)*
- **Email, Địa chỉ, CCCD, Mã số thuế**
- **Ghi chú** — Ghi chú nội bộ về khách hàng

### 7.2 Quản Lý Nhân Viên

![Quản lý nhân viên](/screenshots/23-nhan-vien.png)
*Trang Quản lý nhân viên — Danh sách tài khoản, role và trạng thái hoạt động*

**Thông tin hiển thị:**
- **Mã NV** — Ví dụ: `NV-SG-001`
- **Họ tên** và **Tài khoản đăng nhập**
- **Văn phòng** — VP SG / CT / RG
- **Role** — Admin hoặc Staff
- **Trạng thái** — Đang hoạt động / Bị khóa

**Thao tác quản lý nhân viên:**
- **+ Thêm nhân viên** — Tạo tài khoản mới, hệ thống tự sinh mật khẩu tạm
- **Kích hoạt / Khóa** — Bật/tắt quyền đăng nhập của nhân viên (Admin chủ động khóa)
- **Reset mật khẩu** — Admin reset mật khẩu về mặc định cho nhân viên
- **Mở khóa** — Xem giải thích bên dưới

> 🔒 Nhân viên mới sẽ được yêu cầu đổi mật khẩu lần đầu khi đăng nhập.

**Phân biệt hai loại khóa tài khoản:**

| Loại khóa | Nguyên nhân | Nhìn thấy |Để mở khóa |
|---|---|---|---|
| **Khóa thủ công** | Admin chủ động khóa | Trạng thái "Khóa" | Nhấn **Kích hoạt** |
| **Khóa brute-force** | Hệ thống tự khóa do nhập sai mật khẩu nhiều lần | Trạng thái "Khóa" (có biểu tượng 🔐) | Nhấn **Mở khóa** |

> ⚠️ Nếu nhân viên bị khóa do nhập sai mật khẩu nhiều lần, Admin phải dùng nút **Mở khóa** (không phải **Kích hoạt**). Sau khi mở khóa, nên **Reset mật khẩu** ngay để bảo mật.

### 7.3 Quản Lý Văn Phòng

![Quản lý văn phòng](/screenshots/24-van-phong.png)
*Trang Quản lý văn phòng — Thông tin liên hệ và địa chỉ các văn phòng*

**Thông tin mỗi văn phòng:**
- **Mã VP** — Ví dụ: SG, CT, RG
- **Tên đầy đủ**
- **Địa chỉ** và **Điện thoại**

### 7.4 Quản Lý Chành

![Quản lý chành](/screenshots/25-chanh.png)
*Trang Quản lý chành — Danh sách đối tác vận chuyển trung gian*

**Chành** là các đơn vị vận chuyển trung gian (xe khách, tàu thủy, v.v.) được TMQ Express sử dụng để giao hàng đến các địa điểm không có văn phòng.

**Thông tin mỗi chành:**
- Tên chành, địa chỉ bến/điểm nhận hàng
- Người liên hệ và điện thoại
- Ghi chú hoạt động và trạng thái (Hoạt động / Ngưng)

---

## 8. Quét Mã QR Xem Tình Trạng Hàng Hóa

### 8.1 Cách Xem Tình Trạng Hàng

Hệ thống cho phép khách hàng tự kiểm tra tình trạng hàng hóa mà không cần đăng nhập tài khoản. Để bảo mật thông tin và tránh nhầm lẫn giữa các ngày khác nhau, hệ thống chỉ hỗ trợ xem bằng cách quét mã QR trên phiếu.

![Mã QR trên phiếu giao hàng](/screenshots/26-scan-home.png)
*Trang tra cứu hàng hóa — Khách hàng quét mã QR trên phiếu giao hàng để xem tình trạng*

**Các bước thực hiện:**
1. Mở **camera** hoặc ứng dụng **Zalo** trên điện thoại.
2. Hướng camera vào hình **mã QR** (ô vuông đen trắng) in ở góc phiếu giao hàng.
3. Bấm vào đường link hiện ra trên màn hình điện thoại để xem ngay kết quả.

### 8.2 Kết Quả Hiển Thị

![Kết quả tra cứu vận đơn](/screenshots/27-scan-result.png)
*Trang hiển thị kết quả — Cho biết hàng đang đi đến đâu*

**Các thông tin khách hàng sẽ nhìn thấy:**
- **Thành phần hành trình:** Các chặng vận chuyển, chặng nào đang thực hiện sẽ được tô màu rõ ràng.
- **Tuyến đường:** Nơi gửi → Nơi nhận.
- **Hàng hóa:** Số lượng kiện hoặc bao hàng.
- **Nhật ký chi tiết:** Ghi rõ ngày giờ hàng đi qua từng bước để khách tiện theo dõi.

> 💡 **Chia sẻ link:** Khách hàng có thể copy đường link hiển thị trên trình duyệt sau khi quét mã QR để gửi cho người nhận hoặc người gửi cùng theo dõi hành trình của đơn hàng.

---

## 9. Tiện Ích Chung

### 9.1 In Biên Nhận PDF

Hệ thống cho phép in biên nhận trực tiếp từ giao diện, không cần phần mềm ngoài.

![In biên nhận](/screenshots/09-bien-nhan-detail.png)
*Nút "In" trong khung chi tiết biên nhận — Nhấn để xuất PDF ngay lập tức*

**Cách in biên nhận:**
1. Mở chi tiết biên nhận cần in (nhấn vào dòng biên nhận trong danh sách)
2. Trong khung chi tiết bên phải, nhấn nút **In** (🖨️)
3. Hộp thoại in của trình duyệt sẽ mở ra
4. Chọn máy in hoặc "Lưu dưới dạng PDF" → Nhấn **In**

> 💡 **Mẹo:** Dùng chức năng "Lưu dưới dạng PDF" để lưu biên nhận vào máy tính hoặc gửi qua email cho khách hàng.

### 9.2 In Sổ Tổng Hợp

**In sổ tổng hợp** (In số BN) cho phép in danh sách biên nhận đang hiển thị theo bộ lọc hiện tại — tiện dụng để in báo cáo theo ngày/tuần hoặc theo tuyến.

![Nút In sổ và Xuất Excel](/screenshots/28-bien-nhan-export.png)
*Trong khung chi tiết biên nhận — Nút "In số BN" và "Xuất Excel" nằm cạnh nhau ở khu vực header*

**Cách in sổ tổng hợp (PDF):**
1. Vào trang **Biên nhận**, thiết lập bộ lọc theo nhu cầu (ví dụ: VP gửi = SG, ngày = hôm nay)
2. Trong khung chi tiết, nhấn nút **In số BN**
3. Hệ thống in danh sách tất cả biên nhận theo bộ lọc đang chọn

**Xuất sổ biên nhận ra file Excel:**
1. Thiết lập bộ lọc theo nhu cầu trên trang **Biên nhận**
2. Nhấn nút **Xuất Excel** (bên cạnh nút "In số BN")
3. File Excel tự động tải về máy — có thể mở bằng Excel hoặc Google Sheets

> 📋 Dùng **PDF** để in, dùng **Excel** khi cần tính toán hoặc gửi kế toán.

### 9.3 Thao Tác Hàng Loạt (Bulk Action)

Nhiều module hỗ trợ **chọn nhiều bản ghi và thao tác một lần**, giúp tiết kiệm thời gian xử lý.

![Bulk action giao xe](/screenshots/12-cho-van-chuyen-action.png)
*Thanh hành động xuất hiện khi chọn checkbox — Số lượng đã chọn hiển thị trên nút*

**Các module hỗ trợ bulk action:**

| Module | Thao tác hàng loạt |
|---|---|
| 🚚 **Chờ vận chuyển** | Giao xe nhiều biên nhận cùng lúc |
| 🏭 **Giao nhận hàng** | Xác nhận đến kho / Báo khách / Giao hàng / Khách đã nhận |
| 💵 **Thu hộ COD** | Lập phiếu chuyển COD gom nhiều BN |
| 🚢 **Cước nhận** | Lập phiếu chuyển cước gom nhiều BN |

**Cách thực hiện bulk action:**
1. Tích ✅ **checkbox** bên trái các bản ghi cần thao tác
   - Tích checkbox ở **dòng tiêu đề** để chọn tất cả
2. **Thanh hành động** hiện ra phía trên bảng với các nút tương ứng
3. Nhấn nút hành động mong muốn → **Hộp thoại xác nhận** xuất hiện
4. Nhấn **Xác nhận** để hoàn thành

> ⚠️ Thao tác bulk **không thể hoàn tác**. Kiểm tra kỹ danh sách đã chọn trước khi xác nhận.

### 9.4 Thanh Menu Sidebar

![Sidebar Admin](/screenshots/03-sidebar-admin.png)
*Sidebar mở rộng — Nhấn logo TMQ để thu/mở, tạo thêm không gian làm việc*

**Các tính năng của sidebar:**

| Thao tác | Mô tả |
|---|---|
| **Nhấn logo TMQ** (góc trên trái) | Thu/mở sidebar. Khi thu: chỉ hiện icon. Khi mở: hiện icon + nhãn đầy đủ |
| **Nhấn vào mục menu** | Điều hướng đến trang tương ứng |
| **Mục đang active** | Được tô màu nền phân biệt với các mục khác |
| **Nút Đổi mật khẩu** | Ở cuối sidebar, truy cập nhanh không cần vào menu người dùng |

**Cấu trúc menu theo nhóm:**
- 🚛 **VẬN HÀNH** — Biên nhận, Chờ VC, Giao nhận, Khách hàng
- 💳 **TÀI CHÍNH** — HĐĐT*, Công nợ*, COD, Cước nhận, Báo cáo
- ⚙️ **QUẢN TRỊ*** — Văn phòng, Nhân viên, Chành

> *Chỉ admin mới thấy các mục đánh dấu *

### 9.5 Đổi Mật Khẩu Lần Đầu (Bắt Buộc)

![Form đổi mật khẩu](/screenshots/05-change-password.png)
*Form đổi mật khẩu — Nhập mật khẩu cũ, mật khẩu mới và xác nhận*

Khi Admin tạo tài khoản nhân viên mới, hệ thống sẽ **tự động yêu cầu đổi mật khẩu** ngay lần đăng nhập đầu tiên.

**Luồng đổi mật khẩu bắt buộc:**
1. Nhân viên đăng nhập bằng mật khẩu tạm do Admin cấp
2. Hệ thống **chuyển ngay** đến trang đổi mật khẩu (không vào được trang khác)
3. Nhân viên điền: **Mật khẩu hiện tại** → **Mật khẩu mới** → **Xác nhận mật khẩu mới**
4. Nhấn **Lưu** → Đăng nhập lại với mật khẩu mới

**Yêu cầu mật khẩu:**
- Tối thiểu **6 ký tự**
- Mật khẩu mới **phải khác** mật khẩu hiện tại
- Hai ô "Mật khẩu mới" và "Xác nhận" phải **khớp nhau**

> 🔒 Để đổi mật khẩu bất kỳ lúc nào (không bắt buộc): Nhấn tên người dùng góc trên phải → **Đổi mật khẩu**, hoặc nhấn nút **Đổi mật khẩu** ở cuối sidebar.

---

## 10. Phiếu Chuyển Liên Văn Phòng

Khi VP nhận thu được tiền (COD hoặc cước nhận), tiền này cần được chuyển về VP gửi. Hệ thống dùng **Phiếu chuyển** để ghi nhận và xác nhận quá trình này.

### 10.1 Lập Phiếu Chuyển COD

**Tình huống:** VP Cần Thơ (CT) đã thu COD từ nhiều khách hàng, cần chuyển tiền về VP TP.HCM (SG).

![Tab Phiếu chuyển COD](/screenshots/16-thu-ho-tabs.png)
*Tab Phiếu chuyển COD — Danh sách phiếu đã lập và trạng thái xử lý*

**Bước 1 — Chuẩn bị (tại VP nhận):**
1. Vào menu **Thu hộ (COD)** → Tab **Biên nhận COD**
2. Xác nhận trạng thái các BN cần chuyển là **Đã thu** (màu xanh)
3. Tích ✅ checkbox các biên nhận muốn gom vào phiếu

**Bước 2 — Lập phiếu:**
4. Nhấn nút **Lập phiếu chuyển** trong thanh hành động
5. Hộp thoại xác nhận hiển thị: tổng số BN, tổng tiền COD
6. Nhấn **Xác nhận** → Phiếu chuyển được tạo, trạng thái COD → **Chờ chuyển**

**Bước 3 — Chuyển tiền thực tế:**
7. Chuyển khoản/gửi tiền mặt cho VP gửi theo thông thường
8. Thông báo cho VP gửi mã phiếu chuyển

**Bước 4 — Xác nhận nhận tiền (tại VP gửi):**
9. VP gửi vào **Thu hộ (COD)** → Tab **Phiếu chuyển COD**
10. Tìm phiếu tương ứng (trạng thái **Đã chuyển**)
11. Nhấn **Xác nhận đã nhận** → Trạng thái → **Hoàn tất** ✅

> ℹ️ Khi VP gửi xác nhận, toàn bộ biên nhận trong phiếu chuyển sang trạng thái **Hoàn tất** — chu trình COD kết thúc.

### 10.2 Lập Phiếu Chuyển Cước Nhận

**Tình huống:** VP Rạch Giá (RG) đã thu cước nhận từ người nhận hàng, cần chuyển về VP TP.HCM (SG).

![Cước nhận](/screenshots/17-cuoc-nhan.png)
*Trang Cước nhận — Trạng thái và danh sách biên nhận cần thu cước*

**Quy trình tương tự phiếu chuyển COD:**

1. Vào menu **Cước nhận** → Tab **Biên nhận cước**
2. Xác nhận các BN đã ở trạng thái **Đã thu**
3. Tích ✅ checkbox các BN cần gom → Nhấn **Lập phiếu chuyển cước**
4. Xác nhận → Phiếu được tạo, trạng thái → **Chờ chuyển**
5. Chuyển tiền thực tế cho VP gửi
6. **VP Nhận** vào tab **Phiếu chuyển cước** → Tìm phiếu → Nhấn **Xác nhận đã gửi tiền**
7. **VP Gửi** vào tab **Phiếu chuyển cước** → Tìm phiếu → Nhấn **Xác nhận đã nhận tiền**
8. Trạng thái → **Hoàn tất** ✅

> ⚠️ Cần thực hiện đúng thứ tự: VP Nhận xác nhận trước (bước 6), VP Gửi xác nhận sau (bước 7).

**So sánh hai loại phiếu chuyển:**

| | Phiếu chuyển COD | Phiếu chuyển Cước nhận |
|---|---|---|
| **Tiền từ đâu** | Người nhận hàng trả hộ người gửi | Người nhận hàng trả cước vận chuyển |
| **Chuyển về đâu** | VP gửi (để trả lại cho người gửi hàng) | VP gửi (doanh thu vận chuyển) |
| **Trạng thái hoàn tất** | VP gửi xác nhận → Hoàn tất | VP gửi xác nhận → Hoàn tất |
| **Module quản lý** | Thu hộ (COD) | Cước nhận |

---

## 11. Bảng Thuật Ngữ

Bảng giải thích các thuật ngữ chuyên ngành và ký hiệu thường gặp trong hệ thống.

### Thuật Ngữ Nghiệp Vụ

| Thuật ngữ | Giải thích |
|---|---|
| **Biên nhận (BN)** | Chứng từ tiếp nhận hàng hóa vận chuyển, còn gọi là vận đơn. Mỗi BN có mã duy nhất dạng `VPGVPN-XXXX` |
| **Cước** | Phí vận chuyển hàng hóa giữa hai văn phòng |
| **Cước gửi** | Cước do người gửi hàng thanh toán ngay tại điểm gửi |
| **Cước nhận** | Cước do người nhận hàng thanh toán khi nhận hàng tại điểm đến |
| **COD** | *Cash on Delivery* — Thu hộ tiền hàng hóa từ người nhận, sau đó chuyển về cho người gửi |
| **Công nợ** | Hình thức ghi nợ cước — khách hàng doanh nghiệp thanh toán theo tháng thay vì trả ngay |
| **Chành** | Đơn vị vận chuyển trung gian (xe khách, tàu thủy, v.v.) — hàng gửi qua chành đến điểm đến không có VP TMQ |
| **Phiếu chuyển** | Chứng từ ghi nhận việc chuyển tiền (COD hoặc cước nhận) từ VP nhận về VP gửi |
| **Giao xe** | Thao tác xuất hàng đi — chuyển trạng thái biên nhận từ "Chờ VC" sang "Đang vận chuyển" |
| **HĐĐT** | Hóa đơn điện tử — hóa đơn VAT xuất cho khách hàng doanh nghiệp |
| **Hình thức giao** | Cách giao hàng đến tay người nhận: Khách tự đến lấy / Gọi điện báo / Giao tận nơi. Ảnh hưởng trực tiếp đến luồng xử lý tại VP nhận |
| **Auto-thu** | Hệ thống tự động thu COD hoặc cước nhận khi nhấn "Khách đã nhận". Nếu thất bại, cần thu thủ công |
| **Trả lô** | Thao tác VP Gửi xác nhận đã trả tiền COD lại cho người gửi hàng — bước cuối cùng của chu trình COD |
| **Biên nhận nội thành** | Biên nhận có VP gửi = VP nhận (giao nội thành). Mã dạng `NTSG-XXXX` thay vì `SGCT-XXXX` |

### Mã Văn Phòng

| Mã | Tên văn phòng | Ký hiệu trong mã BN |
|---|---|---|
| **SG** | TP. Hồ Chí Minh | Đầu tiên nếu là VP gửi, ví dụ: `SGCT-0001` |
| **CT** | Cần Thơ | Vị trí 2 nếu là VP đích, ví dụ: `SGCT-0001` (SG → CT) |
| **RG** | Rạch Giá | Vị trí 2 nếu là VP đích, ví dụ: `SGRG-0001` (SG → RG) |

### Ký Hiệu Màu Sắc

| Màu | Ý nghĩa thường gặp |
|---|---|
| 🟢 **Xanh lá** | Hoàn tất / Đã thu / Đang hoạt động |
| 🟠 **Cam** | Chờ xử lý / Cần thu tiền / Chưa hoàn thành |
| 🟡 **Vàng** | Chờ chuyển / Đang xử lý trung gian |
| 🔴 **Đỏ** | Cảnh báo / Cần thu COD / Bất thường cần kiểm tra |
| 🔵 **Xanh dương** | Đang vận chuyển / Thông tin trung tính |
| 🟣 **Tím** | Đã chuyển tiền, chờ xác nhận |
| ⚫ **Xám** | Chành đã thu, chờ nộp về VP |

### Trạng Thái Vận Chuyển

| Trạng thái | Ý nghĩa | Ai cập nhật |
|---|---|---|
| **Chờ VC** | Biên nhận đã tạo, hàng tại VP gửi | Tự động khi tạo BN |
| **Đang vận chuyển** | Hàng đã xuất, đang trên đường | NV VP gửi (Giao xe) |
| **Đã đến kho** | Hàng về đến VP nhận | NV VP nhận (Xác nhận đến kho) |
| **Đang giao** | NV đang giao đến tay khách | NV VP nhận (Giao hàng) |
| **Khách đã nhận** | Giao thành công, hoàn tất hành trình | NV VP nhận (Khách đã nhận) |

### Trạng Thái COD

| Trạng thái | Ý nghĩa |
|---|---|
| **Chờ thu** | COD chưa được thu — cần thu khi giao hàng |
| **Chành đã thu** | Chành xe thu tiền COD hộ VP, chưa nộp về |
| **Đã thu** | VP nhận đã thu được COD từ người nhận |
| **Chờ chuyển** | Đang gom để lập phiếu chuyển về VP gửi |
| **Đã chuyển** | Đã lập phiếu và chuyển tiền, chờ VP gửi xác nhận |
| **Hoàn tất** | VP gửi đã nhận tiền — chu trình COD kết thúc |

---

*Tài liệu được biên soạn bởi Antigravity AI - Tháng 06/2026*  
*Phiên bản hệ thống: TMQ Express ERP v1.0*
*Phiên bản tài liệu: 2.0 — Cập nhật thêm Phần 9, 10, 11*
