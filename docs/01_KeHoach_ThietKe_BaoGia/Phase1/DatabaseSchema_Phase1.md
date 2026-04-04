# Thiết Kế Cơ Sở Dữ Liệu — Phase 1 (Toàn Bộ)

> Schema cho toàn bộ Phase 1: biên nhận, QR tracking, bảng kê HĐĐT, kế toán thu/chi, công nợ.
>
> Kế hoạch tổng thể xem tại [ERP_MasterPlan.md](../TongThe_NangCap_ERP/ERP_MasterPlan.md)

---

## Bảng `van_phong` (Chi nhánh)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `ma_vp` | VARCHAR(10) | Mã chi nhánh (SG, CT, RG) |
| `ten` | VARCHAR(200) | Tên VP |
| `dia_chi` | VARCHAR(500) | Địa chỉ |
| `dien_thoai` | VARCHAR(20) | Số ĐT |
| `active` | BOOLEAN | Đang hoạt động |

## Bảng `nhan_vien` (Nhân sự)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `ma_nv` | VARCHAR(20) UNIQUE | Mã NV |
| `ten` | VARCHAR(200) | Tên |
| `van_phong_id` | FK → van_phong | VP làm việc |
| `role` | VARCHAR(50) | `admin` / `staff` / `accountant` |
| `username` | VARCHAR(100) UNIQUE | Tài khoản |
| `password_hash` | VARCHAR(255) | Mật khẩu mã hóa |
| `active` | BOOLEAN | Đang hoạt động |

## Bảng `khach_hang` (Khách hàng)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `ma_kh` | VARCHAR(20) UNIQUE | Mã KH |
| `ten_don_vi` | VARCHAR(200) | Tên công ty / cửa hàng |
| `nguoi_lien_he` | VARCHAR(200) | Người liên hệ |
| `dien_thoai` | VARCHAR(20) | SĐT |
| `dia_chi` | VARCHAR(500) | Địa chỉ |
| `email` | VARCHAR(200) | Email |
| `ma_so_thue` | VARCHAR(20) | Mã số thuế (10 hoặc 13 chữ số) |
| `ghi_chu` | TEXT | Ghi chú |
| `active` | BOOLEAN | Còn hoạt động |
| `created_at` | TIMESTAMP | Ngày tạo |

## Bảng `bien_nhan` (Dữ liệu cốt lõi)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `ma_so` | VARCHAR(20) UNIQUE | Mã tự gen (VD: SGRG-0048) |
| `ngay_nhan` | TIMESTAMP | Ngày giờ nhận hàng |
| `van_phong_gui_id` | FK → van_phong | VP gửi |
| `van_phong_nhan_id` | FK → van_phong | VP nhận |
| `nhan_vien_nhap_id` | FK → nhan_vien | NV lập |
| `gia_cuoc` | DECIMAL(15,0) | Cước phí (VNĐ) |
| `trang_thai_thu` | ENUM | Đã thu / Chưa thu / Công nợ |
| `don_vi_gui` | VARCHAR(200) | Công ty gửi |
| `nguoi_gui` | VARCHAR(200) | Tên người gửi |
| `dien_thoai_gui` | VARCHAR(20) | SĐT gửi |
| `dia_chi_gui` | VARCHAR(500) | Địa chỉ gửi |
| `don_vi_nhan` | VARCHAR(200) | Công ty nhận |
| `nguoi_nhan` | VARCHAR(200) | Tên người nhận |
| `dien_thoai_nhan` | VARCHAR(20) | SĐT nhận |
| `dia_chi_nhan` | VARCHAR(500) | Địa chỉ nhận |
| `so_cccd` | VARCHAR(20) | CCCD người nhận |
| `ten_hang_hoa` | TEXT | Chi tiết hàng hóa |
| `gia_tri_hang` | DECIMAL(15,0) | Giá trị khai báo |
| `trong_luong` | DECIMAL(10,2) | Trọng lượng (KG) |
| `thu_ho` | DECIMAL(15,0) | CoD |
| `hang_hu_khong_den` | BOOLEAN | Chấp nhận rủi ro |
| `can_xuat_hddt` | BOOLEAN DEFAULT FALSE | Cần xuất HĐĐT |
| `hinh_thuc_giao` | ENUM | Tận nơi / ĐT đến nhận / Tự tới |
| `trang_thai` | ENUM | Chờ VC / Đang VC / Đã đến kho / Đã báo khách / Khách đã nhận |
| `created_at` | TIMESTAMP | Thời gian tạo |

## Bảng `lich_su_trang_thai` (Lịch sử vận chuyển)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `bien_nhan_id` | FK → bien_nhan | Biên nhận nào |
| `trang_thai_cu` | ENUM | Trạng thái cũ |
| `trang_thai_moi` | ENUM | Trạng thái mới |
| `nhan_vien_id` | FK → nhan_vien | NV cập nhật |
| `phuong_thuc` | VARCHAR(20) | `qr_scan` / `manual` / `batch` |
| `ghi_chu` | TEXT | Ghi chú |
| `created_at` | TIMESTAMP | Thời gian |

