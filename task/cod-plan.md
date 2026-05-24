# Thiết kế lại luồng COD — TMQ Express

> Đang cập nhật dần. Xem từng phần bên dưới.

---

## PHẦN 1 — Làm rõ khái niệm & Tổng quan

### 3 chứng từ trong luồng COD mới

| Chứng từ | Tên hiển thị | Giao cho ai | Mục đích |
|---|---|---|---|
| `BienNhanThuHo` | Biên nhận thu hộ | **Người nhận hàng** | Xác nhận đã thu COD từ họ (phiếu thu lẻ, in được) |
| `PhieuChuyenCOD` | Phiếu chuyển COD | **Nội bộ VP** | VP Nhận gom lô → chuyển tiền về VP Gửi |
| *(batch action)* | Đợt trả COD | **Người gửi hàng** | VP Gửi gom nhiều BN → trả tiền cho người gửi |

> BNTH là chứng từ in ra giao cho khách nhận hàng ("tôi đã nộp tiền COD").
> Việc chuyển tiền giữa hai VP dùng Phiếu chuyển COD riêng.

---

### Tổng quan luồng tiền

```
[Người nhận hàng]
    | trả {thu_ho}đ
    v
[VP Nhận] (hoặc: Chành thu → nộp về VP Nhận)
    |-- phát BNTH cho khách nhận hàng
    |-- gom nhiều BN → lập Phiếu chuyển COD
    v
[VP Gửi] xác nhận nhận tiền
    |-- gom nhiều BN → Đợt trả COD
    v
[Người gửi hàng] nhận lại tiền ✅
```

---

### Trả lời các câu hỏi đã có

| Câu hỏi | Câu trả lời | Ảnh hưởng |
|---|---|---|
| Chuyển lô hay lẻ? | Tùy — hỗ trợ cả hai | `PhieuChuyenCOD` chứa 1..N biên nhận |
| Chành thu thế nào? | Thu → giữ → nộp về VP Nhận | Cần state `da_thu_chanh` |
| Hàng hoàn/từ chối? | Chưa thu COD → không có giao dịch | BN giữ `cho_thu`, admin hủy nếu cần |
| Trả người gửi? | Gom lô | Batch action tạo nhiều PhieuChi |
| Ai xác nhận nhận tiền? | NV tại VP Gửi | Phân quyền theo `van_phong_id` |

---

*Phần 2: State machine — Phần 3: Schema — Phần 4: API & Phân quyền*

---

## PHẦN 2 — State Machine `trang_thai_cod`

### Enum mới (thêm 1 state)

```
khong_co       // thu_ho = 0, không áp dụng
cho_thu        // Chờ thu từ người nhận
da_thu_chanh   // [MỚI] Chành đã thu, chờ nộp về VP Nhận
da_thu         // VP Nhận đang giữ tiền + đã phát BNTH cho khách
da_chuyen      // VP Gửi đã xác nhận nhận tiền (qua PhieuChuyenCOD)
da_tra         // VP Gửi đã trả cho người gửi ✅
```

### Chuyển trạng thái hợp lệ

```
khong_co  (không COD)

cho_thu
  ├─ [Thu trực tiếp]   ──────────────────► da_thu
  └─ [Chành thu]       ──► da_thu_chanh
                                │
                     [VP Nhận nhận từ Chành]
                                │
                                ▼
                             da_thu
                                │
                  [Đưa vào PhieuChuyenCOD]
                  [VP Gửi xác nhận nhận]
                                │
                                ▼
                            da_chuyen
                                │
                    [Đợt trả COD - gom lô]
                                │
                                ▼
                             da_tra ✅
```

### Guard rules (bất biến)

| Hành động | Điều kiện bắt buộc |
|---|---|
| Thu trực tiếp | `cho_thu` |
| Ghi nhận chành thu | `cho_thu` + BN có `chanh_id` |
| VP Nhận nhận từ chành | `da_thu_chanh` |
| Đưa vào PhieuChuyenCOD | `da_thu` |
| VP Gửi xác nhận | PhieuChuyenCOD `da_chuyen` |
| Trả người gửi (lô) | `da_chuyen` |
| Xóa `thu_ho` | Chỉ khi `cho_thu` hoặc `khong_co` |
| Xóa BN | Cấm nếu `da_thu` trở lên |

