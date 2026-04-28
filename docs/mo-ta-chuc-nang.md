# TMQ Express ERP — Mô tả Chức năng & Nhiệm vụ

> **Phiên bản:** 1.4  
> **Ngày cập nhật:** 28/04/2026  

---

## 1. Giới thiệu tổng quan

### 1.1. Mục đích phần mềm

**TMQ Express ERP** là hệ thống quản lý vận chuyển & tài chính dành cho doanh nghiệp vận tải / chuyển phát. Phần mềm số hóa toàn bộ quy trình từ tiếp nhận hàng hóa, theo dõi vận chuyển, quản lý tài chính (thu/chi/công nợ) đến xuất báo cáo.

### 1.2. Đối tượng sử dụng

| Vai trò | Mô tả | Quyền hạn chính |
|---|---|---|
| **Admin** | Quản trị viên / Ban giám đốc | Toàn quyền hệ thống |
| **Staff** (Nhân viên) | Nhân viên tại văn phòng | Tạo/sửa biên nhận, cập nhật trạng thái |
| **Accountant** (Kế toán) | Kế toán viên | Quản lý phiếu thu/chi, công nợ, báo cáo |

### 1.3. Kiến trúc hệ thống

```
┌─────────────┐     ┌───────────────┐     ┌────────────┐
│  Frontend   │────▶│   Backend     │────▶│ PostgreSQL │
│  Vue 3 +    │     │  Fastify +    │     │  Database  │
│  PrimeVue   │     │  Prisma ORM   │     │            │
└─────────────┘     └───────────────┘     └────────────┘
```

- **Frontend:** Vue 3, PrimeVue UI, ECharts (biểu đồ)
- **Backend:** Node.js, Fastify, Prisma ORM, JWT Authentication
- **Database:** PostgreSQL (15 bảng nghiệp vụ, 9 enums)

---

## 2. Các module chức năng

### 2.1. 📦 Quản lý Biên nhận (Nghiệp vụ cốt lõi)

**Nhiệm vụ:** Quản lý toàn bộ vòng đời đơn hàng từ lúc nhận đến khi giao.

#### Chức năng:
- **Tạo biên nhận** mới với đầy đủ thông tin: người gửi, người nhận, hàng hóa, cước phí
- **Sửa biên nhận** (trước khi giao)
- **Cập nhật trạng thái** vận chuyển (đơn lẻ hoặc hàng loạt)
- **In PDF** biên nhận kèm mã QR để tra cứu
- **Tìm kiếm & lọc** theo trạng thái, văn phòng, khoảng thời gian
- **Tự động tạo mã số** biên nhận theo quy tắc `{VP_GỬI}{VP_NHẬN}-SỐ_THỨ_TỰ` (VD: `SGCT-0001`)
- **Phân quyền dữ liệu:** Staff chỉ thấy BN liên quan VP mình. Admin và Accountant thấy tất cả
- **Phân quyền sửa:** Staff chỉ sửa BN do mình tạo. Admin sửa tất cả
- **Không được sửa mã BN** sau khi tạo
- **Tự động tạo công nợ** khi TT thu = "Công nợ"

#### Luồng trạng thái vận chuyển:

```
Chờ VC → Đang VC → Đã đến kho → Đã báo khách → Khách đã nhận
```

> **Lưu ý quan trọng:** Hệ thống bắt buộc tuân theo luồng trạng thái tuần tự. Không được nhảy bước (VD: từ "Chờ VC" sang "Đã đến kho") và không được quay ngược. VP gửi phải **khác** VP nhận.

#### Thông tin trên biên nhận:

| Nhóm | Trường | Bắt buộc |
|---|---|---|
| VP | VP gửi, VP nhận | ✅ |
| Người gửi | Đơn vị, Họ tên, SĐT, Địa chỉ | — |
| Người nhận | Đơn vị, Họ tên, SĐT, Địa chỉ | — |
| Hàng hóa | Tên hàng hóa, Giá trị, Trọng lượng | ✅ (Tên) |
| Tài chính | Thu hộ, Giá cước, TT thanh toán | — |
| Tùy chọn | Xuất HĐĐT, Hình thức giao | — |

