-- CreateEnum
CREATE TYPE "LoaiKH" AS ENUM ('doanh_nghiep', 'ca_nhan');

-- AlterTable
ALTER TABLE "khach_hang" ADD COLUMN     "loai_kh" "LoaiKH" NOT NULL DEFAULT 'ca_nhan';

-- CreateIndex
CREATE INDEX "khach_hang_dien_thoai_idx" ON "khach_hang"("dien_thoai");
