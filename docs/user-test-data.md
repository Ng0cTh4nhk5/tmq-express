# TMQ Express — Bộ Dữ Liệu User Test

> **Mục đích:** Dữ liệu mẫu để thực hiện user testing toàn diện. Mỗi bản ghi đã điền đầy đủ tất cả các trường, kể cả tùy chọn.
> **Mật khẩu chung:** `Tmq@1234`

---

## 1. VĂN PHÒNG (3 bản ghi)

### VP-1 — Hồ Chí Minh
| Trường | Giá trị |
|---|---|
| Mã VP | `SG` |
| Tên | `Văn phòng TP. Hồ Chí Minh` |
| Địa chỉ | `491 Lê Hồng Phong, Phường 2, Quận 10, TP.HCM` |
| Điện thoại | `02838333879` |
| Trạng thái | Active |

### VP-2 — Cần Thơ
| Trường | Giá trị |
|---|---|
| Mã VP | `CT` |
| Tên | `Văn phòng Cần Thơ` |
| Địa chỉ | `20 Đại lộ Hòa Bình, Phường Tân An, Quận Ninh Kiều, TP Cần Thơ` |
| Điện thoại | `02922223344` |
| Trạng thái | Active |

### VP-3 — Rạch Giá
| Trường | Giá trị |
|---|---|
| Mã VP | `RG` |
| Tên | `Văn phòng Rạch Giá` |
| Địa chỉ | `15 Nguyễn Trung Trực, Phường Vĩnh Thanh, TP Rạch Giá, Kiên Giang` |
| Điện thoại | `02973866444` |
| Trạng thái | Active |

---

## 2. NHÂN VIÊN (9 bản ghi)

> **Mật khẩu chung:** `Tmq@1234`

### NV-1 — Admin
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-SG-001` |
| Tên | `Trần Minh Quang` |
| Username | `admin` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Admin |
| Văn phòng | VP Hồ Chí Minh |
| Trạng thái | Active |
| Yêu cầu đổi MK | Không |

### NV-2 — Kế toán SG
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-SG-002` |
| Tên | `Nguyễn Thị Thu Hà` |
| Username | `ketoan` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Accountant |
| Văn phòng | VP Hồ Chí Minh |
| Trạng thái | Active |
| Yêu cầu đổi MK | Không |

### NV-3 — Staff SG
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-SG-003` |
| Tên | `Lê Văn Hùng` |
| Username | `staff_sg` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Staff |
| Văn phòng | VP Hồ Chí Minh |
| Trạng thái | Active |
| Yêu cầu đổi MK | Không |

### NV-4 — Staff CT
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-CT-001` |
| Tên | `Phạm Thanh Tùng` |
| Username | `staff_ct` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Staff |
| Văn phòng | VP Cần Thơ |
| Trạng thái | Active |
| Yêu cầu đổi MK | Không |

### NV-5 — Kế toán CT
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-CT-002` |
| Tên | `Võ Thị Ngọc Hân` |
| Username | `ketoan_ct` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Accountant |
| Văn phòng | VP Cần Thơ |
| Trạng thái | Active |
| Yêu cầu đổi MK | Không |

### NV-6 — Staff RG
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-RG-001` |
| Tên | `Đặng Hoàng Phúc` |
| Username | `staff_rg` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Staff |
| Văn phòng | VP Rạch Giá |
| Trạng thái | Active |
| Yêu cầu đổi MK | Không |

### NV-7 — NV Inactive (test toggle)
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-RG-002` |
| Tên | `Huỳnh Văn Tài` |
| Username | `staff_rg_old` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Staff |
| Văn phòng | VP Rạch Giá |
| Trạng thái | **Inactive** |
| Yêu cầu đổi MK | Không |

> 🧪 **Test:** Admin vào quản lý NV → Bật lại tài khoản này → Tắt lại

### NV-8 — NV cần đổi mật khẩu lần đầu
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-SG-004` |
| Tên | `Bùi Quốc Toàn` |
| Username | `nv_new` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Staff |
| Văn phòng | VP Hồ Chí Minh |
| Trạng thái | Active |
| Yêu cầu đổi MK | **Có** |

> 🧪 **Test:** Đăng nhập bằng `nv_new` → Hệ thống bắt đổi mật khẩu ngay

### NV-9 — NV bị khóa (test reset password)
| Trường | Giá trị |
|---|---|
| Mã NV | `NV-CT-003` |
| Tên | `Trương Văn Khải` |
| Username | `nv_locked` |
| Mật khẩu | `Tmq@1234` |
| Vai trò | Staff |
| Văn phòng | VP Cần Thơ |
| Trạng thái | Active |
| Yêu cầu đổi MK | Có |

> 🧪 **Test:** Admin → Quản lý NV → Reset mật khẩu → Xem mật khẩu ngẫu nhiên mới

---

## 3. KHÁCH HÀNG (18 bản ghi)

### KH-001 — Doanh nghiệp (đầy đủ thông tin)
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-001` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty TNHH Tâm An Logistics` |
| Người liên hệ | `Nguyễn Văn Tâm` |
| Số điện thoại | `0901234567` |
| Email | `tamanlogistics@gmail.com` |
| Địa chỉ | `123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM` |
| Mã số thuế | `0312345678` |
| Số CCCD | `079201012345` |
| Ghi chú | `Gửi hàng đều đặn cuối tháng, ưu tiên giao tận nơi` |
| Trạng thái | Active |

### KH-002 — Doanh nghiệp (có MST)
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-002` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty CP Hoàng Long Phát` |
| Người liên hệ | `Trần Hoàng Long` |
| Số điện thoại | `0912345678` |
| Email | `hoanglong.phat@company.vn` |
| Địa chỉ | `456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM` |
| Mã số thuế | `0301234567` |
| Số CCCD | _(để trống)_ |
| Ghi chú | `Hàng điện tử, cần đóng gói cẩn thận` |
| Trạng thái | Active |

### KH-003 — DNTN (không có MST)
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-003` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `DNTN Minh Phát` |
| Người liên hệ | `Lê Minh Phát` |
| Số điện thoại | `0923456789` |
| Email | `minhphat.dn@gmail.com` |
| Địa chỉ | `78 Trần Phú, P.4, Q.5, TP.HCM` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `079080011222` |
| Ghi chú | `Thường gửi hàng thực phẩm khô` |
| Trạng thái | Active |

### KH-004 — Doanh nghiệp
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-004` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty TNHH Phú Quốc Express` |
| Người liên hệ | `Phạm Quốc Việt` |
| Số điện thoại | `0934567890` |
| Email | `phuquocexpress@outlook.com` |
| Địa chỉ | `12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang` |
| Mã số thuế | `0100234567` |
| Số CCCD | _(để trống)_ |
| Ghi chú | `Hàng hải sản đông lạnh, yêu cầu giao nhanh` |
| Trạng thái | Active |

### KH-005 — Cửa hàng
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-005` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cửa Hàng Thanh Bình` |
| Người liên hệ | `Võ Thanh Bình` |
| Số điện thoại | `0945678901` |
| Email | `thanhbinh.shop@gmail.com` |
| Địa chỉ | `234 Đề Thám, P.Cô Giang, Q.1, TP.HCM` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `079090033444` |
| Ghi chú | _(để trống)_ |
| Trạng thái | Active |

### KH-006 — Doanh nghiệp lớn
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-006` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty TNHH Đại Phong Trading` |
| Người liên hệ | `Đặng Đại Phong` |
| Số điện thoại | `0956789012` |
| Email | `daiphong.trading@company.vn` |
| Địa chỉ | `89 Lý Thường Kiệt, P.7, Q.10, TP.HCM` |
| Mã số thuế | `0398765432` |
| Số CCCD | _(để trống)_ |
| Ghi chú | `Thanh toán chuyển khoản, xuất HĐĐT` |
| Trạng thái | Active |

### KH-007 — Vận tải
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-007` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `DNTN Hòa Phát Vận Tải` |
| Người liên hệ | `Trương Hòa Phát` |
| Số điện thoại | `0967890123` |
| Email | `hoaphat.vt@gmail.com` |
| Địa chỉ | `56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `092070055666` |
| Ghi chú | `Đối tác vận tải khu vực ĐBSCL` |
| Trạng thái | Active |

### KH-008 — Công ty CP
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-008` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty CP Sao Việt` |
| Người liên hệ | `Lý Sao Việt` |
| Số điện thoại | `0978901234` |
| Email | `saoviet.corp@saoviet.com.vn` |
| Địa chỉ | `10 Võ Văn Kiệt, P.An Hòa, Q.Ninh Kiều, TP Cần Thơ` |
| Mã số thuế | `0309876543` |
| Số CCCD | _(để trống)_ |
| Ghi chú | `Gửi hàng nông sản định kỳ hàng tuần` |
| Trạng thái | Active |

### KH-009 — Nông sản
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-009` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `HTX Nông Sản Sạch Cần Thơ` |
| Người liên hệ | `Huỳnh Thanh Nông` |
| Số điện thoại | `0989012345` |
| Email | `htxnongsancantho@gmail.com` |
| Địa chỉ | `Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | _(để trống)_ |
| Ghi chú | `Hàng trái cây tươi, cần giao trong ngày` |
| Trạng thái | Active |

### KH-010 — Doanh nghiệp (có công nợ)
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-010` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty TNHH Thiên Phú` |
| Người liên hệ | `Ngô Thiên Phú` |
| Số điện thoại | `0990123456` |
| Email | `thienphuco@thienphuco.com` |
| Địa chỉ | `321 Nguyễn Trung Trực, TP Rạch Giá, Kiên Giang` |
| Mã số thuế | `0316789012` |
| Số CCCD | `086198001234` |
| Ghi chú | `Khách hàng VIP, thường xuyên nợ cước cuối tháng` |
| Trạng thái | Active |

### KH-011 — Cá nhân (đầy đủ)
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-011` |
| Loại KH | Cá nhân |
| Tên đơn vị | `Nguyễn Anh Tuấn` |
| Số điện thoại | `0371234567` |
| Email | `anhtuannguyen@gmail.com` |
| Địa chỉ | `15/3 Nguyễn Kiệm, P.3, Q.Phú Nhuận, TP.HCM` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `079095077888` |
| Ghi chú | `Hay gửi quà tặng về quê Cần Thơ` |
| Trạng thái | Active |

