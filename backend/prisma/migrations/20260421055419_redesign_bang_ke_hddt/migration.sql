/*
  Warnings:

  - Added the required column `ngay` to the `bang_ke_chi_tiet` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bang_ke_chi_tiet" DROP CONSTRAINT "bang_ke_chi_tiet_bang_ke_id_fkey";

-- DropForeignKey
ALTER TABLE "bang_ke_chi_tiet" DROP CONSTRAINT "bang_ke_chi_tiet_bien_nhan_id_fkey";

-- DropIndex
DROP INDEX "bang_ke_chi_tiet_bang_ke_id_bien_nhan_id_key";

-- AlterTable
ALTER TABLE "bang_ke" ALTER COLUMN "bien_so_xe" SET DATA TYPE VARCHAR(30);

-- AlterTable
ALTER TABLE "bang_ke_chi_tiet" ADD COLUMN     "dia_chi_gui" VARCHAR(500),
ADD COLUMN     "gia_cuoc" DECIMAL(15,0) NOT NULL DEFAULT 0,
ADD COLUMN     "hang_hoa" VARCHAR(300),
ADD COLUMN     "ngay" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "nguoi_gui" VARCHAR(300),
ADD COLUMN     "stt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tuyen" VARCHAR(30),
ALTER COLUMN "bien_nhan_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "doanh_nghiep_hddt" (
    "id" SERIAL NOT NULL,
    "ten" VARCHAR(300) NOT NULL,
    "ma_so_thue" VARCHAR(20),
    "dia_chi" VARCHAR(500),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doanh_nghiep_hddt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doanh_nghiep_hddt_active_idx" ON "doanh_nghiep_hddt"("active");

-- CreateIndex
CREATE INDEX "bang_ke_chi_tiet_bang_ke_id_idx" ON "bang_ke_chi_tiet"("bang_ke_id");

-- AddForeignKey
ALTER TABLE "bang_ke_chi_tiet" ADD CONSTRAINT "bang_ke_chi_tiet_bang_ke_id_fkey" FOREIGN KEY ("bang_ke_id") REFERENCES "bang_ke"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bang_ke_chi_tiet" ADD CONSTRAINT "bang_ke_chi_tiet_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
