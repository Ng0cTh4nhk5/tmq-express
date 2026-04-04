# TMQ Express — Quy trình Nghiệp vụ Thực tế

> **Phiên bản:** 1.0  
> **Ngày cập nhật:** 02/04/2026  
> **Mục đích:** Mô tả song song quy trình thực tế (ngoài đời) và tương ứng trên phần mềm, giúp nhân viên hiểu rõ mỗi thao tác trong phần mềm phản ánh bước nào trong công việc hàng ngày.

---

## 1. Tổng quan hoạt động TMQ Express

TMQ Express là doanh nghiệp vận chuyển hàng hóa liên tỉnh, hoạt động theo mô hình:

```
┌──────────────┐    vận chuyển     ┌──────────────┐
│  VP Gửi      │ ───────────────▶  │  VP Nhận     │
│  (nhận hàng  │     xe / tàu     │  (trả hàng   │
│   từ khách)  │                  │   cho khách)  │
└──────────────┘                  └──────────────┘
```

**Các văn phòng:** Mỗi VP là một chi nhánh tại một tỉnh/thành (VD: SG — Tp.HCM, CT — Cần Thơ, RG — Rạch Giá). Hàng được chuyển từ VP gửi sang VP nhận theo lịch trình xe hàng ngày.

**Các vai trò thực tế:**
| Vai trò | Công việc hàng ngày |
|---|---|
| **Nhân viên VP** | Tiếp nhận hàng, viết biên nhận, cập nhật trạng thái, liên hệ khách |
| **Kế toán** | Thu tiền, chi tiền, theo dõi công nợ, đối soát cuối ngày |
| **Quản lý** | Giám sát tổng thể, xuất bảng kê HĐĐT, xem báo cáo, quản lý nhân sự |

---

## 2. Quy trình 1: Nhận hàng & Tạo biên nhận

### 2.1. Ngoài đời thực

```
                              ┌──────────────────────┐
                              │   KHÁCH MANG HÀNG    │
                              │   ĐẾN VĂN PHÒNG      │
                              └──────────┬───────────┘
                                         ↓
┌────────────────────────────────────────────────────────────────┐
│  NV kiểm tra hàng hóa:                                        │
│  - Loại hàng gì? Trọng lượng? Giá trị khai báo?              │
│  - Gửi đi đâu? (VP nào nhận)                                 │
│  - Ai nhận? (tên, SĐT, địa chỉ)                              │
│  - Có cần xuất hóa đơn (HĐĐT) không?                         │
│  - Hình thức giao: giao tận nơi / gọi điện khách tới lấy     │
│  - Thu cước bao nhiêu?                                        │
│  - Khách thanh toán luôn hay ghi nợ?                          │
└────────────────────────────────────────────────────────────────┘
                                         ↓
              NV viết biên nhận (trước kia: viết tay 3 liên)
                                         ↓
              Đưa biên nhận cho khách (bản gốc khách giữ)
                                         ↓
              Hàng được xếp vào kho, chờ xe chuyển đi
```

### 2.2. Trên phần mềm

| Bước thực tế | Thao tác trên phần mềm | Chi tiết |
|---|---|---|
| Khách đến VP | — | (không cần thao tác) |
| NV hỏi thông tin | Mở **Biên nhận** → **+ Tạo biên nhận** | Vào menu "Biên nhận" → nhấn nút tạo mới |
| Chọn tuyến gửi | Chọn **VP gửi** và **VP nhận** | Hệ thống tự tạo mã biên nhận, VD: `SG-CT-0045` |
| Ghi thông tin người gửi | Điền ô **Người gửi** hoặc chọn từ **Khách hàng** | Nếu chọn KH có sẵn → tên, SĐT, địa chỉ tự điền |
| Ghi thông tin người nhận | Điền ô **Người nhận** hoặc chọn **Khách hàng** | Tương tự người gửi |
| Ghi hàng hóa | Nhập **Tên hàng hóa**, Giá trị, Trọng lượng | Tên hàng là bắt buộc |
| Tính cước & thu hộ | Nhập **Giá cước** và **Thu hộ** | NV tự tính theo biểu cước công ty |
| Khách muốn trả sau | Chọn TT thu = **"Công nợ"** | → PM tự tạo khoản công nợ (xem Quy trình 5) |
| Khách trả ngay | Chọn TT thu = **"Đã thu"** | → Kế toán sẽ lập phiếu thu riêng |
| Khách cần HĐĐT | Tích ☑️ **"Cần xuất HĐĐT"** | → BN sẽ xuất hiện trong module Bảng kê |
| Giao tận nơi hay gọi điện | Chọn **Hình thức giao** | Tận nơi / Gọi điện / Khách tự tới |
| NV viết biên nhận | Nhấn **Lưu biên nhận** | PM lưu + ghi lịch sử "Tạo biên nhận" |
| Đưa biên nhận cho khách | Nhấn **biểu tượng PDF** 📄 → In | PDF có mã QR, khách quét để tra cứu |
| Xếp hàng vào kho | — | Trạng thái tự động = **"Chờ vận chuyển"** |