### KH-012 — Cá nhân
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-012` |
| Loại KH | Cá nhân |
| Tên đơn vị | `Trần Thị Mai` |
| Số điện thoại | `0382345678` |
| Email | `maitran.ct@gmail.com` |
| Địa chỉ | `88 Mậu Thân, P.An Hòa, Q.Ninh Kiều, TP Cần Thơ` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `092190099000` |
| Ghi chú | _(để trống)_ |
| Trạng thái | Active |

### KH-013 — Cá nhân
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-013` |
| Loại KH | Cá nhân |
| Tên đơn vị | `Lê Đăng Khoa` |
| Số điện thoại | `0393456789` |
| Email | _(để trống)_ |
| Địa chỉ | `Khu phố 3, P.Vĩnh Thanh Vân, TP Rạch Giá, Kiên Giang` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | _(để trống)_ |
| Ghi chú | `Gửi hàng về quê theo mùa` |
| Trạng thái | Active |

### KH-014 — Cá nhân
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-014` |
| Loại KH | Cá nhân |
| Tên đơn vị | `Phạm Thùy Linh` |
| Số điện thoại | `0364567890` |
| Email | `thuylinhpham@yahoo.com` |
| Địa chỉ | `23 Trần Hưng Đạo, P.An Thới, Q.Bình Thủy, TP Cần Thơ` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `092185011333` |
| Ghi chú | _(để trống)_ |
| Trạng thái | Active |

### KH-015 — DN Inactive (test toggle)
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-015` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty TNHH ABC Thương Mại` |
| Người liên hệ | `Nguyễn Văn A` |
| Số điện thoại | `0901111222` |
| Email | `abc.thuongmai@gmail.com` |
| Địa chỉ | `99 Hai Bà Trưng, Q.1, TP.HCM` |
| Mã số thuế | `0300111222` |
| Số CCCD | _(để trống)_ |
| Ghi chú | `Ngưng hợp tác từ tháng 01/2026` |
| Trạng thái | **Inactive** |

> 🧪 **Test:** Admin → Danh sách KH → Bật lại KH này → Kiểm tra xuất hiện trong autocomplete BN

### KH-016 — Cá nhân Inactive
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-016` |
| Loại KH | Cá nhân |
| Tên đơn vị | `Võ Minh Tuấn` |
| Số điện thoại | `0333444555` |
| Email | _(để trống)_ |
| Địa chỉ | `Ấp 2, Xã Thạnh Lộc, H.Giồng Riềng, Kiên Giang` |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `086088022444` |
| Ghi chú | `Không còn liên lạc được` |
| Trạng thái | **Inactive** |

### KH-017 — DN đầy đủ mọi field
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-017` |
| Loại KH | Doanh nghiệp |
| Tên đơn vị | `Cty TNHH XNK Đồng Bằng Xanh` |
| Người liên hệ | `Bà Nguyễn Thị Thanh Thảo` |
| Số điện thoại | `0907777888` |
| Email | `dongbangxanh.xnk@dongbangxanh.com.vn` |
| Địa chỉ | `Lô B5, KCN Trà Nóc, P.Trà Nóc, Q.Bình Thủy, TP Cần Thơ` |
| Mã số thuế | `1800123456` |
| Số CCCD | `092080088123` |
| Ghi chú | `Khách hàng chiến lược, xuất hóa đơn VAT hàng tháng, thanh toán CK ngày 25` |
| Trạng thái | Active |

### KH-018 — Cá nhân tự tạo từ BN
| Trường | Giá trị |
|---|---|
| Mã KH | `KH-018` |
| Loại KH | Cá nhân |
| Tên đơn vị | `Ngô Thanh Hải` |
| Số điện thoại | `0358999000` |
| Email | _(để trống)_ |
| Địa chỉ | _(để trống)_ |
| Mã số thuế | _(để trống)_ |
| Số CCCD | `079096055789` |
| Ghi chú | `Tự động tạo từ biên nhận SGCT-0055 ngày 04/05/2026` |
| Trạng thái | Active |

> 🧪 **Test scenario:** Tạo BN mới với người gửi SĐT `0358999000` chưa có trong hệ thống → Hệ thống tự tạo KH-018 → Xuất hiện toast thông báo

---

## 4. CHÀNH (4 bản ghi)

### CH-1 — Chành nội thành (VP Hồ Chí Minh)
| Trường | Giá trị |
|---|---|
| Tên | `Chành Ba Gác Q7 - Nhà Bè` |
| Địa chỉ | `Khu dân cư Him Lam, Phường Tân Hưng, Quận 7, TP.HCM` |
| Điện thoại | `0903111222` |
| Người liên hệ | `Chú Tư (tài xế ba gác)` |
| Ghi chú | `Chuyên nhận chở hàng cồng kềnh từ VP SG đi giao tận nơi các quận ven (Q7, Nhà Bè, Bình Chánh)` |
| Trạng thái | Active |

### CH-2 — Chành nội tỉnh (VP Cần Thơ)
| Trường | Giá trị |
|---|---|
| Tên | `Chành Tàu Thủy Cần Thơ - Phong Điền` |
| Địa chỉ | `Bến phà Cần Thơ cũ, Phường Tân An, Q.Ninh Kiều, TP Cần Thơ` |
| Điện thoại | `0912333444` |
| Người liên hệ | `Anh Sáu (chủ tàu)` |
| Ghi chú | `Chở hàng nông sản dọc tuyến sông đi các huyện Phong Điền, Thới Lai (giao tuyến huyện)` |
| Trạng thái | Active |

### CH-3 — Chành biển đảo (VP Rạch Giá)
| Trường | Giá trị |
|---|---|
| Tên | `Chành Tàu Cao Tốc Superdong` |
| Địa chỉ | `Bến tàu Rạch Giá, Đường Nguyễn Công Trứ, TP Rạch Giá` |
| Điện thoại | `02973980111` |
| Người liên hệ | `Phòng nhận hàng` |
| Ghi chú | `Nhận hàng chuyển ra đảo Phú Quốc, Hòn Tre. Chuyến sớm nhất 7h sáng` |
| Trạng thái | Active |

### CH-4 — Chành đã ngưng (test inactive)
| Trường | Giá trị |
|---|---|
| Tên | `Chành Xe Khách Rạch Giá - Hà Tiên (cũ)` |
| Địa chỉ | `Bến xe Rạch Sỏi, TP Rạch Giá` |
| Điện thoại | `0901119999` |
| Người liên hệ | `Ông Năm` |
| Ghi chú | `Đã ngưng hoạt động từ 03/2026 do đổi chủ` |
| Trạng thái | **Inactive** |

> 🧪 **Test:** Admin → Quản lý Chành → Sửa CH-4 → Bật lại

---

## 5. BIÊN NHẬN

> Mỗi BN có đầy đủ tất cả trường. Thứ tự tạo theo bảng dưới để phủ coverage.

### Tổng quan coverage biên nhận

| Nhóm | BN | Mục đích |
|---|---|---|
| Trạng thái vận chuyển | BN-01 → BN-05 | Mỗi BN = 1 trạng thái VC |
| Trạng thái thu | BN-06, BN-07 | Chưa thu / Công nợ |
| COD (4 bước) | BN-08 → BN-11 | Mỗi BN = 1 bước COD |
| HĐĐT chờ xuất | BN-12 → BN-15 | can_xuat_hddt=true, chờ trong tab BN chờ |
| HĐĐT đã vào BK | BN-16, BN-17 | can_xuat_hddt=true, da_vao_bang_ke=true |
| Edge cases | BN-18 → BN-20 | hang_hu, tối thiểu, đầy đủ mọi field |
| Dữ liệu tháng hiện tại | BN-21 → BN-30 | Trải 10 ngày cho biểu đồ |
| Dữ liệu tháng trước | BN-31 → BN-38 | Tháng 3/2026 cho báo cáo |


---

### BN-01 — Trạng thái: **Chờ VC** | Thu: Đã thu | Không COD

| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0001` |
| VP gửi | VP Hồ Chí Minh (SG) |
| VP nhận | VP Cần Thơ (CT) |
| NV nhập | `staff_sg` — Lê Văn Hùng |
| Ngày biên nhận | 04/05/2026 |
| Giờ tạo | `09:15` |
| **Người gửi** |  |
| Đơn vị gửi | Cty TNHH Tâm An Logistics |
| Người gửi | Nguyễn Văn Tâm |
| SĐT gửi | `0901234567` |
| Địa chỉ gửi | 123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM |
| CCCD gửi | `079201012345` |
| **Người nhận** |  |
| Đơn vị nhận | HTX Nông Sản Sạch Cần Thơ |
| Người nhận | Huỳnh Thanh Nông |
| SĐT nhận | `0989012345` |
| Địa chỉ nhận | Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| **Hàng hóa** |  |
| Tên hàng hóa | 2 Kiện |
| Hàng hóa JSON | `[{"don_vi":"Kiện","so_luong":2,"ghi_chu":"Hàng giá trị cao, dễ vỡ"}]` |
| Giá trị hàng | `5,000,000` đ |
| Trọng lượng | `12.50` kg |
| **Tài chính** |  |
| Thu hộ | `0` |
| Giá cước | `150,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | Chành Tàu Thủy Cần Thơ - Phong Điền |
| Địa chỉ giao | Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | ✅ **Chờ VC** |
| Trạng thái COD | Không có |

> 🧪 **Test:** Xem BN vừa tạo ở trạng thái "Chờ VC". Thử cập nhật lên "Đang VC".

---

### BN-02 — Trạng thái: **Đang VC** | Thu: Đã thu | Không COD

| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0002` |
| VP gửi | VP Hồ Chí Minh (SG) |
| VP nhận | VP Cần Thơ (CT) |
| NV nhập | `admin` — Trần Minh Quang |
| Ngày biên nhận | 03/05/2026 |
| Giờ tạo | `08:30` |
| Đơn vị gửi | Cty CP Hoàng Long Phát |
| Người gửi | Trần Hoàng Long |
| SĐT gửi | `0912345678` |
| Địa chỉ gửi | 456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty CP Sao Việt |
| Người nhận | Lý Sao Việt |
| SĐT nhận | `0978901234` |
| Địa chỉ nhận | 10 Võ Văn Kiệt, P.An Hòa, Q.Ninh Kiều, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 5 Cuộn, 3 Túi |
| Hàng hóa JSON | `[{"don_vi":"Cuộn","so_luong":5,"ghi_chu":""},{"don_vi":"Túi","so_luong":3,"ghi_chu":""}]` |
| Giá trị hàng | `12,000,000` đ |
| Trọng lượng | `35.00` kg |
| Thu hộ | `0` |
| Giá cước | `250,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Gọi điện |
| Chành | _(để trống)_ |
| Địa chỉ giao | _(để trống)_ |
| Cần xuất HĐĐT | **Có** |
| Hàng hư không đến | Không |
| **Trạng thái VC** | ✅ **Đang VC** |
| Trạng thái COD | Không có |

> 🧪 **Test:** BN có `can_xuat_hddt = true` → Xuất hiện trong tab "BN chờ" của HĐĐT. Cập nhật lên "Đã đến kho".

---

### BN-03 — Trạng thái: **Đã đến kho** | Thu: Đã thu | Không COD

| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0003` |
| VP gửi | VP Hồ Chí Minh (SG) |
| VP nhận | VP Cần Thơ (CT) |
| NV nhập | `staff_sg` — Lê Văn Hùng |
| Ngày biên nhận | 01/05/2026 |
| Giờ tạo | `14:00` |
| Đơn vị gửi | DNTN Minh Phát |
| Người gửi | Lê Minh Phát |
| SĐT gửi | `0923456789` |
| Địa chỉ gửi | 78 Trần Phú, P.4, Q.5, TP.HCM |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | DNTN Hòa Phát Vận Tải |
| Người nhận | Trương Hòa Phát |
| SĐT nhận | `0967890123` |
| Địa chỉ nhận | 56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 10 Thùng |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":10,"ghi_chu":"Tránh ẩm ướt"}]` |
| Giá trị hàng | `8,000,000` đ |
| Trọng lượng | `28.00` kg |
| Thu hộ | `0` |
| Giá cước | `200,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tự tới |
| Chành | _(để trống)_ |
| Địa chỉ giao | _(để trống)_ |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | ✅ **Đã đến kho** |
| Trạng thái COD | Không có |

> 🧪 **Test:** Cập nhật lên "Đã báo khách". `staff_ct` đăng nhập → thấy BN này (VP nhận = CT).

---

### BN-04 — Trạng thái: **Đã báo khách** | Thu: Chưa thu | Không COD

| Trường | Giá trị |
|---|---|
| Mã số | `CTRG-0001` |
| VP gửi | VP Cần Thơ (CT) |
| VP nhận | VP Rạch Giá (RG) |
| NV nhập | `staff_ct` — Phạm Thanh Tùng |
| Ngày biên nhận | 29/04/2026 |
| Giờ tạo | `10:45` |
| Đơn vị gửi | Cty TNHH XNK Đồng Bằng Xanh |
| Người gửi | Nguyễn Thị Thanh Thảo |
| SĐT gửi | `0907777888` |
| Địa chỉ gửi | Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ |
| CCCD gửi | `086198001234` |
| Đơn vị nhận | Cty TNHH Phú Quốc Express |
| Người nhận | Phạm Quốc Việt |
| SĐT nhận | `0934567890` |
| Địa chỉ nhận | 12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 35 Thùng xốp |
| Hàng hóa JSON | `[{"don_vi":"Thùng xốp","so_luong":20,"ghi_chu":"Hàng dễ dập nát"},{"don_vi":"Thùng xốp","so_luong":15,"ghi_chu":"Hàng nặng"}]` |
| Giá trị hàng | `15,000,000` đ |
| Trọng lượng | `70.00` kg |
| Thu hộ | `0` |
| Giá cước | `350,000` đ |
| TT thanh toán | **Chưa thu** |
| Hình thức giao | Tận nơi |
| Chành | Chành Tàu Cao Tốc Superdong |
| Địa chỉ giao | 12 Hùng Vương, Dương Đông, Phú Quốc |
| Cần xuất HĐĐT | Có |
| Hàng hư không đến | Không |
| **Trạng thái VC** | ✅ **Đã báo khách** |
| Trạng thái COD | Không có |

> 🧪 **Test:** TT Thu = "Chưa thu" → KHÔNG tạo công nợ. `staff_ct` thấy BN (VP gửi = CT). Cập nhật lên "Khách đã nhận".

---

### BN-05 — Trạng thái: **Khách đã nhận** | Thu: Đã thu | Không COD

| Trường | Giá trị |
|---|---|
| Mã số | `RGSG-0001` |
| VP gửi | VP Rạch Giá (RG) |
| VP nhận | VP Hồ Chí Minh (SG) |
| NV nhập | `staff_rg` — Đặng Hoàng Phúc |
| Ngày biên nhận | 25/04/2026 |
| Giờ tạo | `07:30` |
| Đơn vị gửi | Cty TNHH Phú Quốc Express |
| Người gửi | Phạm Quốc Việt |
| SĐT gửi | `0934567890` |
| Địa chỉ gửi | 12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty TNHH Tâm An Logistics |
| Người nhận | Nguyễn Văn Tâm |
| SĐT nhận | `0901234567` |
| Địa chỉ nhận | 123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM |
| CCCD nhận | `079201012345` |
| Tên hàng hóa | 20 Thùng xốp |
| Hàng hóa JSON | `[{"don_vi":"Thùng xốp","so_luong":8,"ghi_chu":"Hàng cấp đông, giao ngay"},{"don_vi":"Thùng xốp","so_luong":12,"ghi_chu":"Hàng đông lạnh"}]` |
| Giá trị hàng | `25,000,000` đ |
| Trọng lượng | `45.00` kg |
| Thu hộ | `0` |
| Giá cước | `500,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | Chành Ba Gác Q7 - Nhà Bè |
| Địa chỉ giao | 123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | ✅ **Khách đã nhận** |
| Trạng thái COD | Không có |