---

### 2.2. 👥 Quản lý Khách hàng

**Nhiệm vụ:** Lưu trữ thông tin khách hàng thường xuyên, hỗ trợ điền nhanh khi tạo biên nhận.

#### Phân loại khách hàng:
| Loại | Mô tả | Enum |
|---|---|---|
| **Doanh nghiệp** | Công ty, DNTN, cửa hàng — gửi thường xuyên, có MST | `doanh_nghiep` |
| **Cá nhân** | Cá nhân gửi định kỳ | `ca_nhan` (mặc định) |

> **Khách vãng lai** (không có SĐT, gửi 1 lần) không được lưu vào sổ KH.

#### Chức năng:
- **Tạo / Sửa** khách hàng (mã tự động VD: `KH-0001`)
- **Phân loại** KH: Doanh nghiệp / Cá nhân (dropdown trên form)
- **Tìm kiếm** theo tên, SĐT, mã KH, người liên hệ
- **Bật / Tắt** trạng thái hoạt động (chỉ Admin)
- **Auto-complete** khi tạo biên nhận — tìm kiếm theo **tên hoặc SĐT**, dropdown hiện SĐT bên cạnh tên (chỉ hiện KH active, tối thiểu 2 ký tự, tối đa 5 kết quả)
- **Auto-create từ BN** — khi tạo biên nhận, nếu người gửi/nhận có SĐT và chưa tồn tại trong KH, hệ thống tự tạo KH mới (loại `ca_nhan`). Frontend hiện toast thông báo
- **Không sửa được mã KH** sau khi tạo

#### Thông tin khách hàng:
Loại KH, Tên đơn vị, Người liên hệ, SĐT, Địa chỉ, Email, Mã số thuế, Ghi chú

---

### 2.3. 📋 Quản lý Công nợ

**Nhiệm vụ:** Theo dõi các khoản nợ cước vận chuyển chưa thu, xuất báo cáo chi tiết theo khách hàng, đối soát cước phát hiện bất thường.

#### Chức năng:
- **Bảng kê công nợ cuối tháng** theo đối tượng — tổng hợp tất cả công nợ trong tháng, group theo đối tượng (đơn vị gửi)
- **Chi tiết công nợ** — Click vào đối tượng để xem chi tiết từng phiếu công nợ
- **Xuất PDF** báo cáo công nợ chi tiết cho từng đối tượng (pdfmake, khổ A4, header, summary, bảng chi tiết, chữ ký)
- **Xuất Excel** bảng kê công nợ tháng (toàn bộ hoặc theo đối tượng)
- **Xác nhận thu** — tạo phiếu thu liên kết và chuyển trạng thái `đã_thu`
- **Đối soát cước** — so sánh cước thực tế gửi (BN) vs cước HĐĐT đã xuất cho từng đối tượng
  - Phát hiện **bất thường**: HĐĐT > cước thực tế, hoặc gửi ≤5 BN nhưng xuất HĐĐT >1 triệu
  - Highlight đỏ dòng bất thường trên giao diện

#### Luồng trạng thái:
```
Chưa thu → Đã thu (khi xác nhận thanh toán → tự tạo phiếu thu)
Chưa thu → Quá hạn (khi >30 ngày — runtime check, không lưu DB)
```

> **Liên kết quan trọng:** Khi huỷ phiếu thu liên kết với công nợ, công nợ tự động revert về "Chưa thu".

---

### 2.4. 📊 Bảng kê HĐĐT

**Nhiệm vụ:** Tổng hợp các biên nhận cần xuất hóa đơn điện tử, xuất file Excel.

