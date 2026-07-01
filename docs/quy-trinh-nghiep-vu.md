# Quy Trình Nghiệp Vụ — TMQ Express ERP

> **Phiên bản tài liệu:** 1.2  
> **Cập nhật lần cuối:** Tháng 06/2026  
> **Đối tượng:** Nhân viên vận hành — Hiểu toàn bộ luồng nghiệp vụ thực tế

---

## Viết Tắt Thường Dùng

| Viết tắt | Nghĩa đầy đủ |
|---|---|
| **NV** | Nhân viên |
| **VP** | Văn phòng |
| **BN** | Biên nhận (vận đơn) |
| **KH** | Khách hàng |
| **COD** | Thu hộ tiền hàng (*Cash on Delivery*) |
| **HĐDT** | Hóa đơn điện tử |
| **VC** | Vận chuyển |

---

## Mục Lục

1. [Chu Trình Cơ Bản — Hành Trình Một Đơn Hàng](#1-chu-trình-cơ-bản)
2. [Quy Trình COD Liên Văn Phòng](#2-quy-trình-cod-liên-văn-phòng)
3. [Quy Trình Cước Nhận Liên Văn Phòng](#3-quy-trình-cước-nhận-liên-văn-phòng)
4. [Quy Trình Công Nợ Cuối Tháng](#4-quy-trình-công-nợ-cuối-tháng)
5. [Quy Trình Giao Hàng Qua Chành](#5-quy-trình-giao-hàng-qua-chành)
6. [Quy Trình Xuất Hóa Đơn Điện Tử (HĐDT)](#6-quy-trình-xuất-hóa-đơn-điện-tử)
7. [Xử Lý Khi Tự Động Thu Thất Bại](#7-xử-lý-khi-tự-động-thu-thất-bại)

---

## 1. Chu Trình Cơ Bản

### Tổng Quan Hành Trình Một Đơn Hàng

Mỗi đơn hàng trong TMQ Express đi qua **5 giai đoạn chính**, được xử lý bởi nhân viên hai văn phòng khác nhau:

**Phía VP Gửi (SG):**
- ① **Tiếp nhận** — Tạo biên nhận, thu thập thông tin hàng hóa
- ② **Xuất hàng** — Giao xe, chuyển hàng đi

**Phía VP Nhận (CT/RG):**
- ③ **Nhận hàng** — Xác nhận hàng về kho
- ④ **Giao khách** — Báo khách, giao hàng đến tay người nhận
- ⑤ **Hoàn tất** — Xác nhận khách đã nhận, thu tiền (COD/cước)

---

### Giai Đoạn 1 — Tiếp Nhận Hàng (VP Gửi)

**Ai thực hiện:** Nhân viên VP gửi (SG/CT/RG)  
**Module:** Biên nhận → Tạo mới

![Form tạo biên nhận mới](/screenshots/08-bien-nhan-create.png)
*Form tạo biên nhận — Điền đầy đủ thông tin người gửi, người nhận và hàng hóa rồi nhấn Lưu & In*

**Các bước:**
1. Khách hàng mang hàng đến văn phòng
2. NV mở form **Tạo biên nhận** (nút `+ Thêm`)
3. Điền đầy đủ thông tin:
   - Người gửi / Người nhận (gợi ý tự động từ danh sách KH)
   - Hàng hóa: số kiện/bao/cái, trọng lượng, giá trị
   - **Giá cước** và **Hình thức thu cước** (Đã thu / Chưa thu / Công nợ)
   - **Thu hộ COD** (nếu có)
   - **VP nhận** (đích đến)
   - **Chành** (nếu giao qua đối tác)
4. Nhấn **Lưu & In** → In biên nhận giao cho khách

> ✅ Sau bước này: Biên nhận được tạo, trạng thái = **Chờ VC**

---

### Giai Đoạn 2 — Xuất Hàng (VP Gửi)

**Ai thực hiện:** Nhân viên VP gửi  
**Module:** Chờ vận chuyển

![Trang Chờ vận chuyển](/screenshots/11-cho-van-chuyen.png)
*Trang Chờ vận chuyển — Danh sách hàng đang chờ xuất đi kèm tổng cước và số COD*

**Các bước:**
1. Cuối buổi hoặc khi xe chuẩn bị đi, NV vào **Chờ vận chuyển**
2. Kiểm tra danh sách hàng chờ xuất đi
3. Tích ✅ checkbox các biên nhận cần giao xe

![Chọn biên nhận và giao xe](/screenshots/12-cho-van-chuyen-action.png)
*Sau khi chọn checkbox — Nút "Giao xe X BN" xuất hiện để giao hàng loạt*

4. Nhấn **Giao xe X BN** → Xác nhận

> ✅ Sau bước này: Trạng thái = **Đang vận chuyển**

---

### Giai Đoạn 3 — Nhận Hàng Tại Kho (VP Nhận)

**Ai thực hiện:** Nhân viên VP nhận (CT/RG)  
**Module:** Giao nhận hàng → Tab "Đang đến"

![Trang Giao nhận hàng](/screenshots/13-hang-den.png)
*Trang Giao nhận hàng — Chia theo tabs theo từng giai đoạn xử lý (Đang đến, Tại kho, Đã báo khách, Đang giao, Đã giao Chành)*

**Các bước:**
1. Khi xe hàng về đến kho, NV vào tab **Đang đến**
2. Tích ✅ checkbox các BN đã về kho
3. Nhấn **Xác nhận đến kho**

> ✅ Sau bước này: Trạng thái = **Đã đến kho** → BN chuyển sang tab "Tại kho"

---

### Giai Đoạn 4 — Thông Báo & Giao Hàng (VP Nhận)

**Ai thực hiện:** Nhân viên VP nhận  
**Module:** Giao nhận hàng

> ℹ️ **Lưu ý quan trọng:** Luồng xử lý Giai đoạn 4 phụ thuộc vào **Hình thức giao** đã chọn khi tạo biên nhận:
> - **Khách tự đến lấy** → hàng về kho chuyển thẳng sang "Khách đã nhận", không qua Báo khách
> - **Gọi điện báo khách** → bắt buộc qua bước Báo khách
> - **Giao tận nơi** → bắt buộc qua bước Đang giao

![Hành động trên Giao nhận hàng](/screenshots/14-hang-den-action.png)
*Sau khi chọn checkbox — Thanh hành động xuất hiện với các lựa chọn phù hợp từng giai đoạn*

**Bước 4a — Báo khách** *(áp dụng hình thức: Gọi điện báo)*:
1. Tab **Tại kho** → Chọn BN → Nhấn **Đã báo khách**
2. Gọi điện/nhắn tin thông báo → Trạng thái → **Đã báo khách**

**Bước 4b — Giao hàng** *(áp dụng hình thức: Giao tận nơi)*:
1. Tab **Đã báo khách** → Chọn BN → Nhấn **Giao hàng** → Trạng thái → **Đang giao**

**Bước 4c — Xác nhận giao thành công:**
1. Tab **Đang giao** → Chọn BN → Nhấn **Khách đã nhận** → Trạng thái → **Khách đã nhận**

> ⚠️ Badge màu trên từng BN: 🔴 **COD** = cần thu tiền hàng, 🟠 **Cước** = cần thu cước

---

### Giai Đoạn 5 — Hoàn Tất

Khi nhấn **Khách đã nhận**:
- Nếu BN có **COD** → COD tự động chuyển sang trạng thái **Đã thu**
- Nếu BN có **Cước nhận** → Cước nhận kích hoạt để thu từ người nhận
- Hành trình vận đơn hoàn tất, khách hàng có thể quét mã QR trên phiếu giao hàng để xem.

![Chi tiết biên nhận - thanh trạng thái](/screenshots/09-bien-nhan-detail.png)
*Chi tiết biên nhận — Thanh tiến trình hiển thị trực quan từng bước hoàn thành*

---

## 2. Quy Trình COD Liên Văn Phòng

### Tổng Quan

**Tại VP Nhận (CT/RG):**
- Khách nhận hàng → trả tiền COD → NV ghi nhận → gom phiếu → chuyển tiền về VP Gửi

**Tại VP Gửi (SG):**
- Nhận tiền từ VP Nhận → xác nhận → trả tiền lại cho người gửi hàng

![Trang Thu hộ COD](/screenshots/15-thu-ho-cod.png)
*Trang Thu hộ COD — Thanh thống kê trạng thái COD và danh sách biên nhận cần xử lý*

### Bước 1 — Thu COD (Tự Động)

Khi NV VP nhận xác nhận **Khách đã nhận**:
- Hệ thống **tự động** chuyển COD → trạng thái **Đã thu**
- Không cần thao tác thêm

### Bước 2 — Trường Hợp Giao Qua Chành

Nếu hàng giao qua chành (chành thu COD hộ):
1. Chành giao hàng và thu tiền COD từ khách
2. NV VP nhận vào **Thu hộ (COD)** → Tìm BN → Nhấn **Chành đã thu**
3. Trạng thái → **Chành đã thu** (chờ chành nộp tiền về VP)
4. Khi nhận được tiền từ chành, chuyển trạng thái → **Đã thu**

### Bước 3 — Lập Phiếu Chuyển COD

NV VP nhận thực hiện khi có đủ lượng tiền COD để chuyển:

1. **Thu hộ (COD)** → Tab **Biên nhận COD**
2. Lọc theo trạng thái **Đã thu**
3. Tích ✅ tất cả BN muốn gom vào phiếu
4. Nhấn **Lập phiếu chuyển** → Xác nhận
5. Phiếu được tạo → COD chuyển sang **Chờ chuyển**
6. Xem phiếu vừa tạo trong tab **Phiếu chuyển COD**

![Tab Phiếu chuyển COD](/screenshots/16-thu-ho-tabs.png)
*Tab Phiếu chuyển COD — Danh sách phiếu đã lập và trạng thái xử lý*

### Bước 4 — Chuyển Tiền Thực Tế

Sau khi lập phiếu:
1. Chuyển khoản hoặc gửi tiền mặt cho VP gửi
2. Thông báo mã phiếu chuyển cho VP gửi
3. Trạng thái phiếu → **Đã chuyển**

### Bước 5 — VP Gửi Xác Nhận Nhận Tiền

1. VP gửi vào **Thu hộ (COD)** → Tab **Phiếu chuyển COD**
2. Tìm phiếu (trạng thái **Đã chuyển**)
3. Kiểm tra số tiền → nhấn **Xác nhận đã nhận**
4. Trạng thái phiếu → **Hoàn tất** ✅

### Bước 6 — Trả Tiền COD Lại Cho Người Gửi Hàng

1. VP gửi vào **Thu hộ (COD)** → Tab **Biên nhận COD**
2. Lọc theo trạng thái **Hoàn tất**
3. Chọn các BN đã nhận tiền → nhấn **Trả lô**
4. Hệ thống ghi nhận đã hoàn trả cho người gửi hàng → Chu trình COD kết thúc hoàn toàn ✅

---

## 3. Quy Trình Cước Nhận Liên Văn Phòng

### Tổng Quan

**Tại VP Nhận (CT/RG):**
- Người nhận trả cước → NV thu và ghi nhận → gom phiếu → **xác nhận đã gửi tiền**

**Tại VP Gửi (SG):**
- Nhận tiền cước từ VP Nhận → **xác nhận đã nhận** → Hoàn tất

> ⚠️ Cước nhận **không tự động thu** — NV phải thu thủ công. Cả VP Nhận và VP Gửi đều có bước xác nhận riêng.

![Trang Cước nhận](/screenshots/17-cuoc-nhan.png)
*Trang Cước nhận — Thanh thống kê trạng thái và danh sách biên nhận cần thu cước*

### Bước 1 — Thu Cước Từ Người Nhận

1. Người nhận đến VP hoặc nhận hàng tại nhà, trả cước vận chuyển
2. NV vào **Cước nhận** → Tab **Biên nhận cước**
3. Tìm BN tương ứng → Nhấn **Thu cước**
4. Trạng thái → **Đã thu**

### Bước 2 — Lập Phiếu Chuyển Cước

1. **Cước nhận** → Tab **Biên nhận cước** → Lọc **Đã thu**
2. Tích ✅ các BN cần gom → Nhấn **Lập phiếu chuyển cước**
3. Xác nhận → Phiếu được tạo, trạng thái → **Chờ chuyển**

### Bước 3a — VP Nhận Xác Nhận Đã Gửi Tiền

1. Chuyển tiền cước về VP Gửi (chuyển khoản hoặc tiền mặt)
2. **VP Nhận** vào **Cước nhận** → Tab **Phiếu chuyển cước**
3. Tìm phiếu → nhấn **Xác nhận đã gửi tiền** → Trạng thái → **Đã chuyển**

### Bước 3b — VP Gửi Xác Nhận Đã Nhận Tiền

1. **VP Gửi** vào **Cước nhận** → Tab **Phiếu chuyển cước**
2. Tìm phiếu (trạng thái **Đã chuyển**) → nhấn **Xác nhận đã nhận tiền**
3. Trạng thái → **Hoàn tất** ✅

---

## 4. Quy Trình Công Nợ Cuối Tháng

### Dành Cho Khách Hàng Doanh Nghiệp

Khách hàng doanh nghiệp có thể gửi hàng mà không trả cước ngay — cước được ghi nợ và thanh toán cuối tháng.

### Bước 1 — Tạo Biên Nhận Công Nợ

Khi tạo biên nhận, chọn **Hình thức thu cước = Công nợ**.

![Form tạo biên nhận](/screenshots/08-bien-nhan-create.png)
*Khi tạo biên nhận, chọn "Công nợ" trong phần Hình thức thu cước*

> Biên nhận công nợ vẫn theo dõi vận chuyển bình thường, chỉ khác về tài chính.

### Bước 2 — Theo Dõi Công Nợ Trong Tháng

*(Admin only)* — Vào **Bảng kê công nợ**:

![Bảng kê công nợ](/screenshots/19-cong-no.png)
*Trang Bảng kê công nợ — Thống kê tổng nợ theo từng đối tượng khách hàng*

- Chọn **Tháng / Năm** → **Xem**
- Xem theo từng đối tượng: Số CN, Tổng cước, Đã thu, Còn nợ
- Nhấn vào đối tượng để xem chi tiết từng BN

### Bước 3 — Thu Nợ Cuối Tháng

1. Liên hệ khách hàng doanh nghiệp, thông báo số tiền nợ
2. Khách thanh toán (tiền mặt hoặc chuyển khoản)
3. Admin vào **Bảng kê công nợ** → Chọn tháng → Xem → Nhấn vào tên đối tượng
4. Chọn các BN cần ghi nhận (checkbox) → nhấn **Xác nhận thanh toán**
5. Chọn hình thức: **Tiền mặt** hoặc **Chuyển khoản** → Xác nhận
6. Hệ thống tự tạo phiếu thu, cập nhật trạng thái → **Đã thu**

### Bước 4 — Đối Soát HĐĐT (Nếu Cần)

Vào **Bảng kê công nợ** → Phần **Đối soát cước**:
- So sánh cước thực tế với HĐĐT đã xuất
- Cột **Chênh lệch màu đỏ** = cần kiểm tra ngay
- Đảm bảo HĐĐT ≤ cước thực tế

---

## 5. Quy Trình Giao Hàng Qua Chành

### Khi Nào Dùng Chành?

Chành được dùng khi **địa điểm nhận hàng không có văn phòng TMQ** — hàng được gửi qua xe khách hoặc tàu thủy (đối tác).

![Quản lý chành](/screenshots/25-chanh.png)
*Danh sách chành — Các đối tác vận chuyển trung gian đang hoạt động*

### Bước 1 — Tạo Biên Nhận Qua Chành

Khi tạo biên nhận, chọn **"Gửi tới Chành"** và chọn đối tác chành phù hợp.

### Bước 2 — Xuất Hàng Giao Chành

Quy trình **Giao xe** tương tự bình thường tại module **Chờ vận chuyển**.

![Chờ vận chuyển](/screenshots/11-cho-van-chuyen.png)
*Trong danh sách chờ vận chuyển, cột "Chành" hiển thị tên đối tác nếu hàng giao qua chành*

### Bước 3 — Giao Nhận Tại Chành

1. Hàng về đến điểm chành/bến xe
2. NV VP nhận (hoặc chành) xác nhận **Đến kho** / **Đã giao Chành**
3. Tab **Đã giao Chành** trong Giao nhận hàng ghi lại các BN đã bàn giao

![Giao nhận hàng - Tab đã giao Chành](/screenshots/13-hang-den.png)
*Tab "Đã giao Chành" trong trang Giao nhận hàng — ghi nhận các biên nhận đã bàn giao cho đối tác*

### Bước 4 — Thu COD Qua Chành

Nếu BN có COD:
1. Chành giao hàng và thu tiền COD từ người nhận
2. NV VP nhận xác nhận **Chành đã thu** trong module Thu hộ COD
3. Khi chành nộp tiền về VP → xác nhận **Đã thu**
4. Tiếp tục quy trình lập phiếu chuyển COD như bình thường

---

## 6. Quy Trình Xuất Hóa Đơn Điện Tử

### Dành Cho Admin — Khách Hàng Doanh Nghiệp

*(Chỉ Admin thực hiện)*

### Bước 1 — Tổng Hợp Cước Tháng

Cuối tháng, Admin vào **Bảng kê HĐĐT**:

![Bảng kê HĐĐT](/screenshots/18-bang-ke-hddt.png)
*Trang Bảng kê HĐĐT — Tổng hợp hóa đơn điện tử theo tháng cho từng doanh nghiệp*

- Chọn tháng → Xem danh sách khách hàng doanh nghiệp cần xuất HĐĐT
- Kiểm tra tổng cước phát sinh của từng đơn vị

### Bước 2 — Đối Chiếu Với Bảng Kê Công Nợ

Vào **Bảng kê công nợ** → Phần đối soát:

![Bảng kê công nợ](/screenshots/19-cong-no.png)
*So sánh cước thực tế với giá trị dự kiến xuất HĐĐT — Cột đỏ = cần kiểm tra*

- So sánh cước thực tế với giá trị dự kiến xuất HĐĐT
- Đảm bảo không có chênh lệch bất thường (cột đỏ)

### Bước 3 — Tạo Bảng Kê HĐĐT

1. Trong **Bảng kê HĐĐT**, thêm mục cho từng đơn vị
2. Điền: số HĐĐT, ngày xuất, tổng giá trị
3. Lưu bảng kê vào hệ thống

### Bước 4 — Xuất Hóa Đơn Thực Tế

Xuất HĐĐT qua phần mềm hóa đơn của đơn vị (ngoài hệ thống TMQ Express).  
Hệ thống TMQ chỉ **theo dõi và đối soát** — không trực tiếp phát hành HĐĐT.

---

## Bảng Tóm Tắt Vai Trò

| Giai đoạn | VP Gửi (SG) | VP Nhận (CT/RG) | Admin |
|---|---|---|---|
| Tạo biên nhận | ✅ | | |
| Giao xe (xuất hàng) | ✅ | | |
| Xác nhận đến kho | | ✅ | |
| Báo khách / Giao hàng | | ✅ | |
| Thu COD / Cước nhận | | ✅ | |
| Lập phiếu chuyển | | ✅ | |
| Xác nhận nhận tiền | ✅ | | |
| Bảng kê công nợ | | | ✅ |
| Bảng kê HĐĐT | | | ✅ |
| Báo cáo doanh thu | ✅ | ✅ | ✅ |

![Báo cáo doanh thu](/screenshots/20-doanh-thu.png)
*Báo cáo doanh thu — Nhân viên cả 3 VP đều có thể xem thống kê theo kỳ*

---

## 7. Xử Lý Khi Tự Động Thu Thất Bại

> Khi nhấn **Khách đã nhận**, hệ thống cố tự động thu COD và cước nhận. Nếu thất bại, sẽ hiện cảnh báo — người dùng cần thu thủ công.

### 7.1 Thu COD Thủ Công

![Trang Thu hộ COD - lọc trạng thái](/screenshots/15-thu-ho-cod.png)
*Vào Thu hộ COD → lọc "Chờ thu" để tìm các biên nhận cần thu thủ công*

1. Vào menu **Thu hộ (COD)** → Tab **Biên nhận COD**
2. Lọc theo trạng thái **Chờ thu**
3. Tìm BN bị kẹt → nhấn **Thu COD thủ công**
4. Xác nhận → COD chuyển sang **Đã thu** → tiếp tục quy trình lập phiếu bình thường

### 7.2 Thu Cước Nhận Thủ Công

![Trang Cước nhận - lọc trạng thái](/screenshots/17-cuoc-nhan.png)
*Vào Cước nhận → lọc "Chưa thu" để tìm các biên nhận cần thu thủ công*

1. Vào menu **Cước nhận** → Tab **Biên nhận cước**
2. Lọc theo trạng thái **Chưa thu**
3. Tìm BN bị kẹt → nhấn **Thu cước thủ công**
4. Xác nhận → Cước chuyển sang **Đã thu** → tiếp tục quy trình lập phiếu bình thường

> 💡 Cước nhận bị kẹt ở **Chưa thu** thường do BN được tạo với hình thức thu cước = "Chưa thu" nhưng giá cước = 0. Kiểm tra lại biên nhận gốc.

---

*Tài liệu được biên soạn bởi Antigravity AI - Tháng 06/2026*  
*Phiên bản tài liệu: 1.2 — Bổ sung minh hoạ thực tế cho tất cả 7 quy trình*  
*Phiên bản hệ thống: TMQ Express ERP v1.0*
