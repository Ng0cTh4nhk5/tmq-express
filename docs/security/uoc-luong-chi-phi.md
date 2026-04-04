# TMQ Express — Ước Lượng Chi Phí Phần Cứng Khi Tăng Cường Bảo Mật

---

## 0. Giả Định Quy Mô Hệ Thống

| Thông số | Giá trị ước lượng |
|---|---|
| Số nhân viên | 5–15 người |
| Biên nhận / ngày | 100–300 |
| API requests / ngày | 2.000–8.000 |
| Phiếu thu-chi / ngày | 20–80 |
| Kích thước DB hiện tại | ~50–200 MB (sau 1 năm) |
| Hạ tầng hiện tại | 1 VPS hoặc 1 máy tính local |

---

## 1. Phân Tích Tác Động Tài Nguyên Từng Giải Pháp

| Giải pháp | CPU | RAM | Storage/năm | DB Load | Tác động thực tế |
|---|:---:|:---:|:---:|:---:|---|
| **S-01** Audit Log | ⬜ | ⬜ | **+100–500 MB** | +1 INSERT/write | Lớn nhất — mỗi thao tác ghi thêm 1 record |
| **S-02** Login Log | ⬜ | ⬜ | +1–5 MB | Không đáng kể | Chỉ vài chục sự kiện/ngày |
| **S-03** Account Lock | ⬜ | ⬜ | ~0 | ~0 | Chỉ thêm 2 cột vào bảng có sẵn |
| **S-04** JWT Revoke | ⬜ | ⬜ | ~0 | **+1 SELECT/request** | Mỗi API call thêm 1 query nhỏ (~2ms) |
| **S-05** Single Session | ⬜ | ⬜ | ~0 | ~0 | Gộp với S-04, không thêm chi phí |
| **S-06** Fine Permissions | ⬜ | ⬜ | ~0 | ~0 | Chỉ logic check trong code |
| **S-07** Edit Time Limit | ⬜ | ⬜ | ~0 | ~0 | So sánh timestamp, không tốn gì |
| **S-08** PDF Watermark | ⚡ nhẹ | ⬜ | ~0 | ~0 | Thêm ~10ms khi render PDF |
| **S-09** 2FA (TOTP) | ⬜ | ⬜ | ~0 | ~0 | TOTP tính phía client, server chỉ verify 1 số |
| **S-10** Admin Dashboard | ⚡ nhẹ | ⬜ | ~0 | +aggregation queries | Chỉ chạy khi Admin mở trang |
| **S-11** Financial Hash | ⬜ | ⬜ | +5–20 MB | ~0 | Thêm 1 cột hash 64 chars |
| **S-12** DB Backup | ⚡ lúc backup | ⬜ | **+200 MB–2 GB** | Nặng lúc chạy pg_dump | Chạy đêm, 1 lần/ngày, ~5–30 giây |
| **S-13** CSRF | ⬜ | ⬜ | ~0 | ~0 | Chỉ middleware check |

> **Chú thích:** ⬜ = Không đáng kể, ⚡ = Có tác động nhẹ

---

## 2. Ba Kịch Bản Triển Khai

---

### Kịch Bản A — "Nền Tảng" (3 giải pháp)

> Áp dụng: **S-01, S-02, S-03** (Audit Log + Login Log + Account Lock)

| Tài nguyên | Mức tăng thêm | Giải thích |
|---|---|---|
| **CPU** | +0% | Audit log chỉ là INSERT, rất nhẹ |
| **RAM** | +0 MB | Không cache gì thêm |
| **Storage /năm** | **+100–500 MB** | Audit log: ~200 bytes/record × 300–1.000 thao tác/ngày |
| **DB connections** | +0 | Cùng connection pool hiện tại |

#### Yêu cầu phần cứng tối thiểu

| Thông số | Chưa có bảo mật | Có Kịch Bản A | Chênh lệch |
|---|---|---|---|
| CPU | 1 vCPU | 1 vCPU | **Không đổi** |
| RAM | 1 GB | 1 GB | **Không đổi** |
| SSD | 20 GB | 20 GB | **Không đổi** |

> **💰 Chi phí phần cứng tăng thêm: 0 đồng**
> Storage tăng ~500 MB/năm — nằm trong dung lượng bất kỳ VPS nào.

---

### Kịch Bản B — "Khuyến Nghị" (8 giải pháp)

> Áp dụng: **S-01 → S-08** (Audit + Login + Lock + JWT Revoke + Single Session + Permissions + Time Limit + Watermark)

| Tài nguyên | Mức tăng thêm | Giải thích |
|---|---|---|
| **CPU** | +2–5% | PDF watermark + token_version query mỗi request |
| **RAM** | +0 MB | Không có caching layer mới |
| **Storage /năm** | **+100–500 MB** | Giống KBản A (S-04→S-08 không tốn storage) |
| **DB queries /request** | **+1 SELECT** | Verify token_version mỗi API call (~2ms) |

