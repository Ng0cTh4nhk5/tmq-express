# Thiết Kế REST API — Phase 1

> **Mục đích**: Đặc tả toàn bộ API endpoints cho Phase 1. Tài liệu này là **hợp đồng** giữa frontend và backend.
>
> Tham khảo: [NghiepVu_ChiTiet_Phase1.md](./NghiepVu_ChiTiet_Phase1.md) · [DatabaseSchema_Phase1.md](./DatabaseSchema_Phase1.md) · [Wireframes_Phase1.md](./Wireframes_Phase1.md)

---

## Quy Ước Chung

### Base URL
```
https://tmq.example.com/api
```

### Authentication
Mọi endpoint (trừ `POST /auth/login`) yêu cầu: `Authorization: Bearer <JWT_TOKEN>`
Token hết hạn sau **8 giờ** (NV-1.3).

### Response Format

**Thành công:**
```json
{ "success": true, "data": { }, "message": "..." }
```

**Thành công (phân trang):**
```json
{ "success": true, "data": [ ], "pagination": { "page": 1, "limit": 20, "total": 156, "totalPages": 8 } }
```

**Lỗi:**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "ten_don_vi", "message": "Trường bắt buộc" }] } }
```

### HTTP Status Codes

| Status | Mã lỗi | Ý nghĩa |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Dữ liệu không hợp lệ |
| `401` | `UNAUTHORIZED` | Chưa đăng nhập / Token hết hạn |
| `403` | `FORBIDDEN` | Không đủ quyền |
| `404` | `NOT_FOUND` | Không tìm thấy |
| `409` | `CONFLICT` | Dữ liệu trùng (VD: username) |
| `500` | `INTERNAL_ERROR` | Lỗi server |

### Query Params Chung

| Param | Kiểu | Mô tả | Mặc định |
|---|---|---|---|
| `page` | number | Trang hiện tại | `1` |
| `limit` | number | Số dòng/trang | `20` |
| `sort` | string | `field:asc` hoặc `field:desc` | Tùy endpoint |
| `search` | string | Full-text search | — |
| `from` / `to` | date | Khoảng ngày (YYYY-MM-DD) | — |

### Format Dữ Liệu

| Kiểu | Format | Ví dụ |
|---|---|---|
| Ngày giờ | ISO 8601 | `2026-03-27T09:15:00+07:00` |
| Tiền | number (VNĐ, không thập phân) | `150000` |
| Trọng lượng | number (KG) | `12.50` |

### Enum Values

| Field | Values |
|---|---|
| `nhan_vien.role` | `admin`, `staff`, `accountant` |
| `bien_nhan.trang_thai` | `cho_vc`, `dang_vc`, `da_den_kho`, `da_bao_khach`, `khach_da_nhan` |
| `bien_nhan.trang_thai_thu` | `da_thu`, `chua_thu`, `cong_no` |
| `bien_nhan.hinh_thuc_giao` | `tan_noi`, `goi_dien`, `tu_toi` |
| `phieu_thu/chi.hinh_thuc` | `tien_mat`, `chuyen_khoan` |
| `cong_no.trang_thai` | `chua_thu`, `da_thu`, `qua_han` |
| `lich_su.phuong_thuc` | `qr_scan`, `manual`, `batch` |

---

## 1. Xác Thực (Authentication)

### `POST /auth/login` — Đăng nhập
**Public** (không cần token)

**Request:** `{ "username": "nva", "password": "Tmq@1234" }`

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 1, "ma_nv": "NV-SG-001", "ten": "Nguyễn Văn A",
    "role": "admin",
    "van_phong": { "id": 1, "ma_vp": "SG", "ten": "VP Tp.HCM" },
    "require_password_change": false
  }
}
```

### `POST /auth/change-password` — Đổi mật khẩu
**Request:** `{ "current_password": "...", "new_password": "..." }` (≥ 6 ký tự)

### `GET /auth/me` — Thông tin user hiện tại

---

## 2. Văn Phòng — Quyền: `admin`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/van-phong` | DS văn phòng (`?active=true`) — không phân trang |
| POST | `/van-phong` | Thêm VP (`ma_vp` 2-3 ký tự, duy nhất, không đổi) |
| PUT | `/van-phong/:id` | Sửa VP (không sửa `ma_vp`) |
| PATCH | `/van-phong/:id/active` | Bật/tắt: `{ "active": false }` |

---