> 🧪 **Test:** BN hoàn thành. In PDF + QR. Quét QR → `/scan/RGSG-0001` → Kiểm tra ẩn giá cước, ẩn TT thanh toán.

---

### BN-06 — TT Thu: **Công nợ** → Tự tạo bản ghi Công nợ

| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0004` |
| VP gửi | VP Hồ Chí Minh (SG) |
| VP nhận | VP Cần Thơ (CT) |
| NV nhập | `staff_sg` — Lê Văn Hùng |
| Ngày biên nhận | 04/05/2026 |
| Giờ tạo | `11:00` |
| Đơn vị gửi | Cty TNHH Đại Phong Trading |
| Người gửi | Đặng Đại Phong |
| SĐT gửi | `0956789012` |
| Địa chỉ gửi | 89 Lý Thường Kiệt, P.7, Q.10, TP.HCM |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty TNHH Thiên Phú |
| Người nhận | Ngô Thiên Phú |
| SĐT nhận | `0990123456` |
| Địa chỉ nhận | 321 Nguyễn Trung Trực, TP Rạch Giá |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 4 Thùng, 20 Hộp |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":4,"ghi_chu":""},{"don_vi":"Hộp","so_luong":20,"ghi_chu":"Chất lỏng, cẩn thận"}]` |
| Giá trị hàng | `18,000,000` đ |
| Trọng lượng | `55.00` kg |
| Thu hộ | `0` |
| Giá cước | `400,000` đ |
| TT thanh toán | **Công nợ** |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | 321 Nguyễn Trung Trực, TP Rạch Giá |
| Cần xuất HĐĐT | Có |
| Hàng hư không đến | Không |
| **Trạng thái VC** | Đang VC |
| Trạng thái COD | Không có |

> 🧪 **Test:** Tạo BN với TT Thu = "Công nợ" → Hệ thống tự tạo công nợ `400,000 đ` cho "Cty TNHH Đại Phong Trading" → Vào module Công nợ kiểm tra.

---

### BN-07 — TT Thu: **Công nợ** — Quá hạn > 30 ngày

| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0005` |
| VP gửi | VP Hồ Chí Minh (SG) |
| VP nhận | VP Cần Thơ (CT) |
| NV nhập | `admin` — Trần Minh Quang |
| Ngày biên nhận | **28/03/2026** _(35 ngày trước → sẽ hiện badge Quá hạn)_ |
| Giờ tạo | `09:00` |
| Đơn vị gửi | Cty TNHH Thiên Phú |
| Người gửi | Ngô Thiên Phú |
| SĐT gửi | `0990123456` |
| Địa chỉ gửi | 321 Nguyễn Trung Trực, TP Rạch Giá |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty CP Hoàng Long Phát |
| Người nhận | Trần Hoàng Long |
| SĐT nhận | `0912345678` |
| Địa chỉ nhận | 456 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 30 Thùng |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":30,"ghi_chu":"Hàng chất lỏng dễ vỡ"}]` |
| Giá trị hàng | `9,000,000` đ |
| Trọng lượng | `42.00` kg |
| Thu hộ | `0` |
| Giá cước | `300,000` đ |
| TT thanh toán | **Công nợ** |
| Hình thức giao | Gọi điện |
| Chành | _(để trống)_ |
| Địa chỉ giao | _(để trống)_ |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | Khách đã nhận |
| Trạng thái COD | Không có |

> 🧪 **Test Công nợ:** Module Công nợ → BN-07 hiển thị badge **"Quá hạn"** (>30 ngày). Xác nhận thu → PT-0003 tự tạo → Công nợ chuyển "Đã thu". Hủy PT-0003 → Công nợ revert "Chưa thu".

---

### BN-08 — COD Bước 1: **Chờ thu** (`cho_thu`)