#### Chức năng:
- **Danh sách BN chờ** — hiển thị các biên nhận đánh dấu "Cần xuất HĐĐT" chưa vào bảng kê
- **Xuất bảng kê** — chọn nhiều BN → tạo bảng kê + tải Excel ngay lập tức + đánh dấu BN "đã vào bảng kê"
- **Lịch sử** — xem + tải lại các bảng kê đã xuất trước đó
- **Mã tự động** VD: `BK-0001`
- Phải chọn **ít nhất 1 BN** khi xuất bảng kê

> **Ghi chú:** Module này chỉ dành cho Admin.

---

### 2.5. 📈 Báo cáo doanh thu

**Nhiệm vụ:** Thống kê doanh thu theo khoảng thời gian tùy chọn, hỗ trợ đối soát hàng ngày/tuần/tháng/năm.

#### Chức năng:
- **Lọc** theo khoảng ngày, văn phòng gửi, và nhóm theo **Ngày / Tuần / Tháng / Năm**
- **4 thẻ tổng hợp**: Số biên nhận, Tổng doanh thu, Đã thu, Chưa thu + Công nợ
- **Bảng chi tiết** theo từng kỳ (key nhóm): Số BN, Tổng cước, Đã thu, Chưa thu, Công nợ, Thu hộ
- **Tự động load** tháng hiện tại khi mở trang

#### Nhóm theo:
| Nhóm | Key format | Ví dụ |
|---|---|---|
| Ngày | `YYYY-MM-DD` | `2026-04-22` |
| Tuần | `YYYY-TWW` | `2026-T17` |
| Tháng | `YYYY-MM` | `2026-04` |
| Năm | `YYYY` | `2026` |

> **Ghi chú:** Dành cho Admin và Kế toán.

---

### 2.6. 💰 Thu hộ (COD)

**Nhiệm vụ:** Quản lý tiền thu hộ (Cash on Delivery) — theo dõi quy trình thu tiền hộ người gửi từ người nhận, chuyển về VP gửi, và trả cho người gửi.

#### Luồng trạng thái COD (4 bước):

```
Chờ thu → Đã thu → Đã chuyển → Hoàn tất (Đã trả)
```

| Bước | Trạng thái | Mô tả | Phiếu tự động tạo |
|------|-----------|-------|----|
| 1 | `cho_thu` | Hàng có COD, chờ thu từ người nhận | — |
| 2 | `da_thu` | VP nhận đã thu tiền từ người nhận | **Phiếu thu** tại VP nhận |
| 3 | `da_chuyen` | Tiền đã chuyển từ VP nhận → VP gửi | **Phiếu chi** tại VP nhận + **Phiếu thu** tại VP gửi |
| 4 | `da_tra` | VP gửi đã trả tiền cho người gửi | **Phiếu chi** tại VP gửi |

#### Tự động hóa:
- Khi tạo biên nhận có `thu_ho > 0` → tự động đặt `trang_thai_cod = 'cho_thu'`
- Khi cập nhật trạng thái vận chuyển sang **"Khách đã nhận"** → tự động xác nhận thu COD (auto-thu)
- Mỗi bước xác nhận COD đều tạo phiếu thu/chi tương ứng trong cùng transaction

#### Chức năng:
- **Danh sách COD** — xem tất cả biên nhận có thu hộ, lọc theo trạng thái COD, ngày, tìm kiếm
- **Tổng hợp** — 4 thẻ thống kê: Chờ thu, Đã thu, Đã chuyển, Hoàn tất (số tiền + số BN)
- **Xác nhận thu** — thu tiền COD từ người nhận tại VP nhận
- **Xác nhận chuyển** — chuyển tiền COD từ VP nhận về VP gửi
- **Xác nhận trả** — trả tiền COD cho người gửi tại VP gửi
- **Xem trạng thái COD** — badge trạng thái hiển thị trên panel biên nhận

#### Phân quyền:

