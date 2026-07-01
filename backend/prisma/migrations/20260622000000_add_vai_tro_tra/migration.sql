-- AddColumn vai_tro_tra to bang_ke_chi_tiet
-- Lưu ai là người trả cước: 'nguoi_gui' | 'nguoi_nhan'
-- Cột này được điền khi tạo bảng kê; null = dữ liệu cũ (mặc định hiểu là nguoi_gui)

ALTER TABLE "bang_ke_chi_tiet" ADD COLUMN "vai_tro_tra" VARCHAR(20);