| Trường | Giá trị |
|---|---|
| Mã số | `CTSG-0001` |
| VP gửi | VP Cần Thơ (CT) |
| VP nhận | VP Hồ Chí Minh (SG) |
| NV nhập | `staff_ct` — Phạm Thanh Tùng |
| Ngày biên nhận | 04/05/2026 |
| Giờ tạo | `08:00` |
| Đơn vị gửi | Cty CP Sao Việt |
| Người gửi | Lý Sao Việt |
| SĐT gửi | `0978901234` |
| Địa chỉ gửi | 10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty TNHH Tâm An Logistics |
| Người nhận | Nguyễn Văn Tâm |
| SĐT nhận | `0901234567` |
| Địa chỉ nhận | 123 Nguyễn Văn Linh, Q.7, TP.HCM |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 25 Thùng xốp |
| Hàng hóa JSON | `[{"don_vi":"Thùng xốp","so_luong":15,"ghi_chu":"Giao trong ngày"},{"don_vi":"Thùng xốp","so_luong":10,"ghi_chu":"Tránh nóng"}]` |
| Giá trị hàng | `7,500,000` đ |
| Trọng lượng | `60.00` kg |
| **Thu hộ** | **`2,500,000` đ** |
| Giá cước | `300,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | 123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | Chờ VC |
| **Trạng thái COD** | ✅ **Chờ thu** |

> 🧪 **Test COD Bước 1:** Module COD → Thẻ "Chờ thu" → Thấy BN này. Nhấn "Xác nhận thu" → chuyển sang Bước 2.

---

### BN-09 — COD Bước 2: **Đã thu** (`da_thu`) — có Phiếu thu tại VP nhận (SG)

| Trường | Giá trị |
|---|---|
| Mã số | `CTSG-0002` |
| VP gửi | VP Cần Thơ (CT) |
| VP nhận | VP Hồ Chí Minh (SG) |
| NV nhập | `staff_ct` — Phạm Thanh Tùng |
| Ngày biên nhận | 02/05/2026 |
| Giờ tạo | `09:30` |
| Đơn vị gửi | HTX Nông Sản Sạch Cần Thơ |
| Người gửi | Huỳnh Thanh Nông |
| SĐT gửi | `0989012345` |
| Địa chỉ gửi | Ấp Nhơn Lộc, Xã Nhơn Nghĩa, TP Cần Thơ |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cửa Hàng Thanh Bình |
| Người nhận | Võ Thanh Bình |
| SĐT nhận | `0945678901` |
| Địa chỉ nhận | 234 Đề Thám, P.Cô Giang, Q.1, TP.HCM |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 50 Thùng |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":50,"ghi_chu":""}]` |
| Giá trị hàng | `6,000,000` đ |
| Trọng lượng | `25.00` kg |
| **Thu hộ** | **`3,000,000` đ** |
| Giá cước | `200,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | 234 Đề Thám, P.Cô Giang, Q.1, TP.HCM |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | Khách đã nhận |
| **Trạng thái COD** | ✅ **Đã thu** — đã có PT-0004 `3,000,000 đ` tại VP SG |

> 🧪 **Test COD Bước 2:** Thẻ "Đã thu" → Có BN này. Nhấn "Xác nhận chuyển" → PC tại SG + PT tại CT tự tạo.

---

### BN-10 — COD Bước 3: **Đã chuyển** (`da_chuyen`)

| Trường | Giá trị |
|---|---|
| Mã số | `RGSG-0002` |
| VP gửi | VP Rạch Giá (RG) |
| VP nhận | VP Hồ Chí Minh (SG) |
| NV nhập | `staff_rg` — Đặng Hoàng Phúc |
| Ngày biên nhận | 28/04/2026 |
| Giờ tạo | `07:00` |
| Đơn vị gửi | Cty TNHH Thiên Phú |
| Người gửi | Ngô Thiên Phú |
| SĐT gửi | `0990123456` |
| Địa chỉ gửi | 321 Nguyễn Trung Trực, TP Rạch Giá, Kiên Giang |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty TNHH Tâm An Logistics |
| Người nhận | Nguyễn Văn Tâm |
| SĐT nhận | `0901234567` |
| Địa chỉ nhận | 123 Nguyễn Văn Linh, Q.7, TP.HCM |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 20 Thùng |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":20,"ghi_chu":"Hàng chất lỏng dễ vỡ"}]` |
| Giá trị hàng | `4,000,000` đ |
| Trọng lượng | `30.00` kg |
| **Thu hộ** | **`1,500,000` đ** |
| Giá cước | `250,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | Chành Ba Gác Q7 - Nhà Bè |
| Địa chỉ giao | 123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | Khách đã nhận |
| **Trạng thái COD** | ✅ **Đã chuyển** — PT-0005 tại RG + PC-0005 tại SG đã tạo |

> 🧪 **Test COD Bước 3:** Nhấn "Xác nhận trả" → PC-0006 `1,500,000 đ` tại VP RG tự tạo.

---

### BN-11 — COD Bước 4: **Đã trả** (`da_tra`) — Hoàn tất

| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0006` |
| VP gửi | VP Hồ Chí Minh (SG) |
| VP nhận | VP Cần Thơ (CT) |
| NV nhập | `admin` — Trần Minh Quang |
| Ngày biên nhận | 20/04/2026 |
| Giờ tạo | `08:15` |
| Đơn vị gửi | DNTN Minh Phát |
| Người gửi | Lê Minh Phát |
| SĐT gửi | `0923456789` |
| Địa chỉ gửi | 78 Trần Phú, P.4, Q.5, TP.HCM |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Nguyễn Anh Tuấn |
| Người nhận | Nguyễn Anh Tuấn |
| SĐT nhận | `0371234567` |
| Địa chỉ nhận | 15/3 Nguyễn Kiệm, P.3, Q.Phú Nhuận, TP.HCM |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 5 Thùng |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":3,"ghi_chu":"Hàng điện tử"},{"don_vi":"Thùng","so_luong":2,"ghi_chu":"Hàng dễ vỡ"}]` |
| Giá trị hàng | `3,500,000` đ |
| Trọng lượng | `18.00` kg |
| **Thu hộ** | **`4,200,000` đ** |
| Giá cước | `180,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Gọi điện |
| Chành | _(để trống)_ |
| Địa chỉ giao | _(để trống)_ |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| **Trạng thái VC** | Khách đã nhận |
| **Trạng thái COD** | ✅ **Đã trả (Hoàn tất)** — Đủ 4 phiếu tự động đã tạo |

> 🧪 **Test COD Bước 4:** BN này trong thẻ "Hoàn tất". Kiểm tra hệ thống **từ chối xóa** BN có COD đang xử lý.

---

### BN-12 đến BN-15 — HĐĐT: **Chờ xuất bảng kê** (`can_xuat_hddt=true`, `da_vao_bang_ke=false`)

> Tạo 4 BN với "Cần xuất HĐĐT = Có". Các BN này xuất hiện trong tab **"BN chờ"** của module HĐĐT.

#### BN-12
| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0007` |
| VP gửi / VP nhận | SG → CT |
| NV nhập | `staff_sg` |
| Ngày biên nhận | 04/05/2026 |
| Giờ tạo | `11:30` |
| Đơn vị gửi | Cty TNHH Đại Phong Trading |
| Người gửi | Đặng Đại Phong |
| SĐT gửi | `0956789012` |
| Địa chỉ gửi | 89 Lý Thường Kiệt, P.7, Q.10, TP.HCM |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty CP Sao Việt |
| Người nhận | Lý Sao Việt |
| SĐT nhận | `0978901234` |
| Địa chỉ nhận | 10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 5 Kiện |
| Hàng hóa JSON | `[{"don_vi":"Kiện","so_luong":5,"ghi_chu":"Hàng nặng"}]` |
| Giá trị hàng | `10,000,000` đ |
| Trọng lượng | `22.50` kg |
| Thu hộ | `0` |
| Giá cước | `350,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | 10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ |
| **Cần xuất HĐĐT** | **Có** |
| Hàng hư không đến | Không |
| Trạng thái VC | Khách đã nhận |

#### BN-13
| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0008` |
| VP gửi / VP nhận | SG → CT |
| NV nhập | `admin` |
| Ngày biên nhận | 03/05/2026 |
| Giờ tạo | `10:00` |
| Đơn vị gửi | Cty TNHH XNK Đồng Bằng Xanh |
| Người gửi | Nguyễn Thị Thanh Thảo |
| SĐT gửi | `0907777888` |
| Địa chỉ gửi | Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | DNTN Hòa Phát Vận Tải |
| Người nhận | Trương Hòa Phát |
| SĐT nhận | `0967890123` |
| Địa chỉ nhận | 56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 3 Cuộn |
| Hàng hóa JSON | `[{"don_vi":"Cuộn","so_luong":3,"ghi_chu":"Hàng nặng"}]` |
| Giá trị hàng | `4,500,000` đ |
| Trọng lượng | `40.00` kg |
| Thu hộ | `0` |
| Giá cước | `200,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tự tới |
| Chành | _(để trống)_ |
| Địa chỉ giao | _(để trống)_ |
| **Cần xuất HĐĐT** | **Có** |
| Hàng hư không đến | Không |
| Trạng thái VC | Đã đến kho |

#### BN-14
| Trường | Giá trị |
|---|---|
| Mã số | `SGRG-0001` |
| VP gửi / VP nhận | SG → RG |
| NV nhập | `staff_sg` |
| Ngày biên nhận | 02/05/2026 |
| Giờ tạo | `09:00` |
| Đơn vị gửi | Cty TNHH Tâm An Logistics |
| Người gửi | Nguyễn Văn Tâm |
| SĐT gửi | `0901234567` |
| Địa chỉ gửi | 123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM |
| CCCD gửi | `079201012345` |
| Đơn vị nhận | Cty TNHH Phú Quốc Express |
| Người nhận | Phạm Quốc Việt |
| SĐT nhận | `0934567890` |
| Địa chỉ nhận | 12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 15 Thùng |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":10,"ghi_chu":"Thiết bị điện tử"},{"don_vi":"Thùng","so_luong":5,"ghi_chu":"Hàng giá trị cao"}]` |
| Giá trị hàng | `20,000,000` đ |
| Trọng lượng | `15.00` kg |
| Thu hộ | `0` |
| Giá cước | `500,000` đ |
| TT thanh toán | **Công nợ** |
| Hình thức giao | Gọi điện |
| Chành | Chành Tàu Cao Tốc Superdong |
| Địa chỉ giao | 12 Hùng Vương, Dương Đông, Phú Quốc |
| **Cần xuất HĐĐT** | **Có** |
| Hàng hư không đến | Không |
| Trạng thái VC | Đang VC |