## 3. Khách Hàng — Quyền: admin, staff (CRUD) · accountant (xem)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/khach-hang` | DS + phân trang `?search=Tâm&active=true` |
| GET | `/khach-hang/autocomplete` | Gợi ý (≤5 KQ, ≤300ms) `?q=Tâm` |
| GET | `/khach-hang/:id` | Chi tiết + lịch sử giao dịch |
| POST | `/khach-hang` | Thêm KH (`ma_kh` tự sinh, `ten_don_vi` bắt buộc) |
| PUT | `/khach-hang/:id` | Sửa (không sửa `ma_kh`) |
| PATCH | `/khach-hang/:id/active` | Vô hiệu hóa (admin only) |

**POST/PUT Validation:** `ten_don_vi` bắt buộc · `ma_so_thue` 10 hoặc 13 số · `dien_thoai` 10-11 số

---

## 4. Biên Nhận — Quyền: admin, staff (CRUD) · accountant (xem)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/bien-nhan` | DS + phân trang + bộ lọc (xem bên dưới) |
| GET | `/bien-nhan/:id` | Chi tiết + lịch sử trạng thái + thông tin bảng kê |
| GET | `/bien-nhan/next-ma-so` | Preview mã tiếp `?van_phong_gui_id=1&van_phong_nhan_id=3` |
| POST | `/bien-nhan` | Tạo BN mới |
| PUT | `/bien-nhan/:id` | Sửa BN (staff chỉ BN mình tạo, không sửa `ma_so`) |
| PATCH | `/bien-nhan/:id/trang-thai` | Cập nhật trạng thái VC (tuần tự, admin quay lại được) |
| PATCH | `/bien-nhan/batch-trang-thai` | Cập nhật hàng loạt "Gửi xe" |
| GET | `/bien-nhan/:id/pdf` | Tạo PDF biên nhận (A5+QR, ≤2s) |

**GET query params:**
```
?page=1&limit=20&search=SGRG-0048
&from=2026-03-20&to=2026-03-27
&van_phong_gui_id=1&van_phong_nhan_id=3
&trang_thai=dang_vc&trang_thai_thu=da_thu
&sort=ngay_nhan:desc
```

> Staff tự filter theo VP mình. Accountant chỉ xem.

**POST Request:**
```json
{
  "van_phong_nhan_id": 3,
  "ngay_nhan": "2026-03-27T09:00:00+07:00",
  "don_vi_gui": "Cty Tâm An", "nguoi_gui": "Nguyễn Văn A",
  "dien_thoai_gui": "0901234567", "dia_chi_gui": "123 Nguyễn Trãi",
  "don_vi_nhan": "Kho PQ", "nguoi_nhan": "Lê C",
  "dien_thoai_nhan": "0911222333", "dia_chi_nhan": "45 Ng Trung Trực",
  "so_cccd": "079123456789",
  "ten_hang_hoa": "Phụ tùng xe máy",
  "gia_tri_hang": 5000000, "trong_luong": 12.50, "thu_ho": 0,
  "gia_cuoc": 150000, "trang_thai_thu": "da_thu",
  "hang_hu_khong_den": false, "can_xuat_hddt": true,
  "hinh_thuc_giao": "tan_noi"
}
```

**Server tự động:** `ma_so` sinh `{VP_GUI}{VP_NHAN}-XXXX` · `van_phong_gui_id` + `nhan_vien_nhap_id` từ token · `trang_thai` = `cho_vc` · Nếu `trang_thai_thu=cong_no` → auto-tạo `cong_no`

**Cập nhật trạng thái:** `PATCH /bien-nhan/:id/trang-thai`
```json
{ "trang_thai": "da_den_kho", "ghi_chu": "Hàng nguyên vẹn", "phuong_thuc": "qr_scan" }
```
Tuần tự: `cho_vc → dang_vc → da_den_kho → da_bao_khach → khach_da_nhan`. Admin quay lại được.

**Batch:** `PATCH /bien-nhan/batch-trang-thai`
```json
{ "bien_nhan_ids": [48, 49, 50], "trang_thai": "dang_vc" }
```

---

## 5. Quét QR (Mobile)

### `GET /scan/:ma_so` — Quyền: admin, staff

```json
{
  "id": 48, "ma_so": "SGRG-0048",
  "don_vi_gui": "Cty Tâm An", "don_vi_nhan": "Kho PQ",
  "gia_cuoc": 150000, "trang_thai": "dang_vc",
  "trang_thai_tiep_theo": "da_den_kho"
}
```
> `trang_thai_tiep_theo = null` khi đã ở bước cuối.

---

