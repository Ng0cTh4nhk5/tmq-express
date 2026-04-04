-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'staff', 'accountant');

-- CreateEnum
CREATE TYPE "TrangThai" AS ENUM ('cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach', 'khach_da_nhan');

-- CreateEnum
CREATE TYPE "TrangThaiThu" AS ENUM ('da_thu', 'chua_thu', 'cong_no');

-- CreateEnum
CREATE TYPE "HinhThucGiao" AS ENUM ('tan_noi', 'goi_dien', 'tu_toi');

-- CreateEnum
CREATE TYPE "HinhThucThanhToan" AS ENUM ('tien_mat', 'chuyen_khoan');

-- CreateEnum
CREATE TYPE "TrangThaiCongNo" AS ENUM ('chua_thu', 'da_thu', 'qua_han');

-- CreateEnum
CREATE TYPE "PhuongThucCapNhat" AS ENUM ('qr_scan', 'manual', 'batch');

-- CreateTable
CREATE TABLE "van_phong" (
    "id" SERIAL NOT NULL,
    "ma_vp" VARCHAR(10) NOT NULL,
    "ten" VARCHAR(200) NOT NULL,
    "dia_chi" VARCHAR(500),
    "dien_thoai" VARCHAR(20),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "van_phong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nhan_vien" (
    "id" SERIAL NOT NULL,
    "ma_nv" VARCHAR(20) NOT NULL,
    "ten" VARCHAR(200) NOT NULL,
    "van_phong_id" INTEGER NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'staff',
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "require_password_change" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nhan_vien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "khach_hang" (
    "id" SERIAL NOT NULL,
    "ma_kh" VARCHAR(20) NOT NULL,
    "ten_don_vi" VARCHAR(300) NOT NULL,
    "nguoi_lien_he" VARCHAR(200),
    "dien_thoai" VARCHAR(20),
    "dia_chi" VARCHAR(500),
    "email" VARCHAR(200),
    "ma_so_thue" VARCHAR(20),
    "ghi_chu" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "khach_hang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bien_nhan" (
    "id" SERIAL NOT NULL,
    "ma_so" VARCHAR(30) NOT NULL,
    "ngay_nhan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "van_phong_gui_id" INTEGER NOT NULL,
    "van_phong_nhan_id" INTEGER NOT NULL,
    "nhan_vien_nhap_id" INTEGER NOT NULL,
    "don_vi_gui" VARCHAR(300),
    "nguoi_gui" VARCHAR(200),
    "dien_thoai_gui" VARCHAR(20),
    "dia_chi_gui" VARCHAR(500),
    "don_vi_nhan" VARCHAR(300),
    "nguoi_nhan" VARCHAR(200),
    "dien_thoai_nhan" VARCHAR(20),
    "dia_chi_nhan" VARCHAR(500),
    "so_cccd" VARCHAR(20),
    "ten_hang_hoa" VARCHAR(500) NOT NULL,
    "gia_tri_hang" DECIMAL(15,0),
    "trong_luong" DECIMAL(10,2),
    "thu_ho" DECIMAL(15,0) DEFAULT 0,
    "gia_cuoc" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "trang_thai" "TrangThai" NOT NULL DEFAULT 'cho_vc',
    "trang_thai_thu" "TrangThaiThu" NOT NULL DEFAULT 'da_thu',
    "hang_hu_khong_den" BOOLEAN NOT NULL DEFAULT false,
    "can_xuat_hddt" BOOLEAN NOT NULL DEFAULT false,
    "da_vao_bang_ke" BOOLEAN NOT NULL DEFAULT false,
    "hinh_thuc_giao" "HinhThucGiao" NOT NULL DEFAULT 'tan_noi',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bien_nhan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lich_su_trang_thai" (
    "id" SERIAL NOT NULL,
    "bien_nhan_id" INTEGER NOT NULL,
    "trang_thai_cu" "TrangThai",
    "trang_thai_moi" "TrangThai" NOT NULL,
    "nhan_vien_id" INTEGER NOT NULL,
    "phuong_thuc" "PhuongThucCapNhat" NOT NULL DEFAULT 'manual',
    "ghi_chu" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lich_su_trang_thai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bang_ke" (
    "id" SERIAL NOT NULL,
    "ma_bang_ke" VARCHAR(30) NOT NULL,
    "ngay_xuat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "so_bien_nhan" INTEGER NOT NULL DEFAULT 0,
    "tong_cuoc" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "ten_file" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bang_ke_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bang_ke_chi_tiet" (
    "id" SERIAL NOT NULL,
    "bang_ke_id" INTEGER NOT NULL,
    "bien_nhan_id" INTEGER NOT NULL,

    CONSTRAINT "bang_ke_chi_tiet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phieu_thu" (
    "id" SERIAL NOT NULL,
    "ma_phieu" VARCHAR(20) NOT NULL,
    "ngay_thu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doi_tuong" VARCHAR(300) NOT NULL,
    "ly_do" VARCHAR(500) NOT NULL,
    "so_tien" DECIMAL(15,0) NOT NULL,
    "hinh_thuc" "HinhThucThanhToan" NOT NULL DEFAULT 'tien_mat',
    "van_phong_id" INTEGER NOT NULL,
    "nhan_vien_id" INTEGER NOT NULL,
    "bien_nhan_id" INTEGER,
    "da_huy" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phieu_thu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phieu_chi" (
    "id" SERIAL NOT NULL,
    "ma_phieu" VARCHAR(20) NOT NULL,
    "ngay_chi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoi_nhan" VARCHAR(300) NOT NULL,
    "ly_do" VARCHAR(500) NOT NULL,
    "so_tien" DECIMAL(15,0) NOT NULL,
    "hinh_thuc" "HinhThucThanhToan" NOT NULL DEFAULT 'tien_mat',
    "van_phong_id" INTEGER NOT NULL,
    "nhan_vien_id" INTEGER NOT NULL,
    "da_huy" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phieu_chi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cong_no" (
    "id" SERIAL NOT NULL,
    "bien_nhan_id" INTEGER NOT NULL,
    "doi_tuong" VARCHAR(300) NOT NULL,
    "so_tien_no" DECIMAL(15,0) NOT NULL,
    "ngay_phat_sinh" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trang_thai" "TrangThaiCongNo" NOT NULL DEFAULT 'chua_thu',
    "ngay_thu" TIMESTAMP(3),
    "phieu_thu_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cong_no_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "van_phong_ma_vp_key" ON "van_phong"("ma_vp");

-- CreateIndex
CREATE UNIQUE INDEX "nhan_vien_ma_nv_key" ON "nhan_vien"("ma_nv");

-- CreateIndex
CREATE UNIQUE INDEX "nhan_vien_username_key" ON "nhan_vien"("username");

-- CreateIndex
CREATE UNIQUE INDEX "khach_hang_ma_kh_key" ON "khach_hang"("ma_kh");

-- CreateIndex
CREATE UNIQUE INDEX "bien_nhan_ma_so_key" ON "bien_nhan"("ma_so");

-- CreateIndex
CREATE INDEX "bien_nhan_van_phong_gui_id_idx" ON "bien_nhan"("van_phong_gui_id");

-- CreateIndex
CREATE INDEX "bien_nhan_van_phong_nhan_id_idx" ON "bien_nhan"("van_phong_nhan_id");

-- CreateIndex
CREATE INDEX "bien_nhan_trang_thai_idx" ON "bien_nhan"("trang_thai");

-- CreateIndex
CREATE INDEX "bien_nhan_ngay_nhan_idx" ON "bien_nhan"("ngay_nhan");

-- CreateIndex
CREATE INDEX "bien_nhan_can_xuat_hddt_da_vao_bang_ke_idx" ON "bien_nhan"("can_xuat_hddt", "da_vao_bang_ke");

-- CreateIndex
CREATE INDEX "lich_su_trang_thai_bien_nhan_id_idx" ON "lich_su_trang_thai"("bien_nhan_id");

-- CreateIndex
CREATE UNIQUE INDEX "bang_ke_ma_bang_ke_key" ON "bang_ke"("ma_bang_ke");

-- CreateIndex
CREATE UNIQUE INDEX "bang_ke_chi_tiet_bang_ke_id_bien_nhan_id_key" ON "bang_ke_chi_tiet"("bang_ke_id", "bien_nhan_id");

-- CreateIndex
CREATE UNIQUE INDEX "phieu_thu_ma_phieu_key" ON "phieu_thu"("ma_phieu");

-- CreateIndex
CREATE INDEX "phieu_thu_ngay_thu_idx" ON "phieu_thu"("ngay_thu");

-- CreateIndex
CREATE INDEX "phieu_thu_van_phong_id_idx" ON "phieu_thu"("van_phong_id");

-- CreateIndex
CREATE UNIQUE INDEX "phieu_chi_ma_phieu_key" ON "phieu_chi"("ma_phieu");

-- CreateIndex
CREATE INDEX "phieu_chi_ngay_chi_idx" ON "phieu_chi"("ngay_chi");

-- CreateIndex
CREATE INDEX "phieu_chi_van_phong_id_idx" ON "phieu_chi"("van_phong_id");

-- CreateIndex
CREATE INDEX "cong_no_trang_thai_idx" ON "cong_no"("trang_thai");

-- CreateIndex
CREATE INDEX "cong_no_ngay_phat_sinh_idx" ON "cong_no"("ngay_phat_sinh");

-- AddForeignKey
ALTER TABLE "nhan_vien" ADD CONSTRAINT "nhan_vien_van_phong_id_fkey" FOREIGN KEY ("van_phong_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_van_phong_gui_id_fkey" FOREIGN KEY ("van_phong_gui_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_van_phong_nhan_id_fkey" FOREIGN KEY ("van_phong_nhan_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_nhan_vien_nhap_id_fkey" FOREIGN KEY ("nhan_vien_nhap_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_trang_thai" ADD CONSTRAINT "lich_su_trang_thai_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lich_su_trang_thai" ADD CONSTRAINT "lich_su_trang_thai_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bang_ke_chi_tiet" ADD CONSTRAINT "bang_ke_chi_tiet_bang_ke_id_fkey" FOREIGN KEY ("bang_ke_id") REFERENCES "bang_ke"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bang_ke_chi_tiet" ADD CONSTRAINT "bang_ke_chi_tiet_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_thu" ADD CONSTRAINT "phieu_thu_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_thu" ADD CONSTRAINT "phieu_thu_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phieu_chi" ADD CONSTRAINT "phieu_chi_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cong_no" ADD CONSTRAINT "cong_no_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cong_no" ADD CONSTRAINT "cong_no_phieu_thu_id_fkey" FOREIGN KEY ("phieu_thu_id") REFERENCES "phieu_thu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