| Thao tác | Admin | Accountant | Staff |
|----------|:---:|:---:|:---:|
| Xem danh sách / Tổng hợp | ✅ | ✅ | — |
| Xác nhận thu | ✅ | ✅ | ✅ |
| Xác nhận chuyển | ✅ | ✅ | — |
| Xác nhận trả | ✅ | ✅ | — |

> **Ghi chú:** Không cho phép xóa biên nhận có COD đang xử lý (`da_thu`, `da_chuyen`, `da_tra`).

---

### 2.7. 🚚 Quản lý Chành

**Nhiệm vụ:** Quản lý các trạm trung chuyển hàng hóa (chành) liên kết với văn phòng.

#### Chức năng:
- **Tạo / Sửa** chành (tên, địa chỉ, điện thoại, người liên hệ, văn phòng)
- **Bật / Tắt** trạng thái hoạt động
- **Liên kết** với biên nhận (BN có thể gửi qua chành)
- **Chỉ Admin** truy cập

---

### 2.8. 🏢 Quản lý Văn phòng

**Nhiệm vụ:** Quản lý các chi nhánh / văn phòng trong hệ thống.

#### Chức năng:
- **Tạo / Sửa** văn phòng (mã VP, tên, địa chỉ, SĐT)
- **Bật / Tắt** trạng thái hoạt động
  - Không thể tắt VP nếu còn BN đang xử lý hoặc NV đang hoạt động
- **Chỉ Admin** truy cập

---

### 2.9. 👨‍💼 Quản lý Nhân viên

**Nhiệm vụ:** Quản lý tài khoản nhân viên và phân quyền.

#### Chức năng:
- **Tạo** nhân viên mới (mã NV, tên, username, password, vai trò, VP)
- **Sửa** thông tin (tên, vai trò, VP)
- **Bật / Tắt** trạng thái (không thể tự tắt chính mình)
- **Reset mật khẩu** — tạo mật khẩu ngẫu nhiên, hiển thị cho admin
- **3 vai trò**: Admin, Staff, Accountant
- **Không sửa được** mã NV và username sau khi tạo
- NV mới được đặt cờ **yêu cầu đổi MK** lần đầu đăng nhập
- **Chỉ Admin** truy cập

---

### 2.10. 🔍 Tra cứu công khai (Scan QR)

**Nhiệm vụ:** Cho phép khách hàng tra cứu trạng thái biên nhận mà không cần đăng nhập.

#### Chức năng:
- Truy cập qua URL: `/scan/{mã_biên_nhận}`
- QR code trên biên nhận PDF liên kết tới URL này
- Hiển thị: thông tin vận chuyển, lịch sử trạng thái (timeline, tối đa 5 bản ghi), trạng thái tiếp theo
- **Bảo mật**: Không hiển thị giá cước, trạng thái thanh toán, tên nhân viên
- **Rate limit**: 30 request/phút để chống abuse

---

## 3. Ma trận phân quyền

| Chức năng | Admin | Staff | Accountant |
|---|:---:|:---:|:---:|
| Trang chủ | ✅ | ✅ | ✅ |
| Xem biên nhận | ✅ (tất cả VP) | ✅ (chỉ VP mình) | ✅ |
| Tạo biên nhận | ✅ | ✅ | — |
| Sửa biên nhận | ✅ (tất cả) | ✅ (chỉ BN mình) | — |
| Cập nhật trạng thái BN | ✅ | ✅ | — |
| Xem khách hàng | ✅ | ✅ | ✅ |
| Tạo/Sửa khách hàng | ✅ | ✅ | — |
| Tắt/Bật khách hàng | ✅ | — | — |
| Bảng kê HĐĐT | ✅ | — | — |
| Công nợ + Đối soát | ✅ | — | ✅ |
| **Thu hộ COD (xem/tổng hợp)** | **✅** | **—** | **✅** |
| **Thu hộ COD (xác nhận thu)** | **✅** | **✅** | **✅** |
| **Thu hộ COD (chuyển/trả)** | **✅** | **—** | **✅** |
| Báo cáo doanh thu | ✅ | — | ✅ |
| Quản lý văn phòng | ✅ | — | — |
| Quản lý nhân viên | ✅ | — | — |
| Quản lý chành | ✅ | — | — |