#### BN-15
| Trường | Giá trị |
|---|---|
| Mã số | `CTRG-0002` |
| VP gửi / VP nhận | CT → RG |
| NV nhập | `staff_ct` |
| Ngày biên nhận | 01/05/2026 |
| Giờ tạo | `14:30` |
| Đơn vị gửi | Cty CP Hoàng Long Phát |
| Người gửi | Trần Hoàng Long |
| SĐT gửi | `0912345678` |
| Địa chỉ gửi | 456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty TNHH Thiên Phú |
| Người nhận | Ngô Thiên Phú |
| SĐT nhận | `0990123456` |
| Địa chỉ nhận | 321 Nguyễn Trung Trực, TP Rạch Giá |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 2 Kiện |
| Hàng hóa JSON | `[{"don_vi":"Kiện","so_luong":2,"ghi_chu":"Hàng giá trị cao, dễ vỡ"}]` |
| Giá trị hàng | `28,000,000` đ |
| Trọng lượng | `6.00` kg |
| Thu hộ | `0` |
| Giá cước | `300,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | 321 Nguyễn Trung Trực, TP Rạch Giá |
| **Cần xuất HĐĐT** | **Có** |
| Hàng hư không đến | Không |
| Trạng thái VC | Đã báo khách |

> 🧪 **Test HĐĐT:** Admin → Module HĐĐT → Tab "BN chờ" → Chọn BN-12 đến BN-15 → Xuất bảng kê → Tải Excel.

---

### BN-16 và BN-17 — HĐĐT: **Đã vào bảng kê BK-0001**

> Tạo 2 BN này trước, sau đó xuất bảng kê BK-0001 để đánh dấu `da_vao_bang_ke = true`.

#### BN-16
| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0009` |
| VP gửi / VP nhận | SG → CT |
| NV nhập | `staff_sg` |
| Ngày biên nhận | **15/04/2026** |
| Giờ tạo | `08:00` |
| Đơn vị gửi | Cty TNHH Đại Phong Trading |
| Người gửi | Đặng Đại Phong |
| SĐT gửi | `0956789012` |
| Địa chỉ gửi | 89 Lý Thường Kiệt, P.7, Q.10, TP.HCM |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | Cty CP Sao Việt |
| Người nhận | Lý Sao Việt |
| SĐT nhận | `0978901234` |
| Địa chỉ nhận | 10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 10 Bao |
| Hàng hóa JSON | `[{"don_vi":"Bao","so_luong":10,"ghi_chu":"Hàng cồng kềnh"}]` |
| Giá trị hàng | `15,000,000` đ |
| Trọng lượng | `20.00` kg |
| Thu hộ | `0` |
| Giá cước | `400,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | 10 Võ Văn Kiệt, Q.Ninh Kiều, TP Cần Thơ |
| **Cần xuất HĐĐT** | **Có** |
| **Đã vào bảng kê** | **Có** _(sau khi xuất BK-0001)_ |
| Hàng hư không đến | Không |
| Trạng thái VC | Khách đã nhận |

#### BN-17
| Trường | Giá trị |
|---|---|
| Mã số | `SGCT-0010` |
| VP gửi / VP nhận | SG → CT |
| NV nhập | `admin` |
| Ngày biên nhận | **10/04/2026** |
| Giờ tạo | `09:30` |
| Đơn vị gửi | Cty TNHH XNK Đồng Bằng Xanh |
| Người gửi | Nguyễn Thị Thanh Thảo |
| SĐT gửi | `0907777888` |
| Địa chỉ gửi | Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | HTX Nông Sản Sạch Cần Thơ |
| Người nhận | Huỳnh Thanh Nông |
| SĐT nhận | `0989012345` |
| Địa chỉ nhận | Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 80 Thùng |
| Hàng hóa JSON | `[{"don_vi":"Hộp","so_luong":50,"ghi_chu":"Hàng dễ vỡ"},{"don_vi":"Hộp","so_luong":30,"ghi_chu":"Tránh nhiệt độ cao"}]` |
| Giá trị hàng | `35,000,000` đ |
| Trọng lượng | `10.00` kg |
| Thu hộ | `0` |
| Giá cước | `500,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | Ấp Nhơn Lộc, Xã Nhơn Nghĩa, H.Phong Điền, TP Cần Thơ |
| **Cần xuất HĐĐT** | **Có** |
| **Đã vào bảng kê** | **Có** _(sau khi xuất BK-0001)_ |
| Hàng hư không đến | Không |
| Trạng thái VC | Khách đã nhận |

> 🧪 **Test bảng kê lịch sử:** Sau khi xuất BK-0001 chứa BN-16 + BN-17 → Tab "Lịch sử" → Thấy BK-0001 → Tải lại Excel.

---

### BN-18 — Edge case: **Hàng hư không đến**

| Trường | Giá trị |
|---|---|
| Mã số | `RGCT-0001` |
| VP gửi / VP nhận | RG → CT |
| NV nhập | `staff_rg` — Đặng Hoàng Phúc |
| Ngày biên nhận | 30/04/2026 |
| Giờ tạo | `13:00` |
| Đơn vị gửi | Cty TNHH Thiên Phú |
| Người gửi | Ngô Thiên Phú |
| SĐT gửi | `0990123456` |
| Địa chỉ gửi | 321 Nguyễn Trung Trực, TP Rạch Giá |
| CCCD gửi | `086198009999` |
| Đơn vị nhận | DNTN Hòa Phát Vận Tải |
| Người nhận | Trương Hòa Phát |
| SĐT nhận | `0967890123` |
| Địa chỉ nhận | 56 Cách Mạng Tháng 8, Q.Ninh Kiều, TP Cần Thơ |
| CCCD nhận | _(để trống)_ |
| Tên hàng hóa | 50 Kiện |
| Hàng hóa JSON | `[{"don_vi":"Thùng","so_luong":50,"ghi_chu":"Hàng rất dễ vỡ, vỡ 1 phần trong vận chuyển"}]` |
| Giá trị hàng | `8,000,000` đ |
| Trọng lượng | `150.00` kg |
| Thu hộ | `0` |
| Giá cước | `650,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tự tới |
| Chành | _(để trống)_ |
| Địa chỉ giao | _(để trống)_ |
| Cần xuất HĐĐT | Không |
| **Hàng hư không đến** | ✅ **Có** |
| Trạng thái VC | Đang VC |
| Trạng thái COD | Không có |

> 🧪 **Test:** Checkbox "Hàng hư không đến" được tích → Kiểm tra hiển thị badge cảnh báo trên danh sách BN.

---

### BN-19 — Edge case: **Tối thiểu** — chỉ điền trường bắt buộc

| Trường | Giá trị |
|---|---|
| Mã số | `CTSG-0003` |
| VP gửi / VP nhận | CT → SG |
| NV nhập | `staff_ct` |
| Ngày biên nhận | 04/05/2026 |
| Giờ tạo | _(để trống)_ |
| Đơn vị gửi | _(để trống)_ |
| Người gửi | _(để trống)_ |
| SĐT gửi | _(để trống)_ |
| Địa chỉ gửi | _(để trống)_ |
| CCCD gửi | _(để trống)_ |
| Đơn vị nhận | _(để trống)_ |
| Người nhận | _(để trống)_ |
| SĐT nhận | _(để trống)_ |
| Địa chỉ nhận | _(để trống)_ |
| CCCD nhận | _(để trống)_ |
| **Tên hàng hóa** | **`Hàng tạp hóa`** _(trường BẮT BUỘC duy nhất)_ |
| Hàng hóa JSON | _(để trống)_ |
| Giá trị hàng | _(để trống)_ |
| Trọng lượng | _(để trống)_ |
| Thu hộ | `0` |
| **Giá cước** | **`80,000` đ** |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| Chành | _(để trống)_ |
| Địa chỉ giao | _(để trống)_ |
| Cần xuất HĐĐT | Không |
| Hàng hư không đến | Không |
| Trạng thái VC | Chờ VC |

> 🧪 **Test:** Hệ thống chấp nhận BN tối thiểu với chỉ VP + tên hàng hóa. Mã số vẫn tự động tạo.

---

### BN-20 — Edge case: **Đầy đủ mọi field** + Chành + CCCD cả 2 bên + COD

| Trường | Giá trị |
|---|---|
| Mã số | `SGRG-0002` |
| VP gửi / VP nhận | SG → RG |
| NV nhập | `admin` — Trần Minh Quang |
| Ngày biên nhận | 04/05/2026 |
| Giờ tạo | `10:30` |
| Đơn vị gửi | Cty TNHH Tâm An Logistics |
| Người gửi | Nguyễn Văn Tâm |
| SĐT gửi | `0901234567` |
| Địa chỉ gửi | 123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM |
| **CCCD gửi** | **`079201012345`** |
| Đơn vị nhận | Cty TNHH Thiên Phú |
| Người nhận | Ngô Thiên Phú |
| SĐT nhận | `0990123456` |
| Địa chỉ nhận | 321 Nguyễn Trung Trực, TP Rạch Giá |
| **CCCD nhận** | **`086198001234`** |
| Tên hàng hóa | 9 Kiện |
| Hàng hóa JSON | `[{"don_vi":"Kiện","so_luong":3,"ghi_chu":"Hàng điện tử giá trị cao"},{"don_vi":"Kiện","so_luong":3,"ghi_chu":""},{"don_vi":"Kiện","so_luong":3,"ghi_chu":""}]` |
| Giá trị hàng | `45,000,000` đ |
| Trọng lượng | `9.50` kg |
| **Thu hộ** | **`45,000,000` đ** |
| Giá cước | `500,000` đ |
| TT thanh toán | Đã thu |
| Hình thức giao | Tận nơi |
| **Chành** | **Chành Tàu Cao Tốc Superdong** |
| **Địa chỉ giao** | **12 Hùng Vương, Dương Đông, Phú Quốc, Kiên Giang** |
| Cần xuất HĐĐT | Có |
| Hàng hư không đến | Không |
| Trạng thái VC | Chờ VC |
| **Trạng thái COD** | **Chờ thu** |

> 🧪 **Test:** Kiểm tra hiển thị CCCD, Chành, Địa chỉ giao trên màn hình chi tiết và PDF xuất ra.

---

### BN-21 đến BN-30 — Dữ liệu tháng trước (4/2026)

> Tạo nhanh 10 BN trải đều các ngày trong tháng. Mục đích: Biểu đồ doanh thu có số liệu khi lọc tháng 4/2026.
> Mỗi BN: Thu hộ = 0, Hình thức giao = Tận nơi. Điền thêm Giá trị hàng (2–15 triệu), Trọng lượng (5–50 kg).

| # | Mã số | Ngày | VP gửi→nhận | NV | Người gửi | Người nhận | Hàng hóa | Cước | TT thu | TT VC |
|---|---|---|---|---|---|---|---|---|---|---|
| BN-21 | `SGCT-0011` | 28/04 | SG→CT | `staff_sg` | Cty TNHH Tâm An | HTX Nông Sản CT | 5 Thùng | `150,000` | Đã thu | Khách đã nhận |
| BN-22 | `SGCT-0012` | 27/04 | SG→CT | `staff_sg` | Cty CP Hoàng Long | DNTN Hòa Phát | 3 Bao | `200,000` | Đã thu | Khách đã nhận |
| BN-23 | `CTSG-0004` | 26/04 | CT→SG | `staff_ct` | Cty CP Sao Việt | Cty TNHH Tâm An | 10 Bao | `300,000` | Đã thu | Khách đã nhận |
| BN-24 | `CTSG-0005` | 25/04 | CT→SG | `staff_ct` | HTX Nông Sản CT | Cửa Hàng Thanh Bình | 5 Thùng xốp | `250,000` | **Công nợ** | Khách đã nhận |
| BN-25 | `SGRG-0003` | 24/04 | SG→RG | `admin` | Cty TNHH Đại Phong | Cty TNHH Thiên Phú | 2 Kiện | `400,000` | Đã thu | Đã đến kho |
| BN-26 | `RGSG-0003` | 23/04 | RG→SG | `staff_rg` | Cty TNHH Thiên Phú | Cty TNHH Tâm An | 8 Thùng xốp | `500,000` | Đã thu | Khách đã nhận |
| BN-27 | `CTRG-0003` | 22/04 | CT→RG | `ketoan_ct` | Cty XNK Đồng Bằng | Cty TNHH Thiên Phú | 20 Bao | `350,000` | Đã thu | Khách đã nhận |
| BN-28 | `RGCT-0002` | 21/04 | RG→CT | `staff_rg` | Cty TNHH Phú Quốc | Cty CP Sao Việt | 10 Thùng | `180,000` | Đã thu | Khách đã nhận |
| BN-29 | `SGCT-0013` | 20/04 | SG→CT | `staff_sg` | DNTN Minh Phát | Cty TNHH Thiên Phú | 3 Kiện | `120,000` | **Công nợ** | Khách đã nhận |
| BN-30 | `CTSG-0006` | 19/04 | CT→SG | `staff_ct` | Cty CP Hoàng Long | Cty TNHH Tâm An | 5 Thùng | `100,000` | Đã thu | Khách đã nhận |


---

### BN-31 đến BN-38 — Dữ liệu tháng 3/2026

> Tạo 8 BN ngày trong tháng 3. Mục đích: Module Báo cáo doanh thu có số liệu khi lọc tháng 3/2026.
> Mỗi BN: Thu hộ = 0, Hình thức giao = Tận nơi. Điền thêm Giá trị hàng và Trọng lượng tùy ý.

| # | Mã số | Ngày | VP gửi→nhận | NV | Người gửi | Hàng hóa | Cước | TT thu | TT VC |
|---|---|---|---|---|---|---|---|---|---|
| BN-31 | `SGCT-0014` | 28/03 | SG→CT | `staff_sg` | Cty TNHH Tâm An | 2 Kiện | `250,000` | Đã thu | Khách đã nhận |
| BN-32 | `SGCT-0015` | 25/03 | SG→CT | `admin` | Cty TNHH Đại Phong | 4 Thùng | `300,000` | **Công nợ** | Khách đã nhận |
| BN-33 | `CTSG-0007` | 22/03 | CT→SG | `staff_ct` | Cty CP Sao Việt | 5 Bao | `150,000` | Đã thu | Khách đã nhận |
| BN-34 | `SGRG-0004` | 20/03 | SG→RG | `staff_sg` | DNTN Minh Phát | 2 Thùng | `100,000` | Đã thu | Khách đã nhận |
| BN-35 | `RGSG-0004` | 18/03 | RG→SG | `staff_rg` | Cty TNHH Thiên Phú | 10 Thùng xốp | `450,000` | Đã thu | Khách đã nhận |
| BN-36 | `CTRG-0004` | 15/03 | CT→RG | `ketoan_ct` | Cty XNK Đồng Bằng | 15 Bao | `200,000` | Đã thu | Khách đã nhận |
| BN-37 | `RGCT-0003` | 10/03 | RG→CT | `staff_rg` | Cty TNHH Phú Quốc | 10 Thùng | `120,000` | Đã thu | Khách đã nhận |
| BN-38 | `SGCT-0016` | 05/03 | SG→CT | `staff_sg` | Cty CP Hoàng Long | 5 Bao | `180,000` | Đã thu | Khách đã nhận |


---

## 6. PHIẾU THU (8 bản ghi)

### PT-0001 — Thu cước thông thường (tiền mặt)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0001` |
| Ngày thu | 04/05/2026 |
| Đối tượng | Cty TNHH Tâm An Logistics |
| Lý do | Thu cước vận chuyển BN `SGCT-0001` ngày 04/05/2026 |
| Số tiền | `150,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` — Nguyễn Thị Thu Hà |
| Biên nhận liên kết | `SGCT-0001` |
| Đã hủy | Không |