**Kết quả trên hệ thống sau bước này:**
- 1 biên nhận mới, trạng thái "Chờ VC"
- 1 dòng lịch sử trạng thái: "Tạo biên nhận mới"
- (Nếu công nợ) 1 khoản công nợ trạng thái "Chưa thu"
- (Nếu HĐĐT) BN xuất hiện trong danh sách "BN chờ bảng kê"

---

## 3. Quy trình 2: Vận chuyển & Giao hàng

### 3.1. Ngoài đời thực

```
 ┌────────────────────────────────────────────┐
 │  SÁNG: Xe hàng khởi hành từ VP gửi         │
 │  NV xếp hàng lên xe, ghi chuyến xe         │
 └───────────────────┬────────────────────────┘
                     ↓
 ┌────────────────────────────────────────────┐
 │  CHIỀU: Xe đến VP nhận                      │
 │  NV VP nhận kiểm đếm hàng, nhập kho        │
 └───────────────────┬────────────────────────┘
                     ↓
 ┌────────────────────────────────────────────┐
 │  VP nhận gọi điện cho người nhận:           │
 │  - Giao tận nơi → sắp lịch giao            │
 │  - Gọi điện → báo khách đến VP nhận hàng   │
 └───────────────────┬────────────────────────┘
                     ↓
 ┌────────────────────────────────────────────┐
 │  Khách đến nhận hàng / NV đi giao           │
 │  Khách ký nhận → Hoàn tất                   │
 └────────────────────────────────────────────┘
```

### 3.2. Trên phần mềm — 5 trạng thái tương ứng

| Bước thực tế | Trạng thái | Ai cập nhật | Cách cập nhật |
|---|---|---|---|
| Hàng vừa nhận, chờ xe | **Chờ VC** | (Tự động khi tạo BN) | — |
| Xe đã khởi hành, hàng đang trên đường | **Đang VC** | NV VP gửi | Chọn BN → nhấn "Đang VC" |
| Xe đến VP nhận, hàng nhập kho | **Đã đến kho** | NV VP nhận | Chọn BN → nhấn "Đã đến kho" |
| Đã gọi điện / sắp lịch giao cho khách | **Đã báo khách** | NV VP nhận | Chọn BN → nhấn "Đã báo khách" |
| Khách đã ký nhận hàng | **Khách đã nhận** | NV VP nhận | Chọn BN → nhấn "Khách đã nhận" |

**Quy tắc bắt buộc:**
- Phải chuyển **tuần tự** — không nhảy bước
- VD: Không thể từ "Chờ VC" nhảy sang "Đã đến kho" (phải qua "Đang VC" trước)
- Trạng thái "Khách đã nhận" là **trạng thái cuối** — không chuyển tiếp nữa

**Cập nhật hàng loạt (Batch):**
Khi xe khởi hành, NV VP gửi cần chuyển 20-30 BN cùng lúc sang "Đang VC":
1. Vào danh sách BN → lọc trạng thái "Chờ VC"
2. Tích ☑️ chọn tất cả BN trên chuyến xe
3. Nhấn nút cập nhật → Chọn "Đang VC"
4. Hệ thống cập nhật đồng loạt + ghi lịch sử cho từng BN

