# BÁO GIÁ DỊCH VỤ PHÁT TRIỂN PHẦN MỀM

## Dự Án: Nâng Cấp ERP TMQ Express — Phase 1

| | |
|---|---|
| **Khách hàng** | Chành xe TMQ Express |
| **Dự án** | Phần mềm quản lý biên nhận, theo dõi vận chuyển, kế toán thu/chi, công nợ, thống kê & xuất bảng kê HĐĐT |
| **Nền tảng** | Web App (truy cập qua trình duyệt — máy tính & điện thoại) |
| **Ngày báo giá** | 27/03/2026 |
| **Hiệu lực** | 30 ngày kể từ ngày báo giá |

---

## I. Bảng Kê Chi Tiết Hạng Mục Phát Triển

| STT | Hạng mục | Mô tả chi tiết | Đơn giá (VNĐ) |
|:---:|---|---|---:|
| 1 | **Hạ tầng & nền tảng** | Cài đặt VPS, CSDL PostgreSQL, Nginx, HTTPS, phân quyền đăng nhập (admin/staff/kế toán) | ___________ |
| 2 | **Quản lý khách hàng** | Danh bạ KH, gợi ý tự động khi nhập biên nhận, lịch sử giao dịch | ___________ |
| 3 | **Biên nhận hàng hóa** | Lập, sửa, tra cứu biên nhận — giao diện web mới (thay thế PM cũ) | ___________ |
| 4 | **In ấn phiếu biên nhận + QR** | In phiếu biên nhận có mã QR từ trình duyệt, xuất PDF khổ A5 | ___________ |
| 5 | **Theo dõi vận chuyển (QR)** | Quét QR bằng điện thoại cập nhật 5 trạng thái. Lưu lịch sử | ___________ |
| 6 | **Xuất bảng kê phục vụ HĐĐT** | Tạo bảng kê (file Excel) → gửi cho kế toán dịch vụ xuất hóa đơn | ___________ |
| 7 | **Tích hợp dữ liệu PM cũ** | Chuyển đổi (migrate) dữ liệu khách hàng, biên nhận từ phần mềm cũ vào hệ thống mới | ___________ |
| 8 | **Kế toán thu/chi** | Lập phiếu thu, phiếu chi, liên kết với biên nhận, in phiếu thu/chi PDF | ___________ |
| 9 | **Quản lý công nợ** | Theo dõi công nợ khách hàng, cảnh báo quá hạn, đối soát thu/chi | ___________ |
| 10 | **Dashboard thống kê** | Biểu đồ doanh thu, tổng quan biên nhận, công nợ (ECharts) | ___________ |
| 11 | **Báo cáo tổng hợp** | Doanh thu theo kỳ, sổ quỹ, so sánh tháng/năm — xuất PDF & Excel | ___________ |
| 12 | **Kiểm thử & nghiệm thu** | Chạy thử tại 3 VP (SG, CT, RG), sửa lỗi, nghiệm thu | ___________ |
| | | **Tổng chi phí phát triển (mục 1-12)** | **___________** |

---

## II. Dịch Vụ Cài Đặt & Vận Hành

| STT | Hạng mục | Mô tả | Đơn giá (VNĐ) |
|:---:|---|---|---:|
| 13 | **Thuê VPS** | VPS 4GB RAM / 2 vCPU E5 v2 / 40GB SSD — Ubuntu 22.04 của Vietnix (VPS SSD 2) | 250K / tháng |
| 14 | **Tên miền (nếu cần)** | VD: tmq-express.io.vn | < 51k600đ / năm |
| 15 | **Cài đặt & triển khai** | Deploy lên VPS, cấu hình production, SSL, backup tự động | ___________ |
| 16 | **Đào tạo sử dụng** | Hướng dẫn nhân viên tại 3 VP sử dụng phần mềm (1-2 buổi) | ___________ |
| | | **Tổng dịch vụ cài đặt (mục 15-16)** | **___________** |

---

## III. Chi Phí Vận Hành Hàng Tháng

| STT | Hạng mục | Đơn giá / tháng (VNĐ) | Ghi chú |
|:---:|---|---:|---|
| 17 | Thuê VPS | 250K | Thanh toán hàng tháng hoặc năm |
| 18 | Bảo trì & hỗ trợ kỹ thuật | ___________ | Sửa lỗi, hỗ trợ từ xa (nếu có) |
| | **Tổng / tháng** | **___________** | |

---

## IV. Tổng Hợp Chi Phí

