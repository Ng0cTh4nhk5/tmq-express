/*
  Warnings:

  - You are about to drop the column `dia_chi` on the `khach_hang` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bien_nhan" ADD COLUMN     "chanh_id" INTEGER,
ADD COLUMN     "dia_chi_giao" VARCHAR(500);

-- AlterTable
ALTER TABLE "khach_hang" DROP COLUMN "dia_chi";

-- CreateIndex
CREATE INDEX "bien_nhan_chanh_id_idx" ON "bien_nhan"("chanh_id");

-- AddForeignKey
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_chanh_id_fkey" FOREIGN KEY ("chanh_id") REFERENCES "chanh"("id") ON DELETE SET NULL ON UPDATE CASCADE;