### PT-0002 — Thu cước theo hợp đồng tháng (chuyển khoản)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0002` |
| Ngày thu | 03/05/2026 |
| Đối tượng | Cty CP Hoàng Long Phát |
| Lý do | Thu cước vận chuyển tháng 5/2026 theo hợp đồng số HĐ-2026-045 |
| Số tiền | `5,000,000` đ |
| Hình thức | **Chuyển khoản** |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` — Nguyễn Thị Thu Hà |
| Biên nhận liên kết | _(để trống — thu theo hợp đồng tháng)_ |
| Đã hủy | Không |

### PT-0003 — Thu công nợ (liên kết BN-07 — SGCT-0005)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0003` |
| Ngày thu | 02/05/2026 |
| Đối tượng | Cty TNHH Thiên Phú |
| Lý do | Thu nợ cước BN `SGCT-0005` ngày 28/03/2026 — quá hạn 35 ngày |
| Số tiền | `300,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` — Nguyễn Thị Thu Hà |
| Biên nhận liên kết | `SGCT-0005` |
| Đã hủy | Không |

> 🧪 Sau khi tạo PT-0003 → Vào Công nợ → BN-07 (SGCT-0005) chuyển trạng thái **"Đã thu"**.

### PT-0004 — Thu COD tại VP nhận (SG) — BN-09
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0004` |
| Ngày thu | 03/05/2026 |
| Đối tượng | Võ Thanh Bình — Cửa Hàng Thanh Bình |
| Lý do | Thu tiền COD từ người nhận — BN `CTSG-0002` |
| Số tiền | `3,000,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `admin` — Trần Minh Quang |
| Biên nhận liên kết | `CTSG-0002` |
| Đã hủy | Không |

> 🧪 Phiếu tự tạo khi nhấn "Xác nhận thu" COD cho BN-09.

### PT-0005 — Thu COD tại VP gửi (RG) — BN-10
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0005` |
| Ngày thu | 01/05/2026 |
| Đối tượng | VP Hồ Chí Minh chuyển về |
| Lý do | Nhận tiền COD từ VP SG chuyển về — BN `RGSG-0002` |
| Số tiền | `1,500,000` đ |
| Hình thức | Chuyển khoản |
| Văn phòng | **VP Rạch Giá** |
| Nhân viên | `staff_rg` — Đặng Hoàng Phúc |
| Biên nhận liên kết | `RGSG-0002` |
| Đã hủy | Không |

> 🧪 Phiếu tự tạo khi nhấn "Xác nhận chuyển" COD cho BN-10.

### PT-0006 — Thu tại VP Cần Thơ
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0006` |
| Ngày thu | 02/05/2026 |
| Đối tượng | Cty CP Sao Việt |
| Lý do | Thu cước tuyến CT→SG tháng 5/2026 |
| Số tiền | `850,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | **VP Cần Thơ** |
| Nhân viên | `ketoan_ct` — Võ Thị Ngọc Hân |
| Biên nhận liên kết | `CTSG-0004` |
| Đã hủy | Không |

### PT-0007 — Thu tháng trước (tháng 3/2026)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0007` |
| Ngày thu | 25/03/2026 |
| Đối tượng | Cty TNHH Tâm An Logistics |
| Lý do | Thu cước vận chuyển tháng 3/2026 — đợt 2 |
| Số tiền | `3,800,000` đ |
| Hình thức | Chuyển khoản |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` |
| Biên nhận liên kết | _(để trống)_ |
| Đã hủy | Không |

### PT-0008 — Phiếu thu **đã hủy** (test soft delete)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PT-0008` |
| Ngày thu | 04/05/2026 |
| Đối tượng | Cty TNHH ABC Thương Mại |
| Lý do | Thu cước — HỦY do nhập sai số tiền |
| Số tiền | `500,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` |
| Biên nhận liên kết | _(để trống)_ |
| **Đã hủy** | ✅ **Có** |

> 🧪 Phiếu bị hủy → Vẫn hiển thị trong danh sách với badge "Đã hủy" (soft delete, không xóa khỏi DB).

---

## 7. PHIẾU CHI (8 bản ghi)

### PC-0001 — Chi phí vận chuyển nhà xe
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0001` |
| Ngày chi | 04/05/2026 |
| Người nhận | Nhà xe Phương Trang |
| Lý do | Chi phí vận chuyển tuyến SG→CT tuần 18/2026 |
| Số tiền | `3,500,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `admin` — Trần Minh Quang |
| Đã hủy | Không |

### PC-0002 — Chi thuê mặt bằng (chuyển khoản)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0002` |
| Ngày chi | 01/05/2026 |
| Người nhận | Ông Nguyễn Văn Minh — Chủ nhà VP TP.HCM |
| Lý do | Tiền thuê mặt bằng 491 Lê Hồng Phong, Q.10 — tháng 5/2026 |
| Số tiền | `12,000,000` đ |
| Hình thức | **Chuyển khoản** |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` — Nguyễn Thị Thu Hà |
| Đã hủy | Không |

### PC-0003 — Chi tiền công bốc xếp
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0003` |
| Ngày chi | 03/05/2026 |
| Người nhận | Tổ bốc xếp — Anh Bảy (5 nhân công) |
| Lý do | Tiền công bốc xếp hàng hóa tuần 18/2026 (28/04–04/05/2026) |
| Số tiền | `2,500,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `admin` |
| Đã hủy | Không |

### PC-0004 — Chi văn phòng phẩm
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0004` |
| Ngày chi | 02/05/2026 |
| Người nhận | Văn phòng phẩm Thành Đạt |
| Lý do | Mua giấy in A4 Double A (5 ram), mực in HP (2 hộp), bút bi Thiên Long (5 hộp), bìa hồ sơ (50 cái) |
| Số tiền | `650,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` |
| Đã hủy | Không |

### PC-0005 — Chi COD — Chuyển tiền từ VP SG về VP RG (BN-10)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0005` |
| Ngày chi | 01/05/2026 |
| Người nhận | VP Rạch Giá — Nhận COD chuyển về |
| Lý do | Chuyển tiền COD từ VP SG về VP RG — BN `RGSG-0002` |
| Số tiền | `1,500,000` đ |
| Hình thức | Chuyển khoản |
| Văn phòng | **VP Hồ Chí Minh** |
| Nhân viên | `ketoan` |
| Đã hủy | Không |

> 🧪 Phiếu tự tạo khi nhấn "Xác nhận chuyển" COD cho BN-10.