| Loại | Số tiền (VNĐ) | Ghi chú |
|---|---:|---|
| **A. Phát triển phần mềm** (1 lần) | ___________ | Mục I (STT 1-12) |
| **B. Cài đặt & đào tạo** (1 lần) | ___________ | Mục II (STT 15-16) |
| **C. VPS + vận hành** (hàng tháng) | ___________ | Mục III (STT 17-18) |
| | | |
| **TỔNG DỰ ÁN (A + B)** | **___________** | Thanh toán 1 lần |
| **CHI PHÍ HÀNG THÁNG (C)** | **___________** | Thanh toán định kỳ |

---

## V. Lịch Thanh Toán Đề Xuất

| Đợt | Thời điểm | Tỷ lệ | Số tiền (VNĐ) |
|:---:|---|:---:|---:|
| 1 | Ký hợp đồng, bắt đầu dự án | 30% | ___________ |
| 2 | Hoàn thành biên nhận + in ấn + QR tracking + migrate dữ liệu cũ | 30% | ___________ |
| 3 | Hoàn thành kế toán thu/chi + công nợ + dashboard + báo cáo | 20% | ___________ |
| 4 | Nghiệm thu, bàn giao, đào tạo | 20% | ___________ |
| | | **Tổng** | **___________** |

---

## VI. Chi Phí Bản Quyền Phần Mềm

| Thành phần | Chi phí |
|---|---|
| Frontend (Vue.js 3) | **0 VNĐ** |
| Backend (Node.js + Fastify) | **0 VNĐ** |
| Database (PostgreSQL 16) | **0 VNĐ** |
| PDF + QR (pdfmake + qrcode) | **0 VNĐ** |
| Hệ điều hành (Ubuntu Linux) | **0 VNĐ** |
| **Tổng chi phí bản quyền** | **0 VNĐ / Trọn đời** |

> [!NOTE]
> Toàn bộ phần mềm sử dụng **mã nguồn mở** — khách hàng không phải trả bất kỳ chi phí bản quyền nào. Chi phí dịch vụ kế toán HĐĐT do khách hàng chi trả riêng theo hợp đồng với kế toán dịch vụ.

---

## VII. Phạm Vi Bàn Giao

### Bao gồm trong báo giá

| # | Hạng mục | Chi tiết |
|:---:|---|---|
| ✅ | Mã nguồn | Toàn bộ source code frontend + backend (bàn giao qua Git) |
| ✅ | CSDL | Thiết kế database + dữ liệu mẫu ban đầu |
| ✅ | Dữ liệu cũ | Chuyển đổi dữ liệu từ PM cũ vào hệ thống mới |
| ✅ | Triển khai | Cài đặt VPS, deploy production, cấu hình SSL |
| ✅ | Tài liệu | Hướng dẫn sử dụng + tài liệu kỹ thuật |
| ✅ | Đào tạo | Hướng dẫn NV sử dụng (1-2 buổi) |
| ✅ | Bảo hành | Sửa lỗi miễn phí trong 3 tháng sau nghiệm thu |

### Không bao gồm

| # | Hạng mục | Ghi chú |
|:---:|---|---|
| ❌ | Trực tiếp xuất HĐĐT qua API | Kế toán dịch vụ xử lý |
| ❌ | Thiết bị phần cứng | Khách hàng tự trang bị máy tính, ĐT |

---

## VIII. Tài Liệu Kỹ Thuật Đính Kèm

| Tài liệu | Mô tả |
|---|---|
| [KeHoach_Phase1.md](./Phase1/KeHoach_Phase1.md) | Kế hoạch triển khai chi tiết Phase 1 |
| [NghiepVu_ChiTiet_Phase1.md](./Phase1/NghiepVu_ChiTiet_Phase1.md) | Mô tả 14 nghiệp vụ chi tiết |
| [DatabaseSchema_Phase1.md](./Phase1/DatabaseSchema_Phase1.md) | Thiết kế cơ sở dữ liệu |
| [Wireframes_Phase1.md](./Phase1/Wireframes_Phase1.md) | Phác thảo giao diện |
| [TechStack_Architecture.md](./Phase1/TechStack_Architecture.md) | Công nghệ & kiến trúc |
| [SoSanh_CongNghe_VPS.md](./Phase1/SoSanh_CongNghe_VPS.md) | So sánh công nghệ & yêu cầu VPS |
| [ERP_MasterPlan.md](./TongThe_NangCap_ERP/ERP_MasterPlan.md) | Kế hoạch tổng thể toàn hệ thống |

---

> **Chữ ký hai bên**
>
> | | Bên cung cấp dịch vụ | Bên khách hàng |
> |---|---|---|
> | Đại diện | _________________________ | _________________________ |
> | Chức vụ | _________________________ | _________________________ |
> | Ngày ký | ______ / ______ / 2026 | ______ / ______ / 2026 |