**Khách tra cứu tình trạng:**
- Khách quét **mã QR** trên biên nhận bằng điện thoại
- Trang web hiển thị **timeline trạng thái** — khách biết hàng đang ở đâu
- Không cần đăng nhập, không hiển thị thông tin tài chính

---

## 4. Quy trình 3: Thu cước (Thanh toán ngay)

### 4.1. Ngoài đời thực

```
Khách gửi hàng → NV báo giá cước → Khách trả tiền mặt / CK
     ↓
NV thu tiền → Bỏ vào quỹ VP → Cuối ngày kế toán đối soát
```

### 4.2. Trên phần mềm

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| NV thu tiền cước từ khách | Khi tạo BN, chọn TT thu = **"Đã thu"** |
| NV giao tiền cho kế toán | (Ngoài PM — tiền mặt bàn giao nội bộ) |
| Kế toán ghi nhận vào sổ quỹ | Vào **Phiếu thu** → **+ Tạo phiếu** |
| Kế toán điền thông tin | Đối tượng (ai nộp), Lý do (thu cước BN xxx), Số tiền, Hình thức |
| Kế toán lưu | Nhấn **Lập phiếu** → mã tự động (VD: `PT001`) |
| In phiếu thu đưa khách | Nhấn 📄 PDF → In |

**Lưu ý liên kết BN:** Khi tạo phiếu thu, nếu chọn biên nhận liên kết, hệ thống tự điền:
- Đối tượng = Tên khách gửi
- Lý do = "Thu cước BN SG-CT-0045"
- Số tiền = Giá cước trên BN

---

## 5. Quy trình 4: Công nợ & Thu hồi nợ

### 5.1. Ngoài đời thực

```
Khách hàng thường xuyên gửi nhiều → Thỏa thuần trả sau (ghi nợ)
     ↓
Mỗi lần gửi: NV ghi sổ nợ → Cuối tuần/tháng: Kế toán đòi tiền
     ↓
Khách thanh toán → Kế toán gạch nợ + viết phiếu thu
```

### 5.2. Trên phần mềm

**Phát sinh công nợ:**

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| Khách gửi hàng, nói "trả sau" | Khi tạo BN → chọn TT thu = **"Công nợ"** |
| NV ghi vào sổ nợ | → PM **tự động** tạo khoản công nợ |
| | Đối tượng = Tên khách gửi, Số tiền = Cước, TT = "Chưa thu" |

**Thu hồi công nợ:**

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| Kế toán kiểm tra sổ nợ | Vào menu **Công nợ** → xem tổng hợp |
| Kế toán thấy KH A nợ 5tr, đã > 30 ngày | Bộ lọc hiển thị **"Quá hạn"** — nợ > 30 ngày tự đánh dấu |
| Kế toán gọi điện KH A đòi tiền | (Ngoài PM — liên hệ điện thoại) |
| KH A đến thanh toán | Kế toán nhấn ✅ **Xác nhận thu** trên dòng công nợ |
| Kế toán chọn hình thức | Popup → Chọn **Tiền mặt** hoặc **Chuyển khoản** |
| Kế toán xác nhận | Nhấn **Xác nhận** |
| | → PM **tự động**: |
| | 1. Tạo Phiếu thu liên kết với BN gốc |
| | 2. Chuyển công nợ thành **"Đã thu"** |
| | 3. Ghi ngày thu |

**Sơ đồ liên kết dữ liệu:**
```
Biên nhận (TT thu = Công nợ)
    ↓ tự động tạo
Công nợ (TT = Chưa thu)
    ↓ khi xác nhận thu
Phiếu thu (liên kết BN + Công nợ)
    ↑ nếu hủy PT, công nợ tự revert về "Chưa thu"
```

---

## 6. Quy trình 5: Chi tiền & Ghi phiếu chi

### 6.1. Ngoài đời thực

```
VP cần chi tiền (xăng xe, lương NV ngoài, sửa xe, tiền thuê kho...)
     ↓
Kế toán chi tiền → Ghi vào sổ chi → Lấy chữ ký người nhận
```

