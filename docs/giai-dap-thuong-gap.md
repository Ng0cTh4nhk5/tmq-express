# Câu Hỏi Thường Gặp — TMQ Express ERP

> **Phiên bản tài liệu:** 1.1  
> **Cập nhật lần cuối:** Tháng 06/2026

---

## Mục Lục

1. [Đăng Nhập & Tài Khoản](#1-đăng-nhập--tài-khoản)
2. [Biên Nhận (Vận Đơn)](#2-biên-nhận-vận-đơn)
3. [Hình Thức Giao Hàng](#3-hình-thức-giao-hàng)
4. [Vận Chuyển](#4-vận-chuyển)
5. [Thu Hộ COD & Cước Nhận](#5-thu-hộ-cod--cước-nhận)
6. [Tài Chính & Báo Cáo](#6-tài-chính--báo-cáo)
7. [In Ấn & Xuất File](#7-in-ấn--xuất-file)
8. [Sự Cố Thường Gặp](#8-sự-cố-thường-gặp)
9. [Tra Cứu Công Khai](#9-tra-cứu-công-khai)

---

## 1. Đăng Nhập & Tài Khoản

**Q: Tôi quên mật khẩu, phải làm sao?**  
A: Liên hệ Quản trị viên (Admin) để được đặt lại mật khẩu. Sau khi đặt lại, bạn sẽ được cấp mật khẩu tạm thời. Khi đăng nhập lần tiếp theo, hệ thống sẽ yêu cầu bạn đổi ngay sang mật khẩu mới.

---

**Q: Tôi đăng nhập thấy thông báo "Tài khoản bị khóa"?**  
A: Có 2 trường hợp:
- **Quản trị viên chủ động khóa** — Liên hệ Admin để được mở khóa.
- **Hệ thống tự khóa do nhập sai mật khẩu quá nhiều lần** — Liên hệ Admin để được "Mở khóa" (đây là thao tác riêng, khác với việc kích hoạt lại tài khoản thông thường).

---

**Q: Hệ thống bắt tôi đổi mật khẩu ngay khi vừa đăng nhập?**  
A: Đây là bình thường với tài khoản mới hoặc vừa được đặt lại mật khẩu. Hãy đổi mật khẩu (tối thiểu 6 ký tự, phải khác mật khẩu cũ) rồi mới sử dụng được hệ thống.

---

**Q: Tôi không thấy menu Quản trị (Nhân viên, Văn phòng, Chành)?**  
A: Các menu này chỉ dành cho **Quản trị viên (Admin)**. Nếu bạn là Nhân viên (Staff), bạn sẽ không thấy các mục này — đây là thiết kế phân quyền của hệ thống.

---

**Q: Làm sao đổi mật khẩu khi không bị bắt buộc?**  
A: Nhấn vào **tên người dùng** ở góc trên phải màn hình → chọn **Đổi mật khẩu**. Hoặc nhấn nút **Đổi mật khẩu** ở cuối thanh menu bên trái.

---

## 2. Biên Nhận (Vận Đơn)

**Q: Tôi tạo biên nhận nhầm thông tin, có sửa được không?**  
A: Có. Nhấn vào biên nhận trong danh sách → Nhấn **✏️ Sửa**. Tuy nhiên, một số thông tin có thể bị khóa nếu hàng đã được xuất đi. Nếu không sửa được, liên hệ Quản trị viên.

---

**Q: Tôi tạo biên nhận nhầm hoàn toàn, có xóa được không?**  
A: Chỉ **Quản trị viên** mới xóa được, và chỉ khi biên nhận **chưa có gì xảy ra** (chưa giao xe, chưa thu tiền). Liên hệ Quản trị viên để xóa.

---

**Q: Mã biên nhận được tạo như thế nào?**  
A: Mã được hệ thống tự tạo theo dạng `VPGVPN-XXXX`. Ví dụ `SGCT-0001` = gửi từ Sài Gòn đến Cần Thơ, số thứ tự 0001. Bạn không tự chọn mã được.

---

**Q: Tôi chọn "Chưa thu" (cước nhận) nhưng lại muốn đổi thành "Đã thu"?**  
A: Nhấn **✏️ Sửa** biên nhận → Thay đổi hình thức thu cước. Lưu ý: nếu đã có phiếu cước nhận được tạo, cần Quản trị viên can thiệp.

---

**Q: Tìm kiếm biên nhận nhanh nhất bằng cách nào?**  
A: Gõ trực tiếp vào **ô tìm kiếm** ở đầu danh sách — hỗ trợ tìm theo mã biên nhận, tên người gửi/nhận, hoặc số điện thoại. Kết quả hiển thị ngay khi gõ.

---

**Q: Tôi muốn in biên nhận lại nhưng đã lưu rồi?**  
A: Nhấn vào biên nhận trong danh sách → Nhấn **In** (🖨️) ở góc trên khung chi tiết bên phải. Có thể in lại bất kỳ lúc nào.

---

## 3. Hình Thức Giao Hàng

**Q: "Hình thức giao hàng" là gì? Tôi phải chọn gì?**  
A: Khi tạo biên nhận, bạn cần chọn **cách giao hàng đến tay người nhận** tại văn phòng đích:

| Lựa chọn | Ý nghĩa | Dùng khi nào |
|---|---|---|
| 🏠 **Khách tự đến lấy** | Người nhận sẽ đến văn phòng nhận hàng tự lấy | Khách đã hẹn sẽ ra lấy |
| 📞 **Gọi điện báo khách** | Nhân viên gọi điện thông báo, khách ra lấy hoặc hẹn giao | Phổ biến nhất |
| 🚐 **Giao tận nơi** | Nhân viên mang hàng đến địa chỉ người nhận | Giao hàng tận nhà |

---

**Q: Chọn sai Hình thức giao có sao không?**  
A: Có ảnh hưởng đến luồng xử lý bên trong hệ thống. Ví dụ, nếu chọn "Khách tự đến lấy" mà khách không ra lấy, hệ thống không có bước "Đang giao" để theo dõi. Nên chọn đúng theo thực tế. Nếu chọn sai, nhấn **✏️ Sửa** biên nhận để đổi lại (chỉ khi hàng chưa về kho đích).

---

**Q: Tôi chọn "Giao tận nơi" nhưng khách không có ở nhà, phải làm gì?**  
A: Giữ nguyên biên nhận ở trạng thái "Đang giao". Liên hệ lại khách hàng để hẹn giờ giao khác. Khi giao thành công, mới nhấn **Khách đã nhận**.

---

**Q: Tại sao hàng về kho mà hệ thống nhảy thẳng sang "Khách đã nhận" mà không qua bước báo khách?**  
A: Vì biên nhận được tạo với hình thức "Khách tự đến lấy". Với hình thức này, hàng về kho là coi như khách có thể đến lấy ngay — hệ thống không cần bước báo thêm. Nếu thực tế khác, liên hệ Quản trị viên.

---

## 4. Vận Chuyển

**Q: Tôi giao xe nhầm một biên nhận, có hoàn tác được không?**  
A: Hệ thống **không hỗ trợ hoàn tác** thao tác giao xe. Liên hệ Quản trị viên để xử lý nếu thực sự cần thiết.

---

**Q: Hàng đã đến kho thực tế nhưng trên hệ thống vẫn hiện "Đang đến"?**  
A: Nhân viên VP nhận cần vào **Giao nhận hàng** → Tab **Đang đến** → Chọn biên nhận → **Xác nhận đến kho**. Hệ thống không tự cập nhật bước này.

---

**Q: Tôi không thấy hàng nào trong tab "Đang đến" dù xe đã về?**  
A: Kiểm tra:
1. Đã lọc đúng **VP nhận** chưa (mặc định hiển thị theo VP đang đăng nhập)?
2. Biên nhận đã được **Giao xe** từ VP gửi chưa? Nếu chưa, nhân viên VP gửi cần xác nhận giao xe trước.

---

**Q: Có thể thấy hàng của tất cả văn phòng không?**  
A: Quản trị viên có thể xem và lọc tất cả văn phòng. Nhân viên chỉ thấy hàng liên quan đến văn phòng của mình.

---

## 5. Thu Hộ COD & Cước Nhận

> **COD** (Thu hộ) là dịch vụ thu tiền hàng hóa hộ người gửi khi giao đến tay người nhận.  
> **Cước nhận** là tiền phí vận chuyển do người nhận thanh toán.

**Q: Tôi xác nhận "Khách đã nhận" nhưng COD không tự động thu?**  
A: COD chỉ tự động thu khi giao trực tiếp (không qua chành). Nếu giao qua chành, cần thao tác thủ công:  
**Thu hộ COD** → Tìm biên nhận → **Chành đã thu** → sau đó **Đã thu** khi nhận tiền từ chành.

---

**Q: Tôi xác nhận "Khách đã nhận" nhưng thấy cảnh báo "Cần thu thủ công"?**  
A: Hệ thống cố tự thu nhưng gặp sự cố. Hãy vào **Thu hộ COD** (hoặc **Cước nhận**) → Tìm biên nhận tương ứng → Nhấn nút **Thu** để thu thủ công. Nếu không tìm thấy, liên hệ Quản trị viên.

---

**Q: Tôi lập phiếu chuyển COD nhầm, có hủy được không?**  
A: Hệ thống hiện **không có chức năng hủy phiếu**. Liên hệ Quản trị viên xử lý. Nên kiểm tra kỹ danh sách trước khi xác nhận lập phiếu.

---

**Q: Cước nhận không xuất hiện để thu dù đã xác nhận "Khách đã nhận"?**  
A: Kiểm tra lại biên nhận — hình thức thu cước phải là **"Chưa thu"** khi tạo biên nhận. Nếu lúc tạo chọn "Đã thu" hoặc "Công nợ", sẽ không sinh ra cước nhận.

---

**Q: Tại sao tổng tiền trong phiếu chuyển khác với số tôi tính tay?**  
A: Phiếu tổng hợp đúng theo danh sách biên nhận bạn đã chọn. Vào tab **Phiếu chuyển COD/Cước** để xem chi tiết từng biên nhận trong phiếu.

---

**Q: VP Nhận lập phiếu rồi, VP Gửi cần làm gì để xác nhận?**  
A: Sau khi VP Nhận **xác nhận đã gửi tiền** và VP Nhận thực sự chuyển tiền về, VP Gửi vào tab **Phiếu chuyển** → tìm phiếu → nhấn **Xác nhận đã nhận tiền**. Cần thực hiện theo đúng thứ tự này.

---

## 6. Tài Chính & Báo Cáo

**Q: Doanh thu trên báo cáo không khớp với số tôi tính?**  
A: Báo cáo tính theo **ngày tạo biên nhận** và theo **VP gửi**. Kiểm tra bộ lọc:
- Khoảng ngày có đúng không?
- Đang lọc theo VP nào hay "Tất cả"?
- Nhóm theo ngày/tuần/tháng/năm?

---

**Q: Cột "Chênh lệch" trong Bảng kê công nợ màu đỏ nghĩa là gì?**  
A: Có bất thường — **giá trị hóa đơn điện tử đã xuất cao hơn cước thực tế**. Cần kiểm tra lại hóa đơn đã xuất cho khách hàng đó trong tháng. Đây là tính năng phát hiện sai sót kế toán.

---

**Q: Tôi là Quản trị viên nhưng không thấy menu "Bảng kê HĐDT" và "Bảng kê công nợ"?**  
A: Kiểm tra lại tài khoản — vai trò (role) có đúng là **admin** không? Nếu đúng mà vẫn không thấy, liên hệ bộ phận kỹ thuật.

---

**Q: Làm sao ghi nhận khi khách doanh nghiệp đã trả nợ cuối tháng?**  
A: Vào **Bảng kê công nợ** → Chọn tháng → Nhấn **Xem** → Nhấn vào tên đối tượng khách hàng → Chọn các biên nhận đã thanh toán → Nhấn **Xác nhận thanh toán** → Chọn hình thức (Tiền mặt / Chuyển khoản) → Xác nhận.

---

## 7. In Ấn & Xuất File

**Q: Ngoài in PDF, có thể xuất sổ biên nhận ra file Excel không?**  
A: Có. Vào trang **Biên nhận** → thiết lập bộ lọc theo nhu cầu → nhấn nút **Xuất Excel** (bên cạnh nút "In số BN") → File Excel tự tải về máy.

---

**Q: Tôi muốn in hoặc xuất báo cáo công nợ ra file để gửi khách hàng?**  
A: Vào **Bảng kê công nợ** → Chọn tháng/năm → Xem → Nhấn nút **Xuất Excel** hoặc **Xuất PDF** ở góc trên bảng. File tải về máy và có thể gửi qua email hoặc Zalo.

---

**Q: Hộp thoại in không xuất hiện khi tôi nhấn nút In?**  
A: Trình duyệt có thể đang chặn cửa sổ pop-up. Hãy kiểm tra:
1. Thanh địa chỉ trình duyệt có hiện biểu tượng bị chặn không? Nhấn vào đó và chọn "Cho phép pop-up"
2. Thử nhấn **In** lại sau khi cho phép
3. Nếu vẫn không được, thử dùng trình duyệt khác (Chrome hoặc Cốc Cốc)

---

**Q: Tôi nhấn In nhưng bản in ra bị cắt mất chữ hoặc lệch lề?**  
A: Trong hộp thoại in của trình duyệt, thử:
- Chọn khổ giấy **A4**
- Tắt tùy chọn "In đầu trang/chân trang" (Headers and footers)
- Chỉnh tỉ lệ về **100%** hoặc **Vừa với trang**

---

## 8. Sự Cố Thường Gặp

**Q: Hệ thống tự đăng xuất, tôi cần đăng nhập lại?**  
A: Bình thường — hệ thống tự đăng xuất sau một thời gian không hoạt động để bảo mật. Chỉ cần đăng nhập lại bình thường. Công việc đang làm dở có thể bị mất nếu chưa nhấn Lưu — hãy lưu thường xuyên.

---

**Q: Trang web hiện màn hình trắng hoặc không tải được?**  
A: Thử lần lượt:
1. Nhấn **F5** (hoặc nút làm mới của trình duyệt) để tải lại trang
2. Xóa cache trình duyệt: nhấn **Ctrl + Shift + Delete** → chọn xóa dữ liệu tạm → thử lại
3. Kiểm tra kết nối mạng internet
4. Nếu vẫn lỗi, liên hệ Quản trị viên

---

**Q: Tôi thao tác xong nhưng dữ liệu không cập nhật, danh sách vẫn như cũ?**  
A: Nhấn **F5** để làm mới trang, hoặc nhấn nút **làm mới** (nếu có) trong giao diện. Nếu vẫn không thấy thay đổi sau 30 giây, liên hệ Quản trị viên.

---

**Q: Tài khoản bị khóa dù tôi không làm gì sai?**  
A: Có thể hệ thống tự khóa do ai đó nhập sai mật khẩu của bạn nhiều lần liên tiếp (bảo vệ tài khoản tự động). Liên hệ **Quản trị viên** để mở khóa. Sau khi mở khóa, hãy đổi mật khẩu ngay.

---

## 9. Tra Cứu Tình Trạng Đơn Hàng (Dành Cho Khách)

**Q: Khách hàng làm thế nào để tự xem tình trạng đơn hàng?**  
A: Khách hàng chỉ cần dùng điện thoại quét (scan) mã QR có in trên phiếu giao hàng. Để bảo mật thông tin và tránh nhầm lẫn giữa các đơn hàng của nhiều ngày khác nhau, hệ thống không hỗ trợ tìm kiếm bằng cách gõ mã trực tiếp trên trang web.

---

**Q: Khách muốn nhờ nhân viên kiểm tra hộ hoặc muốn xin link để tự theo dõi?**  
A: 
- Nhân viên có thể tìm hộ trên máy tính bằng cách vào mục **Biên nhận** → gõ tên hoặc số điện thoại khách để xem tình trạng hàng.
- Nếu khách muốn xin link tự xem, nhân viên có thể bấm vào biên nhận đó → copy đường link trang tra cứu rồi gửi qua Zalo cho khách.

---

*Tài liệu được cập nhật vào tháng 06/2026*  
*Hệ thống TMQ Express ERP*