### So sánh với state machine cũ

| Cũ | Mới | Ghi chú |
|---|---|---|
| `cho_thu` | `cho_thu` | Không đổi |
| `da_thu` | `da_thu_chanh` + `da_thu` | Tách luồng Chành |
| `da_chuyen` | `da_chuyen` | Giờ gắn với PhieuChuyenCOD |
| `da_tra` | `da_tra` | Giờ là batch |
| *(không có)* | BNTH (chứng từ) | Mới hoàn toàn |

---

*Phần 3: Schema — Phần 4: API & Phân quyền*

---

## PHẦN 3 — Database Schema

### 3.1 Cập nhật Enum `TrangThaiCOD`

```prisma
enum TrangThaiCOD {
  khong_co       // Không có COD
  cho_thu        // Chờ thu từ người nhận
  da_thu_chanh   // [MỚI] Chành đã thu, chờ nộp về VP Nhận
  da_thu         // VP Nhận đang giữ tiền
  da_chuyen      // VP Gửi đã xác nhận nhận tiền
  da_tra         // Đã trả cho người gửi
}
```

---

### 3.2 Entity mới: `BienNhanThuHo` (Biên nhận thu hộ)

**Mục đích:** Chứng từ in ra giao cho **người nhận hàng** khi VP Nhận (hoặc Chành) thu tiền COD từ họ.

```prisma
model BienNhanThuHo {
  id              Int                   @id @default(autoincrement())
  ma_bnth         String                @unique @db.VarChar(20)  // VD: BNTH-0001
  ngay_thu        DateTime              @default(now())

  bien_nhan_id    Int                   @unique  // 1 BN -> 1 BNTH
  so_tien         Decimal               @db.Decimal(15, 0)
  nguoi_nop       String                @db.VarChar(200)  // Tên người nộp tiền
  hinh_thuc       HinhThucThanhToan     @default(tien_mat)
  ghi_chu         String?               @db.Text

  // Ai thu? ở đâu?
  van_phong_id    Int   // VP Nhận hàng (hoặc VP quản lý Chành)
  nhan_vien_id    Int   // NV ghi nhận
  la_qua_chanh    Boolean @default(false)  // true = Chành thu hộ

  created_at      DateTime              @default(now())

  bien_nhan  BienNhan @relation(fields: [bien_nhan_id], references: [id])
  van_phong  VanPhong @relation(fields: [van_phong_id], references: [id])
  nhan_vien  NhanVien @relation(fields: [nhan_vien_id], references: [id])

  @@index([ngay_thu])
  @@index([van_phong_id])
  @@map("bien_nhan_thu_ho")
}
```

> **Lưu ý:** 1 biên nhận (BN) chỉ có tối đa 1 BNTH (`@unique` trên `bien_nhan_id`).

---

### 3.3 Entity mới: `PhieuChuyenCOD` (Phưếu chuyển COD)

**Mục đích:** Tài liệu nội bộ để VP Nhận gom nhiều BN và chuyển tiền về VP Gửi. Hỗ trợ chuyển lẻ lẫn lô.