### 6.2. Trên phần mềm

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| Có khoản chi phát sinh | Vào **Phiếu chi** → **+ Tạo phiếu** |
| Kế toán điền | **Người nhận** (ai nhận tiền), **Lý do** (chi gì), **Số tiền**, **Hình thức** |
| Lưu | Nhấn **Lập phiếu** → mã `PC001` |
| In cho người nhận ký | Nhấn 📄 PDF → In → Người nhận ký → Lưu hồ sơ |

**Hủy phiếu chi (chỉ Admin):**
- Khi phiếu chi sai → Admin nhấn hủy
- Phiếu bị đánh dấu "Đã hủy" — không xóa khỏi hệ thống (lưu vết)

---

## 7. Quy trình 6: Đối soát cuối ngày

### 7.1. Ngoài đời thực

```
Cuối ngày, kế toán đối soát:
  - Tổng thu hôm nay bao nhiêu?
  - Tổng chi hôm nay bao nhiêu?
  - Tiền mặt tồn quỹ khớp với sổ không?
  - Có bao nhiêu BN mới? Cước thu được bao nhiêu?
  - Công nợ tồn là bao nhiêu?
```

### 7.2. Trên phần mềm

| Nhu cầu đối soát | Nơi xem | Chi tiết |
|---|---|---|
| Tổng quan nhanh | **Dashboard** | 4 thẻ: BN hôm nay, Tổng BN, Doanh thu tháng, Công nợ tồn |
| So sánh thu/chi | Dashboard → **Biểu đồ Thu-Chi** | Biểu đồ đường 6 tháng |
| Chi tiết thu trong ngày | **Báo cáo** → **Sổ quỹ** → Lọc ngày hôm nay | Danh sách PT + PC + Tồn quỹ |
| Doanh thu theo tuyến | **Báo cáo** → **BN theo tuyến** | Bảng: Tuyến, Số BN, Tổng cước, Đã giao, Công nợ |
| Kiểm tra công nợ | **Công nợ** → Lọc "Chưa thu" | Tổng nợ tồn + danh sách chi tiết |
| Kiểm cước đã thu | **Báo cáo** → **Doanh thu** → Lọc ngày | Chi tiết từng BN + tổng cước |

---

## 8. Quy trình 7: Xuất bảng kê hóa đơn điện tử (HĐĐT)

### 8.1. Ngoài đời thực

```
Một số khách hàng doanh nghiệp yêu cầu xuất hóa đơn VAT
     ↓
Cuối tuần / cuối tháng: Kế toán tổng hợp các BN cần HĐĐT
     ↓
Kế toán lập bảng kê Excel gửi cho đơn vị xuất hóa đơn
     ↓
Đơn vị xuất HĐ → Trả lại HĐ → Kế toán gửi cho khách
```

### 8.2. Trên phần mềm

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| Khi tạo BN, khách yêu cầu HĐĐT | Tích ☑️ **"Cần xuất HĐĐT"** trên form BN |
| Cuối tuần, kế toán tổng hợp | Admin vào **Bảng kê** → Tab **"BN chờ"** |
| Xem danh sách BN cần xuất HĐ | Danh sách hiện các BN đánh dấu HĐĐT chưa vào bảng kê |
| Kế toán chọn các BN, xuất Excel | Tích ☑️ → Nhấn **"Xuất bảng kê"** |
| File Excel tải về ngay | Tự động download — có đầy đủ: STT, Mã BN, Tuyến, Người gửi/nhận, Cước |
| Gửi Excel cho đơn vị xuất HĐ | (Ngoài PM — email / zalo) |
| Cần tải lại file | Tab **"Lịch sử"** → nhấn ⬇️ tải lại |

**Sau khi xuất bảng kê:**
- BN được đánh dấu **"Đã vào bảng kê"** — không xuất hiện lại trong "BN chờ"
- Bảng kê có mã riêng (VD: `BK2026040001`) để tra cứu

---

## 9. Quy trình 8: Quản lý khách hàng thường xuyên

### 9.1. Ngoài đời thực