#### Yêu cầu phần cứng tối thiểu

| Thông số | Chưa có bảo mật | Có Kịch Bản B | Chênh lệch |
|---|---|---|---|
| CPU | 1 vCPU | 1 vCPU | **Không đổi** |
| RAM | 1 GB | 1 GB | **Không đổi** |
| SSD | 20 GB | 20 GB | **Không đổi** |

#### Phân tích tác động token_version check

```
Số request/ngày:  ~5.000 (trung bình)
Thêm 1 SELECT/request:  5.000 queries × 2ms = 10 giây CPU/ngày
→ Tổng tải thêm: ~0.01% thời gian CPU trong 24h
```

> **💰 Chi phí phần cứng tăng thêm: 0 đồng**
> Tải thêm không đáng kể cho bất kỳ VPS 1 vCPU nào.

---

### Kịch Bản C — "Toàn Diện" (13 giải pháp)

> Áp dụng: **Tất cả S-01 → S-13**

| Tài nguyên | Mức tăng thêm | Giải thích |
|---|---|---|
| **CPU** | +5–10% | Aggregation queries cho dashboard + backup + hash verify |
| **RAM** | +0 MB | Vẫn không cần cache layer |
| **Storage /năm** | **+0.5–2.5 GB** | Audit log ~500MB + Backup ~2GB (30 bản × ~50MB) |
| **DB queries** | +1 SELECT/request + aggregation khi mở dashboard | |

#### Yêu cầu phần cứng tối thiểu

| Thông số | Chưa có bảo mật | Có Kịch Bản C | Chênh lệch |
|---|---|---|---|
| CPU | 1 vCPU | 1 vCPU | **Không đổi** |
| RAM | 1 GB | 1 GB | **Không đổi** |
| SSD | 20 GB | **25 GB** | **+5 GB** (cho backup rotation) |

#### Chi tiết storage breakdown (năm đầu)

| Thành phần | Kích thước |
|---|---|
| Database gốc | ~200 MB |
| Audit Log (S-01) | ~300–500 MB |
| Login Log (S-02) | ~5 MB |
| Financial Hash (S-11) | ~10 MB |
| DB Backups — 30 ngày gần nhất (S-12) | ~1.5–3 GB |
| **Tổng** | **~2–4 GB** |

> **💰 Chi phí phần cứng tăng thêm: 0–50.000đ/tháng**
> Chỉ cần nâng SSD từ 20GB → 25GB nếu VPS quá nhỏ. Phần lớn VPS đã có 25–40GB.

---

## 3. Bảng So Sánh Tổng Hợp

| | KB A — Nền Tảng | KB B — Khuyến Nghị | KB C — Toàn Diện |
|---|:---:|:---:|:---:|
| **Số giải pháp** | 3 | 8 | 13 |
| **CPU tăng thêm** | ~0% | ~2–5% | ~5–10% |
| **RAM tăng thêm** | 0 | 0 | 0 |
| **Storage tăng/năm** | ~500 MB | ~500 MB | ~2.5 GB |
| **Cần nâng VPS?** | ❌ Không | ❌ Không | ❌ Không* |
| **Chi phí HW thêm** | **0đ** | **0đ** | **~0đ** |
| **Bảo mật** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Giám sát NV** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Chống phá hoại** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Thời gian implement** | ~4–6 giờ | ~10–16 giờ | ~20–30 giờ |

> *\*Lưu ý: Kịch Bản C chỉ cần đảm bảo SSD ≥ 25GB. Nếu backup lưu remote (cloud/NAS) thì SSD không cần tăng.*

---

## 4. Kết Luận

> [!IMPORTANT]
> **Chi phí phần cứng tăng thêm gần như bằng 0** cho cả 3 kịch bản. Lý do: TMQ Express là hệ thống quy mô nhỏ (~5–15 NV, ~5.000 request/ngày). Tất cả 13 giải pháp bảo mật đề xuất đều là **software-level** — chỉ tốn thêm storage cho audit log và backup, không yêu cầu nâng cấu hình server.

> [!TIP]
> **Chi phí thực sự nằm ở thời gian phát triển (implement)**, không phải phần cứng. Khuyến nghị chọn **Kịch Bản B** (8 giải pháp) — cân bằng tốt nhất giữa bảo mật và effort.

### So sánh nhanh chi phí:

| Loại chi phí | KB A | KB B | KB C |
|---|---|---|---|
| Phần cứng thêm | 0đ | 0đ | 0đ |
| Thời gian dev | ~4–6h | ~10–16h | ~20–30h |
| **ROI** | Tốt | **Tốt nhất** | Tốt nhưng tốn effort |
