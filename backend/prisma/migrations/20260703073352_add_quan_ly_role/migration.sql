-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'quan_ly';

-- DropIndex
DROP INDEX "idx_bien_nhan_dien_thoai_gui_trgm";

-- DropIndex
DROP INDEX "idx_bien_nhan_dien_thoai_nhan_trgm";

-- DropIndex
DROP INDEX "idx_bien_nhan_don_vi_gui_trgm";

-- DropIndex
DROP INDEX "idx_bien_nhan_don_vi_nhan_trgm";

-- DropIndex
DROP INDEX "idx_bien_nhan_nguoi_gui_trgm";

-- DropIndex
DROP INDEX "idx_bien_nhan_nguoi_nhan_trgm";

-- DropIndex
DROP INDEX "idx_doanh_nghiep_ten_trgm";

-- DropIndex
DROP INDEX "idx_khach_hang_nguoi_lien_he_trgm";

-- DropIndex
DROP INDEX "idx_khach_hang_ten_don_vi_trgm";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc" RENAME CONSTRAINT "phieu_chuyen_cuoc_nv_lap_fkey" TO "phieu_chuyen_cuoc_nhan_vien_lap_id_fkey";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc" RENAME CONSTRAINT "phieu_chuyen_cuoc_nv_nhan_fkey" TO "phieu_chuyen_cuoc_nhan_vien_nhan_id_fkey";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc" RENAME CONSTRAINT "phieu_chuyen_cuoc_phieu_chi_fkey" TO "phieu_chuyen_cuoc_phieu_chi_id_fkey";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc" RENAME CONSTRAINT "phieu_chuyen_cuoc_phieu_thu_fkey" TO "phieu_chuyen_cuoc_phieu_thu_id_fkey";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc" RENAME CONSTRAINT "phieu_chuyen_cuoc_vp_gui_fkey" TO "phieu_chuyen_cuoc_van_phong_gui_id_fkey";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc" RENAME CONSTRAINT "phieu_chuyen_cuoc_vp_nhan_fkey" TO "phieu_chuyen_cuoc_van_phong_nhan_id_fkey";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc_chi_tiet" RENAME CONSTRAINT "phieu_chuyen_cuoc_chi_tiet_bn_fkey" TO "phieu_chuyen_cuoc_chi_tiet_bien_nhan_id_fkey";

-- RenameForeignKey
ALTER TABLE "phieu_chuyen_cuoc_chi_tiet" RENAME CONSTRAINT "phieu_chuyen_cuoc_chi_tiet_phieu_fkey" TO "phieu_chuyen_cuoc_chi_tiet_phieu_id_fkey";

-- RenameIndex
ALTER INDEX "bien_nhan_vp_gui_cuoc_nhan_idx" RENAME TO "bien_nhan_van_phong_gui_id_trang_thai_cuoc_nhan_idx";

-- RenameIndex
ALTER INDEX "bien_nhan_vp_nhan_cuoc_nhan_idx" RENAME TO "bien_nhan_van_phong_nhan_id_trang_thai_cuoc_nhan_idx";

-- RenameIndex
ALTER INDEX "phieu_chuyen_cuoc_vp_gui_trang_thai_idx" RENAME TO "phieu_chuyen_cuoc_van_phong_gui_id_trang_thai_idx";

-- RenameIndex
ALTER INDEX "phieu_chuyen_cuoc_vp_nhan_trang_thai_idx" RENAME TO "phieu_chuyen_cuoc_van_phong_nhan_id_trang_thai_idx";