## Bảng `bang_ke` (Lịch sử bảng kê HĐĐT)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `ma_bang_ke` | VARCHAR(50) UNIQUE | Mã tự sinh (BK-20260320-001) |
| `ngay_xuat` | TIMESTAMP | Thời gian xuất |
| `nhan_vien_xuat_id` | FK → nhan_vien | NV xuất (Admin) |
| `van_phong_id` | FK → van_phong | VP xuất |
| `so_bien_nhan` | INTEGER | Số BN trong bảng kê |
| `tong_cuoc` | DECIMAL(15,0) | Tổng cước |
| `ten_file` | VARCHAR(255) | Tên file Excel |
| `created_at` | TIMESTAMP | Thời gian tạo |

## Bảng `bang_ke_chi_tiet`

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `bang_ke_id` | FK → bang_ke | Thuộc bảng kê nào |
| `bien_nhan_id` | FK → bien_nhan | Biên nhận nào |

## Bảng `phieu_thu` (Thu tiền)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `ma_phieu` | VARCHAR(20) UNIQUE | Mã phiếu thu (PT-0001) |
| `ngay_thu` | TIMESTAMP | Ngày thu |
| `van_phong_id` | FK → van_phong | VP thực hiện |
| `nhan_vien_id` | FK → nhan_vien | NV thu |
| `doi_tuong` | VARCHAR(200) | Người nộp tiền |
| `ly_do` | TEXT | Nội dung thu |
| `so_tien` | DECIMAL(15,0) | Số tiền (VNĐ) |
| `hinh_thuc` | ENUM | Tiền mặt / Chuyển khoản |
| `bien_nhan_id` | FK → bien_nhan NULL | Liên kết BN |
| `created_at` | TIMESTAMP | Thời gian tạo |

## Bảng `phieu_chi` (Chi trả)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `ma_phieu` | VARCHAR(20) UNIQUE | Mã phiếu chi (PC-0001) |
| `ngay_chi` | TIMESTAMP | Ngày chi |
| `van_phong_id` | FK → van_phong | VP thực hiện |
| `nhan_vien_id` | FK → nhan_vien | NV duyệt |
| `nguoi_nhan` | VARCHAR(200) | Người nhận tiền |
| `ly_do` | TEXT | Nội dung chi |
| `so_tien` | DECIMAL(15,0) | Số tiền (VNĐ) |
| `hinh_thuc` | ENUM | Tiền mặt / Chuyển khoản |
| `created_at` | TIMESTAMP | Thời gian tạo |

## Bảng `cong_no` (Công nợ khách hàng)

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | SERIAL PK | Khóa chính |
| `doi_tuong` | VARCHAR(200) | Tên KH / đơn vị |
| `bien_nhan_id` | FK → bien_nhan | Phát sinh từ BN nào |
| `so_tien_no` | DECIMAL(15,0) | Số tiền nợ |
| `ngay_phat_sinh` | TIMESTAMP | Ngày phát sinh |
| `ngay_thu` | TIMESTAMP NULL | Ngày thanh toán (NULL = chưa) |
| `phieu_thu_id` | FK → phieu_thu NULL | Liên kết phiếu thu khi đã TT |
| `trang_thai` | ENUM | Chưa thu / Đã thu / Quá hạn |
| `ghi_chu` | TEXT | Ghi chú |

---

## Sơ Đồ Quan Hệ (ER Diagram)

```mermaid
erDiagram
    van_phong ||--o{ nhan_vien : "NV thuộc VP"
    van_phong ||--o{ bien_nhan : "VP gửi / VP nhận"
    nhan_vien ||--o{ bien_nhan : "NV lập"
    bien_nhan ||--o{ lich_su_trang_thai : "lịch sử trạng thái"
    nhan_vien ||--o{ lich_su_trang_thai : "NV cập nhật"
    bang_ke ||--o{ bang_ke_chi_tiet : "chứa nhiều BN"
    bien_nhan ||--o{ bang_ke_chi_tiet : "thuộc bảng kê"
    nhan_vien ||--o{ bang_ke : "NV xuất"
    nhan_vien ||--o{ phieu_thu : "NV thu"
    nhan_vien ||--o{ phieu_chi : "NV chi"
    bien_nhan ||--o{ phieu_thu : "thu từ BN"
    bien_nhan ||--o{ cong_no : "phát sinh nợ"
    phieu_thu ||--o{ cong_no : "thanh toán nợ"

    van_phong { serial id PK }
    nhan_vien { serial id PK; varchar role }
    khach_hang { serial id PK }
    bien_nhan { serial id PK; enum trang_thai }
    lich_su_trang_thai { serial id PK }
    bang_ke { serial id PK }
    bang_ke_chi_tiet { serial id PK }
    phieu_thu { serial id PK }
    phieu_chi { serial id PK }
    cong_no { serial id PK; enum trang_thai }
```