## 6. Bảng Kê HĐĐT — Quyền: `admin`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/bang-ke/bien-nhan-cho` | DS BN đánh dấu HĐĐT & chưa vào bảng kê `?ngay=2026-03-27` |
| POST | `/bang-ke` | Xuất bảng kê `{ "bien_nhan_ids": [48,50] }` → trả download URL |
| GET | `/bang-ke` | Lịch sử bảng kê đã xuất |
| GET | `/bang-ke/:id/download` | Tải lại file Excel |

---

## 7. Nhân Viên — Quyền: `admin`

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/nhan-vien` | DS `?van_phong_id=1&active=true` |
| POST | `/nhan-vien` | Thêm NV (`ma_nv` + `username` duy nhất, `password` ≥ 6) |
| PUT | `/nhan-vien/:id` | Sửa (không sửa `username`) |
| PATCH | `/nhan-vien/:id/active` | Vô hiệu hóa |
| POST | `/nhan-vien/:id/reset-password` | Reset MK → yêu cầu đổi lần đầu |

---

## 8. Phiếu Thu — Quyền: admin, accountant

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/phieu-thu` | DS `?from=...&to=...&van_phong_id=1&hinh_thuc=tien_mat` |
| GET | `/phieu-thu/:id` | Chi tiết |
| POST | `/phieu-thu` | Lập phiếu (`ma_phieu` tự sinh `PT-XXXX`) |
| PUT | `/phieu-thu/:id` | Sửa (KT chỉ sửa phiếu mình tạo) |
| PATCH | `/phieu-thu/:id/huy` | Hủy (admin only) |
| GET | `/phieu-thu/:id/pdf` | In PDF (A5) |

**POST:** `{ "doi_tuong": "...", "ly_do": "...", "so_tien": 150000, "hinh_thuc": "tien_mat", "bien_nhan_id": 48 }`
Nếu có `bien_nhan_id` → auto-fill `doi_tuong`, `so_tien`, `ly_do`.

---

## 9. Phiếu Chi — Quyền: admin, accountant

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/phieu-chi` | DS |
| POST | `/phieu-chi` | Lập phiếu (`ma_phieu` tự sinh `PC-XXXX`) |
| PUT | `/phieu-chi/:id` | Sửa (KT chỉ sửa phiếu mình) |
| PATCH | `/phieu-chi/:id/huy` | Hủy (admin only) |
| GET | `/phieu-chi/:id/pdf` | In PDF (A5) |

---

## 10. Công Nợ — Quyền: admin, accountant

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/cong-no` | DS `?trang_thai=chua_thu,qua_han` + summary tổng nợ |
| POST | `/cong-no/:id/xac-nhan-thanh-toan` | Xác nhận TT → auto-tạo phiếu thu |

**Xác nhận TT:** `{ "hinh_thuc": "tien_mat", "ghi_chu": "KH trả tại quầy" }`
→ Response kèm `phieu_thu: { id, ma_phieu }` đã được tạo tự động.

---

## 11. Dashboard & Báo Cáo

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/dashboard/stats` | all | Card thống kê (BN hôm nay, doanh thu, công nợ...) |
| GET | `/dashboard/doanh-thu-7-ngay` | all | Bar chart doanh thu |
| GET | `/dashboard/ty-le-tuyen` | all | Pie chart tuyến đường |
| GET | `/dashboard/thu-chi-theo-thang` | all | Line chart thu/chi |
| GET | `/bao-cao/doanh-thu` | admin, KT | BC doanh thu theo kỳ |
| GET | `/bao-cao/doanh-thu/export` | admin, KT | Xuất PDF/Excel `?format=pdf` |
| GET | `/bao-cao/so-quy` | admin, KT | Sổ quỹ tiền mặt |
| GET | `/bao-cao/bien-nhan` | admin, KT | BC biên nhận theo tuyến |
| GET | `/bao-cao/cong-no` | admin, KT | BC công nợ tổng hợp |

> Staff chỉ xem dashboard VP mình (auto-filter).

---

## Tổng Hợp: 53 Endpoints

| Module | Số EP | Methods |
|---|---|---|
| Auth | 3 | login, change-password, me |
| Văn phòng | 4 | CRUD + active toggle |
| Khách hàng | 6 | CRUD + autocomplete + active |
| Biên nhận | 8 | CRUD + status + batch + PDF + next-ma-so |
| Quét QR | 1 | scan |
| Bảng kê | 4 | list-pending + create + history + download |
| Nhân viên | 5 | CRUD + active + reset-password |
| Phiếu thu | 6 | CRUD + cancel + PDF |
| Phiếu chi | 5 | CRUD + cancel + PDF |
| Công nợ | 2 | list + confirm-payment |
| Dashboard | 4 | stats + 3 charts |
| Báo cáo | 5 | 4 reports + export |
| **Tổng** | **53** | |