### PC-0006 — Chi COD — Trả tiền cho người gửi tại SG (BN-11)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0006` |
| Ngày chi | 22/04/2026 |
| Người nhận | Lê Minh Phát — DNTN Minh Phát |
| Lý do | Trả tiền COD cho người gửi — BN `SGCT-0006` |
| Số tiền | `4,200,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` |
| Đã hủy | Không |

> 🧪 Phiếu tự tạo khi nhấn "Xác nhận trả" COD cho BN-11.

### PC-0007 — Chi thuê mặt bằng VP Cần Thơ
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0007` |
| Ngày chi | 01/05/2026 |
| Người nhận | Bà Nguyễn Thị Lan — Chủ nhà VP Cần Thơ |
| Lý do | Tiền thuê mặt bằng VP Cần Thơ tháng 5/2026 |
| Số tiền | `8,000,000` đ |
| Hình thức | Chuyển khoản |
| Văn phòng | **VP Cần Thơ** |
| Nhân viên | `ketoan_ct` — Võ Thị Ngọc Hân |
| Đã hủy | Không |

### PC-0008 — Phiếu chi **đã hủy** (test soft delete)
| Trường | Giá trị |
|---|---|
| Mã phiếu | `PC-0008` |
| Ngày chi | 03/05/2026 |
| Người nhận | Nhà xe Kumho Samco |
| Lý do | Chi phí vận chuyển tuyến SG→RG — HỦY do trùng lần chi |
| Số tiền | `2,000,000` đ |
| Hình thức | Tiền mặt |
| Văn phòng | VP Hồ Chí Minh |
| Nhân viên | `ketoan` |
| **Đã hủy** | ✅ **Có** |

---


## 8. BẢNG KÊ HĐĐT

### BK-0001 — Bảng kê lịch sử (đã xuất)

> **Cách tạo:** Module HĐĐT → Tab "BN chờ" → Chọn **BN-16** (`SGCT-0009`) + **BN-17** (`SGCT-0010`) → Nhấn "Xuất bảng kê" → File Excel tải xuống tự động.

| Trường | Giá trị |
|---|---|
| Mã bảng kê | `BK-0001` _(tự động)_ |
| Ngày xuất | _(ngày bạn thực hiện)_ |
| Số biên nhận | `2` |
| Tổng cước | `900,000` đ (400,000 + 500,000) |
| Tên file | `BK-0001_20260504.xlsx` |

**Chi tiết dòng trong Excel:**

| STT | Ngày BN | Tuyến | Người gửi | Địa chỉ gửi | Hàng hóa | Giá cước |
|---|---|---|---|---|---|---|
| 1 | 15/04/2026 | SG→CT | Cty TNHH Đại Phong Trading | 89 Lý Thường Kiệt, P.7, Q.10, TP.HCM | 5 Bao Hunter | `400,000` |
| 2 | 10/04/2026 | SG→CT | Cty TNHH XNK Đồng Bằng Xanh | Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ | Mỹ phẩm nhập khẩu Hàn Quốc | `500,000` |

> 🧪 **Test:** Sau khi xuất → Tab "Lịch sử" → Thấy `BK-0001` → Nhấn tải lại → File Excel download lại.

> 🧪 **Test thêm:** BN-16 và BN-17 **không còn xuất hiện** trong tab "BN chờ" sau khi đã vào bảng kê.

---

## 9. DOANH NGHIỆP HĐĐT — Autocomplete khi tự kê bảng kê

| Tên | Mã số thuế | Địa chỉ |
|---|---|---|
| `Cty TNHH Đại Phong Trading` | `0398765432` | `89 Lý Thường Kiệt, P.7, Q.10, TP.HCM` |
| `Cty TNHH XNK Đồng Bằng Xanh` | `1800123456` | `Lô B5, KCN Trà Nóc, Q.Bình Thủy, TP Cần Thơ` |
| `Cty CP Hoàng Long Phát` | `0301234567` | `456 Điện Biên Phủ, P.25, Q.Bình Thạnh, TP.HCM` |
| `Cty TNHH Tâm An Logistics` | `0312345678` | `123 Nguyễn Văn Linh, P.Tân Phong, Q.7, TP.HCM` |

---

## 10. KỊCH BẢN TEST THEO LUỒNG NGHIỆP VỤ

### Kịch bản A — Luồng nhận & giao hàng cơ bản

1. Đăng nhập `staff_sg`
2. Tạo **BN-01** (`SGCT-0001`) → Hệ thống sinh mã tự động, trạng thái "Chờ VC"
3. In PDF → Quét QR → Trang `/scan/SGCT-0001` hiện thông tin (ẩn giá cước, tên NV)
4. Cập nhật → Đang VC
5. Đăng nhập `staff_ct` → Xác nhận thấy BN-01 trong danh sách
6. Cập nhật tiếp: Đã đến kho → Đã báo khách → Khách đã nhận
7. Kiểm tra lịch sử trạng thái đủ 5 bước tuần tự
8. Thử nhảy bước (Chờ VC → Đã đến kho) → Hệ thống từ chối

### Kịch bản B — Công nợ: tạo, quá hạn, xác nhận thu, hủy

1. Tạo **BN-06** (`SGCT-0004`) TT Thu = Công nợ → Vào Công nợ: thấy dòng "Chưa thu"
2. Tạo **BN-07** (`SGCT-0005`) ngày 28/03/2026, TT Thu = Công nợ → Badge "Quá hạn"
3. Xác nhận thu BN-07 → **PT-0003** tự tạo → Công nợ chuyển "Đã thu"
4. Xuất PDF công nợ cho "Cty TNHH Thiên Phú" → Kiểm tra nội dung
5. Hủy PT-0003 → Công nợ BN-07 **revert** về "Chưa thu"
6. Đối soát cước: kiểm tra highlight bất thường

### Kịch bản C — Toàn bộ luồng COD 4 bước

**Bước 1:** Tạo **BN-08** (`CTSG-0001`) Thu hộ = `2,500,000` → Module COD → Thẻ "Chờ thu"

**Bước 2:** `staff_sg` Xác nhận thu BN-08 → Trạng thái COD: **Đã thu** → PT tại VP SG tự tạo

**Bước 3:** `ketoan` Xác nhận chuyển BN-08 → **PC tại VP SG + PT tại VP CT** tự tạo

**Bước 4:** `ketoan` Xác nhận trả BN-08 → **PC tại VP CT** tự tạo → Thẻ "Hoàn tất"

Kiểm tra thêm: Thử xóa **BN-11** (COD đã trả) → Hệ thống từ chối. `staff_sg` đăng nhập → Không thấy nút "Xác nhận chuyển" / "Xác nhận trả".

### Kịch bản D — Xuất bảng kê HĐĐT

1. Đăng nhập `admin`
2. Tạo **BN-12 → BN-15** với Cần xuất HĐĐT = Có
3. Module HĐĐT → Tab "BN chờ" → Thấy 4 BN vừa tạo
4. Chọn tất cả → Xuất bảng kê → Excel tải xuống ngay
5. Tab "Lịch sử" → Thấy bảng kê mới → Tải lại
6. Tab "BN chờ" → 4 BN đã biến mất
7. Thử xuất khi không chọn BN nào → Hệ thống báo lỗi

### Kịch bản E — Kiểm tra phân quyền

| Tài khoản | Được phép | Bị chặn |
|---|---|---|
| `staff_sg` | BN tuyến SG, tạo BN, xác nhận thu COD | Báo cáo, Công nợ, HĐĐT, Quản lý hệ thống, sửa BN của staff_ct |
| `ketoan` | Tất cả BN, Công nợ, COD, Báo cáo | Tạo/sửa BN |
| `admin` | Toàn quyền | Tự tắt tài khoản mình, tắt VP còn NV active |

### Kịch bản F — Báo cáo doanh thu

1. Module Báo cáo → Mặc định tháng hiện tại → Kiểm tra 4 thẻ tổng hợp
2. Đổi nhóm: Ngày → Tuần → Tháng → Năm
3. Lọc theo VP gửi = TP.HCM → Số liệu giảm theo
4. Đổi khoảng ngày sang tháng 3/2026 → Thấy 8 BN (BN-31 → BN-38)

### Kịch bản G — Quản lý nhân viên

1. Admin tạo **NV-8** (`nv_new`), tích "Yêu cầu đổi MK"
2. Đăng nhập `nv_new` → Redirect đến trang đổi MK bắt buộc
3. Admin Reset MK **NV-9** (`nv_locked`) → Xem MK ngẫu nhiên mới
4. Admin bật lại **NV-7** (`staff_rg_old`) → Đăng nhập được
5. Admin tự tắt tài khoản `admin` → Hệ thống từ chối

### Kịch bản H — Autocomplete & tự tạo khách hàng

1. Tạo BN mới → Ô Người gửi → Gõ `"Tâm"` → Dropdown hiện KH-001
2. Gõ `"0901"` → Dropdown hiện KH có SĐT chứa 0901
3. Gõ 1 ký tự → Dropdown không hiện (min 2 ký tự, max 5 kết quả)
4. **KH-015** (inactive) → KHÔNG xuất hiện trong dropdown
5. Điền SĐT gửi = `0358999000` (KH-018 chưa tồn tại) → Tạo BN → Hệ thống tự tạo KH-018 → Toast thông báo

### Kịch bản I — Tra cứu QR công khai

1. In PDF BN-05 (`RGSG-0001`) → Quét QR → Truy cập `/scan/RGSG-0001`
2. Kiểm tra: ✅ Thông tin hàng hóa, lịch sử trạng thái, trạng thái tiếp theo
3. Kiểm tra: ❌ Không hiện giá cước, TT thanh toán, tên nhân viên
4. Truy cập `/scan/KHONGCO` → Trang báo "Không tìm thấy biên nhận"

### Kịch bản J — Sổ biên nhận (PDF & Excel)

1. Đăng nhập `admin` → Module Biên nhận → Tính năng **Xuất sổ**
2. Chọn VP gửi = SG, VP nhận = CT, Ngày = 04/05/2026 → Xuất PDF → Kiểm tra danh sách BN-01, BN-06, BN-07... đúng tuyến đúng ngày
3. Xuất Excel cùng điều kiện → File `.xlsx` tải xuống → Kiểm tra cột số liệu
4. **Edge case:** Đặt Ngày từ = `05/05/2026`, Ngày đến = `04/05/2026` (đảo ngược) → Hệ thống báo lỗi `400`
5. **Edge case:** VP gửi = SG, VP nhận = SG (trùng nhau) → Hệ thống báo lỗi `400`
6. **Edge case:** Chọn khoảng ngày không có BN nào (ví dụ: 01/01/2020) → PDF/Excel xuất ra với bảng trống, không crash

### Kịch bản K — Batch cập nhật trạng thái (Gửi xe)

1. Đăng nhập `admin` → Danh sách BN → Chọn **BN-21**, **BN-22**, **BN-23** (đều đang "Khách đã nhận" — đây chỉ là ví dụ cấu trúc, dùng BN ở trạng thái "Chờ VC" thực tế)
2. Tạo thêm 3 BN mới tuyến SG→CT, để ở trạng thái "Chờ VC", đặt tên tạm **BN-Batch-1**, **BN-Batch-2**, **BN-Batch-3**
3. Tick chọn cả 3 → Nhấn "Gửi xe" (Batch update → "Đang VC") → Hệ thống cập nhật đồng loạt
4. Kiểm tra lịch sử trạng thái của từng BN: hiện dòng `ghi_chu = "Batch: 3 biên nhận"`
5. **Edge case:** Chọn batch gồm BN đang "Chờ VC" lẫn BN đang "Đã đến kho" → nhấn "Gửi xe" (→ "Đang VC") → Hệ thống từ chối toàn bộ batch, báo rõ BN nào không hợp lệ
6. **Edge case:** Batch với mảng `ids` rỗng → Hệ thống báo lỗi validation

### Kịch bản L — Xóa & Sửa BN có điều kiện

#### L1 — Xóa BN: các trường hợp bị từ chối

| TT | Hành động | Kết quả mong đợi |
|---|---|---|
| 1 | `staff_sg` xóa BN do `staff_ct` tạo | ❌ 403 — "Bạn chỉ được xóa biên nhận do mình tạo" |
| 2 | `staff_sg` xóa BN do mình tạo nhưng đã > 24h (BN-01 tạo hôm qua) | ❌ 403 — "Biên nhận đã quá 24 giờ. Liên hệ Admin để xóa." |
| 3 | `admin` xóa **BN-16** (đã vào bảng kê BK-0001) | ❌ 400 — "Biên nhận đã vào bảng kê, không thể xóa" |
| 4 | `admin` xóa **BN-09** hoặc **BN-10** (COD đang `da_thu` / `da_chuyen`) | ❌ 400 — "Biên nhận có COD đang xử lý..." |
| 5 | `admin` xóa BN-Batch-1 (vừa tạo, không có ràng buộc) | ✅ Xóa thành công |

#### L2 — Sửa BN: các trường hợp bị từ chối

| TT | Hành động | Kết quả mong đợi |
|---|---|---|
| 1 | `staff_sg` sửa BN do `staff_ct` tạo | ❌ 403 — "Bạn chỉ được sửa biên nhận do mình tạo" |
| 2 | `staff_sg` sửa BN do mình tạo nhưng > 24h | ❌ 403 — "Biên nhận đã quá 24 giờ. Liên hệ Admin để sửa." |
| 3 | Sửa `thu_ho` = 0 khi COD của **BN-09** đang `da_thu` | ❌ 400 — "Không thể xóa tiền thu hộ khi COD đang được xử lý" |

#### L3 — Sửa BN: happy case

1. `admin` mở **BN-19** (BN tối thiểu) → Thêm tên người gửi `"Khách lẻ"`, SĐT `"0909.111.222"`, tên hàng `"Quần áo"`
2. Lưu → `ten_hang_hoa` cập nhật lại theo `hang_hoa_json` mới
3. Kiểm tra: không tạo thêm lịch sử trạng thái (sửa thông tin, không phải sửa trạng thái VC)

### Kịch bản M — Phiếu thu/chi thủ công & Hủy phiếu

#### M1 — Tạo phiếu thu thủ công

1. Đăng nhập `ketoan` → Module Phiếu thu → Tạo mới
2. Điền: Đối tượng = `"Cty TNHH Tâm An Logistics"`, Lý do = `"Thu cước tháng 5/2026 đợt 2"`, Số tiền = `2,000,000`, Hình thức = Chuyển khoản, Biên nhận liên kết = _(để trống)_
3. Lưu → PT mới xuất hiện đầu danh sách với badge **"Hợp lệ"**
4. Kiểm tra: tổng thu trong báo cáo tăng lên đúng `2,000,000 đ`

#### M2 — Hủy phiếu thu & kiểm tra revert công nợ

1. `ketoan` → Danh sách Phiếu thu → Tìm **PT-0003** (đã thu công nợ BN-07)
2. Nhấn "Hủy phiếu" → Xác nhận
3. Vào Module Công nợ → **BN-07** (`SGCT-0005`) chuyển lại trạng thái **"Chưa thu"**
4. Kiểm tra PT-0003 vẫn còn trong danh sách với badge **"Đã hủy"** (soft delete, không xóa DB)
5. Kiểm tra tổng công nợ tăng trở lại `300,000 đ`

#### M3 — Tạo phiếu chi thủ công

1. Đăng nhập `ketoan` → Module Phiếu chi → Tạo mới
2. Điền: Người nhận = `"Nhà xe Phương Trang"`, Lý do = `"Chi phí xe tuyến SG→CT tuần 19"`, Số tiền = `4,000,000`, Hình thức = Tiền mặt
3. Lưu → PC mới xuất hiện đầu danh sách
4. **Edge case:** `staff_sg` truy cập Module Phiếu thu/chi → Hệ thống chặn (`403 Forbidden`)

### Kịch bản N — Mã biên nhận custom & Preview mã

#### N1 — Preview mã tự động

1. Tạo BN mới → Chọn VP gửi = SG, VP nhận = CT, Ngày = 04/05/2026
2. Ô "Mã biên nhận" tự hiển thị preview: `SGCT-XXXX` (số thứ tự tiếp theo trong ngày)
3. Đổi VP nhận = RG → Mã preview đổi thành `SGRG-XXXX`
4. Đổi Ngày = 01/01/2026 → Mã preview reset về `SGCT-0001` (ngày đó chưa có BN)

#### N2 — Mã biên nhận custom

1. Tạo BN mới, tick "Dùng mã tự chọn" → Nhập `"SGCT-TEST-001"` → Lưu thành công
2. Tạo BN mới khác, nhập lại `"SGCT-TEST-001"` → Hệ thống báo lỗi `409 — "Mã biên nhận đã tồn tại"`
3. Kiểm tra BN vừa tạo xuất hiện đúng mã trong danh sách

#### N3 — Auto-thu COD khi cập nhật trạng thái

1. Tạo BN mới tuyến CT→SG, `thu_ho = 1,000,000`, `trang_thai_thu = da_thu` — trạng thái COD lúc này = `cho_thu`
2. Lần lượt cập nhật: Chờ VC → Đang VC → Đã đến kho → Đã báo khách
3. Cập nhật lần cuối: **Đã báo khách → Khách đã nhận**
4. Kiểm tra: Hệ thống tự động thu COD (auto-trigger), response có `auto_thu_cod: true`
5. Kiểm tra: Phiếu thu tự động tạo tại VP nhận (SG), số tiền `1,000,000 đ`
6. Kiểm tra: Module COD → BN này chuyển sang thẻ **"Đã thu"** ngay lập tức

#### N4 — Đối soát cước chi tiết (phát hiện bất thường)

1. Đăng nhập `ketoan` → Module Công nợ → Tab **"Đối soát chi tiết"**
2. Chọn Tháng = 5, Năm = 2026 → Xem bảng kết quả
3. Kiểm tra cột **Chênh lệch**: HĐĐT xuất đúng ≤ cước thực tế → Chênh lệch ≤ 0 (bình thường)
4. Kiểm tra cột **Bất thường**: Đơn vị nào có `≤ 5 BN` nhưng HĐĐT > `1,000,000 đ` → Flag đỏ
5. **Simulate bất thường:** Tạo BN mới `can_xuat_hddt = true`, xuất bảng kê riêng với giá trị cao hơn thực tế → Reload đối soát → Flag bật đỏ cho đơn vị đó

---

## 11. THÔNG TIN ĐĂNG NHẬP TỔNG HỢP

| Username | Mật khẩu | Vai trò | VP | Ghi chú |
|---|---|---|---|---|
| `admin` | `Tmq@1234` | Admin | TP.HCM | Toàn quyền |
| `ketoan` | `Tmq@1234` | Accountant | TP.HCM | Tài chính + báo cáo |
| `staff_sg` | `Tmq@1234` | Staff | TP.HCM | Chỉ thấy BN tuyến SG |
| `staff_ct` | `Tmq@1234` | Staff | Cần Thơ | Chỉ thấy BN tuyến CT |
| `ketoan_ct` | `Tmq@1234` | Accountant | Cần Thơ | Tài chính VP Cần Thơ |
| `staff_rg` | `Tmq@1234` | Staff | Rạch Giá | Chỉ thấy BN tuyến RG |
| `staff_rg_old` | `Tmq@1234` | Staff | Rạch Giá | **Inactive** — không đăng nhập được |
| `nv_new` | `Tmq@1234` | Staff | TP.HCM | **Bắt đổi MK** lần đầu đăng nhập |
| `nv_locked` | `Tmq@1234` | Staff | Cần Thơ | Demo Reset MK bởi Admin |

---

## 12. THỨ TỰ NHẬP DỮ LIỆU ĐỀ XUẤT

| Bước | Nội dung | Ghi chú |
|---|---|---|
| 1 | VP (3), NV (9), Chành (4), DN HĐĐT (4) | Admin thực hiện |
| 2 | Khách hàng KH-001 → KH-017 | KH-018 tự tạo qua BN |
| 3 | BN-01 → BN-07 | Test VC + công nợ |
| 4 | BN-08 → BN-11 | Test COD từng bước |
| 5 | BN-12 → BN-15 → Xuất bảng kê | Test HĐĐT |
| 6 | BN-16 → BN-17 → Xuất BK-0001 | Lịch sử bảng kê |
| 7 | BN-18 → BN-20 | Edge cases |
| 8 | BN-21 → BN-38 | Dữ liệu cho báo cáo |
| 9 | PT-0001 → PT-0008, PC-0001 → PC-0008 | Tạo qua form + test hủy |
| 10 | Chạy kịch bản A → I | User testing chính thức |

> **Lưu ý:** BN-31 → BN-38 cần chỉnh **Ngày biên nhận** về tháng 3/2026 khi tạo (back-dating). Hệ thống cho phép điền ngày trong quá khứ.
>
> **PT/PC từ COD** (PT-0004, PT-0005, PC-0005, PC-0006) được tạo **tự động** khi xác nhận từng bước COD, không cần nhập tay.
