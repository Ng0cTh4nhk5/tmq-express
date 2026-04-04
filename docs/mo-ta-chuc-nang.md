# TMQ Express ERP — Mô tả Chức năng & Nhiệm vụ

> **Phiên bản:** 1.1  
> **Ngày cập nhật:** 02/04/2026  

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
- **Database:** PostgreSQL (10 bảng nghiệp vụ)

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

### 2.3. 💰 Quản lý Phiếu thu

**Nhiệm vụ:** Ghi nhận các khoản tiền thu vào quỹ (thu cước, thu hộ, xác nhận công nợ).

#### Chức năng:
- **Tạo phiếu thu** với đối tượng, lý do, số tiền (≥ 1 VNĐ), hình thức (tiền mặt / chuyển khoản)
- **Auto-fill** từ biên nhận: khi liên kết BN, tự điền đối tượng, lý do, số tiền
- **Sửa** phiếu thu chưa hủy (non-admin chỉ sửa phiếu mình tạo)
- **Hủy** phiếu thu (chỉ Admin) — tự động revert công nợ liên kết. Không hủy phiếu đã hủy
- **In PDF** phiếu thu
- **Liên kết** với biên nhận (nếu thu cước)
- **Mã tự động** VD: `PT-0001`, `PT-0002` (retry nếu trùng unique)
- Phiếu đã hủy **không hiển thị** trong danh sách mặc định

---

### 2.4. 💸 Quản lý Phiếu chi

**Nhiệm vụ:** Ghi nhận các khoản tiền chi ra (chi phí vận chuyển, chi phí hoạt động).

#### Chức năng:
- **Tạo phiếu chi** với người nhận, lý do, số tiền, hình thức
- **Sửa** phiếu chi chưa hủy (non-admin chỉ sửa phiếu mình tạo)
- **Hủy** phiếu chi (chỉ Admin) — đánh dấu "đã hủy" (soft delete)
- **In PDF** phiếu chi
- **Mã tự động** VD: `PC-0001`, `PC-0002` (retry nếu trùng unique)
- Phiếu đã hủy **không hiển thị** trong danh sách mặc định

---

### 2.5. 📋 Quản lý Công nợ

**Nhiệm vụ:** Theo dõi các khoản nợ cước vận chuyển chưa thu.

#### Chức năng:
- **Danh sách công nợ** với tổng hợp (tổng nợ, số lượng)
- **Lọc** theo trạng thái: Chưa thu, Quá hạn, Đã thu
- **Xác nhận thu** — tạo phiếu thu liên kết và chuyển trạng thái `đã_thu`
- **Tìm kiếm** theo đối tượng / mã biên nhận

#### Luồng trạng thái:
```
Chưa thu → Đã thu (khi xác nhận thanh toán → tự tạo phiếu thu)
Chưa thu → Quá hạn (khi >30 ngày — runtime check, không lưu DB)
```

> **Liên kết quan trọng:** Khi huỷ phiếu thu liên kết với công nợ, công nợ tự động revert về "Chưa thu".

---

### 2.6. 📊 Bảng kê HĐĐT

**Nhiệm vụ:** Tổng hợp các biên nhận cần xuất hóa đơn điện tử, xuất file Excel.

#### Chức năng:
- **Danh sách BN chờ** — hiển thị các biên nhận đánh dấu "Cần xuất HĐĐT" chưa vào bảng kê
- **Xuất bảng kê** — chọn nhiều BN → tạo bảng kê + tải Excel ngay lập tức + đánh dấu BN "đã vào bảng kê"
- **Lịch sử** — xem + tải lại các bảng kê đã xuất trước đó
- **Mã tự động** VD: `BK-0001`
- Phải chọn **ít nhất 1 BN** khi xuất bảng kê

> **Ghi chú:** Module này chỉ dành cho Admin.

---

### 2.7. 📈 Dashboard (Bảng điều khiển)

**Nhiệm vụ:** Cung cấp cái nhìn tổng quan về hoạt động kinh doanh theo thời gian thực.

#### Chức năng:
- **4 thẻ thống kê**: BN hôm nay, Tổng BN, Doanh thu tháng, Công nợ tồn
- **Biểu đồ cột**: Doanh thu 7 ngày gần nhất
- **Biểu đồ tròn**: Tỷ lệ biên nhận theo tuyến (top 10)
- **Biểu đồ đường**: Thu/Chi 6 tháng gần nhất
- **Tự động cập nhật** mỗi 60 giây + nút làm mới thủ công

---

### 2.8. 📑 Báo cáo

**Nhiệm vụ:** Xuất các báo cáo tổng hợp phục vụ quản lý và kế toán.

#### 4 loại báo cáo:

| Báo cáo | Mô tả | Bộ lọc |
|---|---|---|
| **Doanh thu** | Chi tiết BN + tổng cước | Ngày, VP |
| **Sổ quỹ** | Phiếu thu + Phiếu chi + Tồn quỹ | Ngày, VP |
| **BN theo tuyến** | Thống kê số BN & cước theo tuyến VP gửi → VP nhận | Ngày, VP |
| **Công nợ tổng hợp** | Danh sách công nợ chưa thu + quá hạn | — |

---

### 2.9. 🏢 Quản lý Văn phòng

**Nhiệm vụ:** Quản lý các chi nhánh / văn phòng trong hệ thống.

#### Chức năng:
- **Tạo / Sửa** văn phòng (mã VP, tên, địa chỉ, SĐT)
- **Bật / Tắt** trạng thái hoạt động
  - Không thể tắt VP nếu còn BN đang xử lý hoặc NV đang hoạt động
- **Chỉ Admin** truy cập

---

### 2.10. 👨‍💼 Quản lý Nhân viên

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

### 2.11. 🔍 Tra cứu công khai (Scan QR)

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
| Dashboard | ✅ | ✅ | ✅ |
| Xem biên nhận | ✅ (tất cả VP) | ✅ (chỉ VP mình) | ✅ |
| Tạo biên nhận | ✅ | ✅ | — |
| Sửa biên nhận | ✅ (tất cả) | ✅ (chỉ BN mình) | — |
| Cập nhật trạng thái BN | ✅ | ✅ | — |
| Xem khách hàng | ✅ | ✅ | ✅ |
| Tạo/Sửa khách hàng | ✅ | ✅ | — |
| Tắt/Bật khách hàng | ✅ | — | — |
| Phiếu thu (xem/tạo/sửa) | ✅ | — | ✅ |
| Phiếu thu (hủy) | ✅ | — | — |
| Phiếu chi (xem/tạo/sửa) | ✅ | — | ✅ |
| Phiếu chi (hủy) | ✅ | — | — |
| Công nợ | ✅ | — | ✅ |
| Bảng kê HĐĐT | ✅ | — | — |
| Báo cáo | ✅ | — | ✅ |
| Quản lý văn phòng | ✅ | — | — |
| Quản lý nhân viên | ✅ | — | — |

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

### 4.3. Quy trình xuất HĐĐT

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

> **Tài liệu chi tiết:** Xem `docs/quy-tac-nghiep-vu.md` để biết danh sách đầy đủ 53 quy tắc nghiệp vụ đang được cấu hình trong phần mềm.
