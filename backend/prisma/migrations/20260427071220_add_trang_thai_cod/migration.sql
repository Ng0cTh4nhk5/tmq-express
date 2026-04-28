-- CreateEnum
CREATE TYPE "TrangThaiCOD" AS ENUM ('khong_co', 'cho_thu', 'da_thu', 'da_chuyen', 'da_tra');

-- AlterTable
ALTER TABLE "bien_nhan" ADD COLUMN     "trang_thai_cod" "TrangThaiCOD" NOT NULL DEFAULT 'khong_co';

-- CreateIndex
CREATE INDEX "bien_nhan_trang_thai_cod_idx" ON "bien_nhan"("trang_thai_cod");