> **Ghi chú:** Phân quyền được kiểm tra ở **cả backend** (Fastify `authorize()`) lẫn **frontend** (ẩn/hiện menu). Backend là nguồn tin cậy chính.

---

## 4. Quy trình nghiệp vụ cốt lõi

### 4.1. Quy trình nhận & giao hàng

```
Khách mang hàng đến VP
    ↓
NV tạo Biên nhận
    ↓
In PDF + QR cho khách
    ↓
Hàng chờ vận chuyển (Chờ VC)
    ↓
Chuyển hàng đi (Đang VC)
    ↓
Đến kho VP nhận (Đã đến kho)
    ↓
Liên hệ khách đến nhận (Đã báo khách)
    ↓
Khách nhận hàng (Khách đã nhận)
```

### 4.2. Quy trình thu cước

```
[Trường hợp 1 — Thu ngay]
Tạo biên nhận (TT Thu: Đã thu) → Thu tiền → Phiếu thu

[Trường hợp 2 — Công nợ]
Tạo biên nhận (TT Thu: Công nợ)
    ↓
Hệ thống tạo Công nợ tự động
    ↓
Theo dõi trên module Công nợ
    ↓
KH thanh toán → Xác nhận thu → Phiếu thu + Công nợ chuyển "Đã thu"
```

### 4.3. Quy trình Thu hộ (COD)

```
Tạo BN có Thu hộ > 0 → trang_thai_cod = 'cho_thu'
    ↓
Khách nhận hàng (auto) hoặc NV xác nhận thu (manual)
    ↓
  trang_thai_cod = 'da_thu' + Phiếu thu (VP nhận)
    ↓
Kế toán xác nhận chuyển COD về VP gửi
    ↓
  trang_thai_cod = 'da_chuyen' + Phiếu chi (VP nhận) + Phiếu thu (VP gửi)
    ↓
Kế toán trả COD cho người gửi
    ↓
  trang_thai_cod = 'da_tra' + Phiếu chi (VP gửi)
```

### 4.4. Quy trình xuất HĐĐT

```
BN đánh dấu "Cần xuất HĐĐT"
    ↓
Xuất hiện trong DS BN chờ bảng kê
    ↓
Admin chọn nhiều BN → Xuất bảng kê 
    ↓
Tải file Excel
    ↓
Gửi cho kế toán / bên thứ 3 xuất hóa đơn
```

---

## 5. Tính năng bảo mật

| Tính năng | Mô tả |
|---|---|
| JWT Authentication | Token-based, hết hạn tự động, chứa id/role/van_phong_id |
| Rate Limiting | Login: 5/phút, Global: 100/phút, QR Scan: 30/phút |
| Schema Validation | Kiểm tra dữ liệu đầu vào nghiêm ngặt, chặn trường lạ (`additionalProperties: false`) |
| State Machine | Kiểm soát luồng trạng thái, chống nhảy bước và quay ngược |
| Atomic Transactions | Prisma `$transaction` đảm bảo tính toàn vẹn dữ liệu tài chính |
| Role-based Access | 3 cấp quyền, kiểm tra cả backend lẫn frontend |
| QR Data Protection | Ẩn thông tin nhạy cảm trên trang tra cứu công khai |
| Password Security | Bcrypt hash (10 rounds), MK mới ≥ 6 ký tự, yêu cầu đổi MK lần đầu |
| Soft Delete | Không xóa dữ liệu — chỉ đánh dấu hủy/inactive để lưu vết kiểm toán |
| Code Generation | Retry on unique violation (P2002) để xử lý race condition |

> **Tài liệu chi tiết:** Xem `docs/quy-tac-nghiep-vu.md` để biết danh sách đầy đủ các quy tắc nghiệp vụ đang được cấu hình trong phần mềm.