```prisma
enum TrangThaiPhieuChuyen {
  cho_chuyen   // Đã lập, chưa gửi tiền
  da_chuyen    // Đã gửi (xe / chuyển khoản)
  da_nhan      // VP Gửi đã xác nhận nhận đủ tiền
}

model PhieuChuyenCOD {
  id                  Int                     @id @default(autoincrement())
  ma_phieu            String                  @unique @db.VarChar(20)  // VD: PC-COD-0001
  ngay_lap            DateTime                @default(now())
  ngay_chuyen         DateTime?
  ngay_nhan           DateTime?

  van_phong_nhan_id   Int   // VP đang giữ tiền (bên lập)
  van_phong_gui_id    Int   // VP sẽ nhận tiền về

  so_tien_tong        Decimal                 @db.Decimal(15, 0)
  hinh_thuc           HinhThucThanhToan       @default(tien_mat)
  trang_thai          TrangThaiPhieuChuyen    @default(cho_chuyen)
  ghi_chu             String?                 @db.Text

  nhan_vien_lap_id    Int   // NV lập (VP Nhận)
  nhan_vien_nhan_id   Int?  // NV xác nhận (VP Gửi)

  created_at          DateTime                @default(now())
  updated_at          DateTime                @updatedAt

  // Relations
  van_phong_nhan      VanPhong @relation("PCCOD_VPNhan", ...)
  van_phong_gui       VanPhong @relation("PCCOD_VPGui", ...)
  nhan_vien_lap       NhanVien @relation("PCCOD_Lap", ...)
  nhan_vien_nhan      NhanVien? @relation("PCCOD_Nhan", ...)
  chi_tiet            PhieuChuyenCODChiTiet[]
  phieu_chi           PhieuChi?  // @ VP Nhận (chi ra)
  phieu_thu           PhieuThu?  // @ VP Gửi (thu vào)

  @@index([van_phong_nhan_id, trang_thai])
  @@index([van_phong_gui_id, trang_thai])
  @@map("phieu_chuyen_cod")
}

model PhieuChuyenCODChiTiet {
  id            Int     @id @default(autoincrement())
  phieu_id      Int
  bien_nhan_id  Int     // BN được gộp vào
  so_tien       Decimal @db.Decimal(15, 0)  // Snapshot thu_ho lúc lập

  phieu         PhieuChuyenCOD @relation(...)
  bien_nhan     BienNhan       @relation(...)

  @@unique([phieu_id, bien_nhan_id])
  @@map("phieu_chuyen_cod_chi_tiet")
}
```

---

### 3.4 Cập nhật `BienNhan`

Thêm relation tới 2 entity mới:

```prisma
model BienNhan {
  // ... existing fields ...

  // [MỚI] Relations
  bien_nhan_thu_ho       BienNhanThuHo?
  phieu_chuyen_chi_tiet  PhieuChuyenCODChiTiet[]
}
```

---

### 3.5 Bảng tổng hợp phiếu thu/chi theo từng bước

| Bước | Sự kiện | Tại VP | Chứng từ sinh ra | Loại |
|---|---|---|---|---|
| Thu từ khách | VP Nhận (hoặc Chành) thu | VP Nhận | `BienNhanThuHo` (giao khách) + `PhieuThu` | THU |
| Lập PhieuChuyenCOD | VP Nhận chi tiền đi | VP Nhận | `PhieuChi` gắn vào PhieuChuyenCOD | CHI |
| VP Gửi xác nhận | VP Gửi nhận tiền về | VP Gửi | `PhieuThu` gắn vào PhieuChuyenCOD | THU |
| Trả người gửi (lô) | VP Gửi chi ra | VP Gửi | `PhieuChi` per-BN | CHI |

---

*Phần 4: API & Phân quyền*

---

## PHẦN 4 — API Endpoints & Phân quyền

### 4.1 Module `/api/thu-ho` (cập nhật)

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/` | Danh sách BN có COD | admin, accountant |
| GET | `/tong-hop` | Dashboard 4/6 trạng thái | admin, accountant |
| POST | `/:id/xac-nhan-thu` | Thu trực tiếp, tạo BNTH | **admin, accountant, staff** |
| POST | `/:id/xac-nhan-thu-chanh` | Ghi nhận chành đã thu | admin, accountant, staff |
| POST | `/:id/xac-nhan-nhan-tu-chanh` | VP Nhận xác nhận nhận từ chành, tạo BNTH | admin, accountant, staff |
| POST | `/tra-lo` | **[MỚI]** Trả nhiều BN cho người gửi (gom lô) | admin, accountant |

> **Xóa endpoints cũ:** `xac-nhan-chuyen`, `xac-nhan-tra` (per-BN) → thay bằng PhieuChuyenCOD và `tra-lo`.

---

### 4.2 Module mới `/api/phieu-chuyen-cod`

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/` | Danh sách phiếu chuyển | admin, accountant |
| POST | `/` | Lập phiếu chuyển COD (gom lô) | admin, accountant |
| PATCH | `/:id/xac-nhan-chuyen` | VP Nhận xác nhận đã gửi tiền đi | admin, accountant |
| PATCH | `/:id/xac-nhan-nhan` | VP Gửi xác nhận đã nhận tiền | admin, accountant, **staff** |
| GET | `/:id` | Chi tiết phiếu chuyển + danh sách BN | admin, accountant |