```
Khách gửi lần đầu → NV ghi thông tin vào sổ KH
Lần sau khách quay lại → NV tra sổ, lấy thông tin nhanh
Khách ngừng gửi lâu → Đánh dấu "Không hoạt động"
```

### 9.2. Trên phần mềm

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| Khách gửi lần đầu | Vào **Khách hàng** → **+ Thêm KH** → Nhập tên, SĐT, địa chỉ, MST (nếu cần HĐĐT) |
| Lần sau khách quay lại | Khi tạo BN → Gõ tên KH vào ô **Người gửi** → **Auto-complete** gợi ý → Chọn → Tự điền |
| Khách đổi số điện thoại | **Khách hàng** → ✏️ Sửa → Cập nhật SĐT mới |
| Khách ngừng hợp tác | Admin nhấn nút **Ngừng KH** → KH không xuất hiện khi tạo BN nữa |

---

## 10. Quy trình 9: Quản lý VP & Nhân viên

### 10.1. Mở chi nhánh mới

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| Công ty mở VP mới tại Phú Quốc | Admin vào **Văn phòng** → **+ Thêm VP** |
| Đặt mã VP | Nhập Mã = `PQ`, Tên = "VP Phú Quốc", Địa chỉ, SĐT |
| Tuyển NV cho VP mới | Admin vào **Nhân viên** → **+ Thêm NV** → Chọn VP = "VP Phú Quốc" |
| Cấp tài khoản | NV mới nhận username + password → đăng nhập hệ thống |

### 10.2. Đóng chi nhánh

| Bước thực tế | Thao tác trên phần mềm |
|---|---|
| Quyết định đóng VP Rạch Giá | Admin vào **Văn phòng** → Tắt VP |
| Hệ thống kiểm tra | Nếu còn BN đang vận chuyển → **Từ chối** (cần hoàn tất BN trước) |
| | Nếu còn NV active → **Từ chối** (cần vô hiệu NV trước) |
| Hoàn tất các ràng buộc | Admin vô hiệu NV → hoàn tất BN → tắt VP |

### 10.3. NV nghỉ việc

| Bước | Thao tác |
|---|---|
| NV xin nghỉ | Admin vào **Nhân viên** → Tắt NV đó |
| NV không đăng nhập được nữa | Tài khoản bị vô hiệu |
| NV mới vào thay | Tạo NV mới, cấp username + password |

---

## 11. Sơ đồ tổng thể: Mối liên kết giữa các nghiệp vụ

```
    ┌──────────────────────────────────────────────┐
    │              KHÁCH HÀNG                       │
    │  (Gửi hàng / Nhận hàng / Tra QR / Trả nợ)   │
    └───────┬───────────┬───────────────┬──────────┘
            ↓           ↓               ↓
    ┌───────────┐ ┌───────────┐  ┌─────────────┐
    │ BIÊN NHẬN │ │ SCAN QR   │  │ KHÁCH HÀNG  │
    │ (cốt lõi) │ │ (tra cứu) │  │ (sổ KH)     │
    └─────┬─────┘ └───────────┘  └─────────────┘
          │
    ┌─────┴──────────┬─────────────┬──────────────┐
    ↓                ↓             ↓              ↓
┌────────┐   ┌──────────┐  ┌───────────┐  ┌──────────┐
│ CÔNG   │   │ PHIẾU    │  │ LỊCH SỬ   │  │ BẢNG KÊ  │
│ NỢ     │   │ THU      │  │ TRẠNG THÁI │  │ HĐĐT     │
└───┬────┘   └────┬─────┘  └───────────┘  └──────────┘
    │             │
    └──────┬──────┘         ┌───────────┐
           ↓                │ PHIẾU CHI │
    ┌──────────────┐        └─────┬─────┘
    │   SỔ QUỸ     │              │
    │ (Thu − Chi =  ├──────────────┘
    │  Tồn quỹ)    │
    └──────┬───────┘
           ↓
    ┌──────────────┐
    │   BÁO CÁO    │
    │   DASHBOARD   │
    └──────────────┘
```

