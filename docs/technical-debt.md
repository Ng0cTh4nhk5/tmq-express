# TMQ Express — Technical Debt

## ✅ TD-001: Tự lưu khách hàng mới khi tạo biên nhận
- **Mức độ:** Trung bình
- **Trạng thái:** ✅ Đã giải quyết (2026-04-03)
- **Mô tả:** Khi tạo biên nhận, nếu người gửi/người nhận chưa tồn tại trong bảng `KhachHang`, hệ thống nên tự động tạo record KH mới (upsert). Hiện tại thông tin chỉ lưu dưới dạng text trong bảng `BienNhan`, không liên kết với `KhachHang`.
- **Giải pháp đã triển khai:**
  - Thêm enum `LoaiKH` (`doanh_nghiep`, `ca_nhan`) vào schema + field `loai_kh` cho model `KhachHang`
  - Thêm helper `autoCreateKhachHang()` trong `bien-nhan.service.js` — lookup bằng SĐT, tự tạo KH mới nếu có SĐT + chưa tồn tại
  - Quy tắc: Có SĐT → tạo KH (loại `ca_nhan`). Không SĐT → vãng lai, bỏ qua
  - Response API trả thêm `auto_created_kh[]`, frontend hiện toast thông báo
  - Form KH thêm dropdown "Loại KH", danh sách KH hiện badge DN/CN
- **Ngày ghi nhận:** 2026-04-03

---

## ✅ TD-002: Autocomplete KH tìm theo SĐT + thêm INDEX
- **Mức độ:** Thấp
- **Trạng thái:** ✅ Đã giải quyết (2026-04-03)
- **Mô tả:** Hiện tại `/khach-hang/autocomplete` chỉ tìm theo `ten_don_vi`. Cần mở rộng tìm thêm theo `dien_thoai` để nhân viên có thể gõ SĐT để tra nhanh KH khi tạo biên nhận.
- **Giải pháp đã triển khai:**
  1. Thêm `@@index([dien_thoai])` trong model `KhachHang` (migration `add_loai_kh_and_dien_thoai_index`)
  2. Backend `autocompleteKhachHang` đã tìm theo SĐT (có sẵn) ✅
  3. Frontend autocomplete dropdown hiện SĐT bên cạnh tên đơn vị (`#option` custom slot)
- **Ngày ghi nhận:** 2026-04-03

---

## ✅ TD-003: Race condition trong sinh mã biên nhận
- **Mức độ:** Cao
- **Trạng thái:** ✅ Đã giải quyết (2026-04-05)
- **Mô tả:** `generateBienNhanCode()` sinh mã trước rồi mới gọi `prisma.create()` — 2 request đồng thời có thể nhận cùng mã → unique violation. Retry loop trong `generateCode()` cũng không hoạt động vì `return` nằm trước try/catch.
- **Giải pháp đã triển khai:**
  - Refactor `createBienNhan()` dùng `createWithCode()` pattern — gộp sinh mã + INSERT trong cùng hàm, retry on P2002
  - Xóa `generateBienNhanCode()` không còn sử dụng
- **Ngày ghi nhận:** 2026-04-05

---

## ✅ TD-004: Update BN dùng blacklist thay vì whitelist
- **Mức độ:** Cao (Bảo mật)
- **Trạng thái:** ✅ Đã giải quyết (2026-04-05)
- **Mô tả:** `updateBienNhan()` destructure `{ ma_so, ...rest }` rồi spread `rest` vào Prisma — attacker có thể inject `van_phong_gui_id`, `trang_thai`, `trang_thai_thu` qua request body.
- **Giải pháp đã triển khai:**
  - Whitelist 17 fields cụ thể được phép sửa (`ALLOWED_UPDATE_FIELDS`)
  - Thêm `additionalProperties: false` vào POST BN + POST KH request schemas
- **Ngày ghi nhận:** 2026-04-05

---

## ✅ TD-005: Date mutation bug trong bảng kê
- **Mức độ:** Trung bình
- **Trạng thái:** ✅ Đã giải quyết (2026-04-05)
- **Mô tả:** `getBienNhanCho()` dùng `d.setHours(0,0,0,0)` rồi `d.setHours(23,59,59,999)` trên cùng 1 Date object — cả `gte` lẫn `lte` đều = 23:59:59, không lọc được BN theo ngày.
- **Giải pháp đã triển khai:** Tạo 2 Date objects riêng biệt (`start`, `end`)
- **Ngày ghi nhận:** 2026-04-05

---

## ✅ TD-006: huyPhieuChi thiếu check đã hủy
- **Mức độ:** Thấp
- **Trạng thái:** ✅ Đã giải quyết (2026-04-05)
- **Mô tả:** `huyPhieuChi()` không kiểm tra `da_huy` trước khi hủy, khác với `huyPhieuThu()` có check.
- **Giải pháp đã triển khai:** Thêm check `if (pc.da_huy) throw Error('Phiếu đã hủy trước đó')`
- **Ngày ghi nhận:** 2026-04-05