> `PATCH xac-nhan-nhan` cần validate: NV đang đăng nhập phải thuộc `van_phong_gui_id`.

---

### 4.3 Module mới `/api/bien-nhan-thu-ho`

| Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|
| GET | `/:id` | Xem BNTH theo bien_nhan_id | admin, accountant, staff |
| GET | `/:id/print` | Xuất PDF BNTH để in | admin, accountant, staff |

> BNTH được tạo tự động khi gọi `xac-nhan-thu` hoặc `xac-nhan-nhan-tu-chanh`, không tạo thủ công.

---

### 4.4 Logic chi tiết các endpoint mới

#### `POST /api/phieu-chuyen-cod` — Lập phiếu chuyển COD

```
Input: { van_phong_gui_id, bien_nhan_ids[], hinh_thuc, ghi_chu }

1. Validate: tất cả BN có trang_thai_cod === 'da_thu'
2. Validate: tất cả BN cùng van_phong_nhan_id với user hiện tại
3. Validate: tất cả BN có cùng van_phong_gui_id (nhập từ input)
4. Transaction:
   a. Tạo PhieuChuyenCOD (trang_thai = cho_chuyen)
   b. Tạo PhieuChuyenCODChiTiet cho từng BN
   c. Tạo PhieuChi @ VP Nhận
   d. Không đổi trang_thai_cod ngay (chờ VP Gửi xác nhận)
```

#### `PATCH /api/phieu-chuyen-cod/:id/xac-nhan-nhan` — VP Gửi xác nhận

```
1. Validate: PhieuChuyenCOD.trang_thai === 'da_chuyen'
2. Validate: user.van_phong_id === phieu.van_phong_gui_id
3. Transaction:
   a. Update PhieuChuyenCOD.trang_thai = 'da_nhan'
   b. Tạo PhieuThu @ VP Gửi
   c. Update tất cả BN trong chi_tiet: trang_thai_cod = 'da_chuyen'
```

#### `POST /api/thu-ho/tra-lo` — Trả nhiều BN cho người gửi

```
Input: { bien_nhan_ids[], hinh_thuc, ghi_chu }

1. Validate: tất cả BN có trang_thai_cod === 'da_chuyen'
2. Validate: tất cả BN có van_phong_gui_id === user.van_phong_id
3. Transaction:
   for each BN:
     a. Tạo PhieuChi @ VP Gửi (nguoi_nhan = người gửi)
     b. Update BN.trang_thai_cod = 'da_tra'
```

---

### 4.5 Bảng phân quyền tổng hợp

| Thao tác | staff | accountant | admin |
|---|---|---|---|
| Thu COD trực tiếp / từ chành | ✅ | ✅ | ✅ |
| Ghi chành đã thu | ✅ | ✅ | ✅ |
| Lập PhieuChuyenCOD | ❌ | ✅ | ✅ |
| Xác nhận đã gửi tiền | ❌ | ✅ | ✅ |
| Xác nhận nhận tiền (VP Gửi) | ✅ | ✅ | ✅ |
| Trả người gửi (lô) | ❌ | ✅ | ✅ |
| Xem danh sách COD / tổng hợp | ❌ | ✅ | ✅ |

---

## Kết luận

### Những gì thay đổi so với hiện tại

| | Cũ | Mới |
|---|---|---|
| Chứng từ khách nhận hàng | Không có | **Biên nhận thu hộ** (in được) |
| Chuyển tiền giữa VP | Per-BN, không kiểm soát | **Phiếu chuyển COD** (gom lô, xác nhận 2 chiều) |
| Trả người gửi | Per-BN | **Gom lô**, 1 lần xác nhận cho nhiều BN |
| Luồng Chành | Không có | State `da_thu_chanh` + flow riêng |
| Kiểm soát quỹ | Yếu | PhieuThu/PhieuChi cân đối tại mỗi VP |
