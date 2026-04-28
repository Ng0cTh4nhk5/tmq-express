-- AlterTable
ALTER TABLE "bien_nhan" ADD COLUMN     "hang_hoa_json" JSONB,
ALTER COLUMN "ten_hang_hoa" DROP NOT NULL,
ALTER COLUMN "so_luong" DROP DEFAULT;