**Giải thích luồng dữ liệu:**
1. **Biên nhận** là trung tâm — mọi nghiệp vụ xoay quanh nó
2. Biên nhận → **Công nợ** (khi TT thu = "Công nợ") → **Phiếu thu** (khi xác nhận thanh toán)
3. Biên nhận → **Phiếu thu** (khi thu cước trực tiếp)
4. Biên nhận → **Bảng kê** (khi cần xuất HĐĐT)
5. Biên nhận → **Lịch sử trạng thái** (mỗi lần cập nhật) → **Scan QR** (khách xem)
6. **Phiếu thu** + **Phiếu chi** → **Sổ quỹ** (Tồn quỹ = Σ Thu − Σ Chi)
7. Tất cả → **Dashboard** + **Báo cáo** (tổng hợp)

---

## 12. Bảng tổng hợp: Đời thực → Phần mềm

| # | Tình huống thực tế | Thao tác trên PM | Module |
|---|---|---|---|
| 1 | Khách đến gửi hàng | Tạo biên nhận | Biên nhận |
| 2 | Xe hàng khởi hành | Batch cập nhật "Đang VC" | Biên nhận |
| 3 | Hàng đến VP nhận | Cập nhật "Đã đến kho" | Biên nhận |
| 4 | Gọi khách đến lấy | Cập nhật "Đã báo khách" | Biên nhận |
| 5 | Khách ký nhận hàng | Cập nhật "Khách đã nhận" | Biên nhận |
| 6 | Thu cước ngay | Chọn "Đã thu" + Tạo phiếu thu | BN + Phiếu thu |
| 7 | Khách nợ cước | Chọn "Công nợ" → PM tự tạo | BN + Công nợ |
| 8 | Khách trả nợ | Xác nhận thu → PM tự tạo PT | Công nợ + PT |
| 9 | Chi xăng xe | Tạo phiếu chi | Phiếu chi |
| 10 | Đối soát cuối ngày | Xem Dashboard + BC Sổ quỹ | Dashboard + BC |
| 11 | Xuất HĐ cho khách DN | Xuất bảng kê Excel | Bảng kê |
| 12 | Khách quét QR | Tự động — không cần thao tác | Scan QR |
| 13 | KH mới đến gửi | Tạo khách hàng | Khách hàng |
| 14 | Tuyển NV mới | Tạo nhân viên + cấp TK | Nhân viên |
| 15 | Mở / đóng chi nhánh | Thêm / tắt văn phòng | Văn phòng |
| 16 | Xem hiệu quả kinh doanh | BC Doanh thu + BC theo tuyến | Báo cáo |
| 17 | Hủy phiếu thu sai | Admin hủy → CN tự revert | Phiếu thu + CN |

---

## 13. Lưu ý quan trọng

### 13.1. Thứ tự bắt buộc khi cập nhật trạng thái

```
✅ Đúng:  Chờ VC → Đang VC → Đã đến kho → Đã báo khách → Khách đã nhận
❌ Sai:   Chờ VC → Đã đến kho  (nhảy bước — PM sẽ từ chối)
❌ Sai:   Khách đã nhận → Đang VC  (không cho quay ngược)
```

### 13.2. Công nợ & Phiếu thu liên kết

- Khi **xác nhận thu** công nợ → PM tạo phiếu thu
- Khi **hủy phiếu thu** đó → PM tự **revert** công nợ về "Chưa thu"
- Đảm bảo dữ liệu tài chính luôn nhất quán

### 13.3. Không thể xóa, chỉ hủy

Phần mềm không xóa dữ liệu — chỉ **đánh dấu hủy** (phiếu thu, phiếu chi). Điều này đảm bảo:
- Lưu vết đầy đủ cho kiểm toán
- Không mất dữ liệu do thao tác nhầm
- Báo cáo luôn tính trên dữ liệu **chưa hủy**

### 13.4. Phân quyền thực tế

| Thao tác nhạy cảm | Chỉ Admin được làm |
|---|---|
| Hủy phiếu thu / phiếu chi | ✅ |
| Tắt/Bật khách hàng, VP, NV | ✅ |
| Xuất bảng kê HĐĐT | ✅ |
| Reset mật khẩu NV | ✅ |
| Quản lý VP & NV | ✅ |
