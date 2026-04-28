-- AlterTable
ALTER TABLE "bang_ke" ADD COLUMN     "bien_so_xe" VARCHAR(20);

-- AlterTable
ALTER TABLE "bien_nhan" ADD COLUMN     "don_vi_tinh" VARCHAR(20),
ADD COLUMN     "ngay_bien_nhan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "so_luong" INTEGER DEFAULT 1;

-- CreateIndex
CREATE INDEX "bien_nhan_ngay_bien_nhan_idx" ON "bien_nhan"("ngay_bien_nhan");
