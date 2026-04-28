/*
  Warnings:

  - You are about to drop the column `so_cccd` on the `bien_nhan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bien_nhan" DROP COLUMN "so_cccd",
ADD COLUMN     "so_cccd_gui" VARCHAR(20),
ADD COLUMN     "so_cccd_nhan" VARCHAR(20);
