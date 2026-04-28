/*
  Warnings:

  - You are about to drop the column `ngay_nhan` on the `bien_nhan` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bien_nhan_ngay_nhan_idx";

-- AlterTable
ALTER TABLE "bien_nhan" DROP COLUMN "ngay_nhan";
