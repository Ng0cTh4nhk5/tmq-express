-- ============================================================
-- TMQ Express — v1.0 Consolidated Migration
-- Gộp từ: init + add_dang_giao_da_giao_chanh_states
--          + add_vai_tro_tra + add_trigram_indexes
-- ============================================================

-- Extension
CREATE SCHEMA IF NOT EXISTS "public";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ENUMs
CREATE TYPE "Role" AS ENUM ('admin', 'staff');

CREATE TYPE "TrangThai" AS ENUM (
  'cho_vc', 'dang_vc', 'da_den_kho', 'da_bao_khach',
  'dang_giao', 'da_giao_chanh', 'khach_da_nhan'
);

CREATE TYPE "TrangThaiThu" AS ENUM ('da_thu', 'chua_thu', 'cong_no');

CREATE TYPE "HinhThucGiao" AS ENUM ('tan_noi', 'goi_dien', 'tu_toi');

CREATE TYPE "HinhThucThanhToan" AS ENUM ('tien_mat', 'chuyen_khoan');

CREATE TYPE "TrangThaiCongNo" AS ENUM ('chua_thu', 'da_thu', 'qua_han');

CREATE TYPE "TrangThaiCOD" AS ENUM (
  'khong_co', 'cho_thu', 'da_thu_chanh', 'da_thu',
  'cho_chuyen_pending', 'da_chuyen', 'da_tra'
);

CREATE TYPE "TrangThaiPhieuChuyen" AS ENUM ('cho_chuyen', 'da_chuyen', 'da_nhan');

CREATE TYPE "TrangThaiCuocNhan" AS ENUM ('cho_thu', 'da_thu', 'cho_chuyen', 'da_nhan');

CREATE TYPE "PhuongThucCapNhat" AS ENUM ('qr_scan', 'manual', 'batch');

CREATE TYPE "LoaiKH" AS ENUM ('doanh_nghiep', 'ca_nhan');

CREATE TYPE "VaiTroCongNo" AS ENUM ('nguoi_gui', 'nguoi_nhan');

-- ============================================================
-- TABLES (Core)
-- ============================================================

CREATE TABLE "van_phong" (
    "id"         SERIAL       NOT NULL,
    "ma_vp"      VARCHAR(10)  NOT NULL,
    "ten"        VARCHAR(200) NOT NULL,
    "dia_chi"    VARCHAR(500),
    "dien_thoai" VARCHAR(20),
    "active"     BOOLEAN      NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "van_phong_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nhan_vien" (
    "id"                     SERIAL       NOT NULL,
    "ma_nv"                  VARCHAR(20)  NOT NULL,
    "ten"                    VARCHAR(200) NOT NULL,
    "van_phong_id"           INTEGER      NOT NULL,
    "role"                   "Role"       NOT NULL DEFAULT 'staff',
    "username"               VARCHAR(100) NOT NULL,
    "password_hash"          VARCHAR(255) NOT NULL,
    "active"                 BOOLEAN      NOT NULL DEFAULT true,
    "require_password_change" BOOLEAN     NOT NULL DEFAULT false,
    "failed_login_count"     INTEGER      NOT NULL DEFAULT 0,
    "locked_until"           TIMESTAMP(3),
    "token_version"          INTEGER      NOT NULL DEFAULT 0,
    "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "nhan_vien_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doanh_nghiep" (
    "id"         SERIAL       NOT NULL,
    "ten"        VARCHAR(300) NOT NULL,
    "ma_so_thue" VARCHAR(20),
    "dia_chi"    VARCHAR(500),
    "dien_thoai" VARCHAR(20),
    "ghi_chu"    TEXT,
    "active"     BOOLEAN      NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "doanh_nghiep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "khach_hang" (
    "id"              SERIAL       NOT NULL,
    "ma_kh"           VARCHAR(20)  NOT NULL,
    "loai_kh"         "LoaiKH"     NOT NULL DEFAULT 'ca_nhan',
    "ten_don_vi"      VARCHAR(300) NOT NULL,
    "nguoi_lien_he"   VARCHAR(200),
    "dien_thoai"      VARCHAR(20),
    "email"           VARCHAR(200),
    "ma_so_thue"      VARCHAR(20),
    "so_cccd"         VARCHAR(20),
    "dia_chi"         VARCHAR(500),
    "ghi_chu"         TEXT,
    "active"          BOOLEAN      NOT NULL DEFAULT true,
    "doanh_nghiep_id" INTEGER,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "khach_hang_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chanh" (
    "id"            SERIAL       NOT NULL,
    "ten"           VARCHAR(200) NOT NULL,
    "dia_chi"       VARCHAR(500),
    "dien_thoai"    VARCHAR(20),
    "nguoi_lien_he" VARCHAR(200),
    "ghi_chu"       TEXT,
    "active"        BOOLEAN      NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chanh_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bien_nhan" (
    "id"                   SERIAL           NOT NULL,
    "ma_so"                VARCHAR(30)      NOT NULL,
    "ngay_bien_nhan"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gio_tao"              VARCHAR(5),
    "van_phong_gui_id"     INTEGER          NOT NULL,
    "van_phong_nhan_id"    INTEGER          NOT NULL,
    "nhan_vien_nhap_id"    INTEGER          NOT NULL,
    "don_vi_gui"           VARCHAR(300),
    "nguoi_gui"            VARCHAR(200),
    "dien_thoai_gui"       VARCHAR(20),
    "dia_chi_gui"          VARCHAR(500),
    "don_vi_nhan"          VARCHAR(300),
    "nguoi_nhan"           VARCHAR(200),
    "dien_thoai_nhan"      VARCHAR(20),
    "dia_chi_nhan"         VARCHAR(500),
    "so_cccd_gui"          VARCHAR(20),
    "so_cccd_nhan"         VARCHAR(20),
    "ten_hang_hoa"         VARCHAR(500),
    "hang_hoa_json"        JSONB,
    "so_luong"             INTEGER,
    "don_vi_tinh"          VARCHAR(20),
    "gia_tri_hang"         DECIMAL(15,0),
    "trong_luong"          DECIMAL(10,2),
    "thu_ho"               DECIMAL(15,0)    DEFAULT 0,
    "trang_thai_cod"       "TrangThaiCOD"   NOT NULL DEFAULT 'khong_co',
    "gia_cuoc"             DECIMAL(15,0)    NOT NULL DEFAULT 0,
    "trang_thai"           "TrangThai"      NOT NULL DEFAULT 'cho_vc',
    "trang_thai_thu"       "TrangThaiThu"   NOT NULL DEFAULT 'da_thu',
    "trang_thai_cuoc_nhan" "TrangThaiCuocNhan",
    "hang_hu_khong_den"    BOOLEAN          NOT NULL DEFAULT false,
    "can_xuat_hddt"        BOOLEAN          NOT NULL DEFAULT false,
    "kh_gui_id"            INTEGER,
    "kh_nhan_id"           INTEGER,
    "da_vao_bang_ke"       BOOLEAN          NOT NULL DEFAULT false,
    "hinh_thuc_giao"       "HinhThucGiao"   NOT NULL DEFAULT 'tan_noi',
    "chanh_id"             INTEGER,
    "dia_chi_giao"         VARCHAR(500),
    "created_at"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "bien_nhan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bien_nhan_thu_ho" (
    "id"           SERIAL               NOT NULL,
    "ma_bnth"      VARCHAR(20)          NOT NULL,
    "ngay_thu"     TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bien_nhan_id" INTEGER              NOT NULL,
    "so_tien"      DECIMAL(15,0)        NOT NULL,
    "nguoi_nop"    VARCHAR(200)         NOT NULL,
    "hinh_thuc"    "HinhThucThanhToan"  NOT NULL DEFAULT 'tien_mat',
    "ghi_chu"      TEXT,
    "van_phong_id" INTEGER              NOT NULL,
    "nhan_vien_id" INTEGER              NOT NULL,
    "la_qua_chanh" BOOLEAN              NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bien_nhan_thu_ho_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "phieu_chuyen_cod" (
    "id"                SERIAL                  NOT NULL,
    "ma_phieu"          VARCHAR(20)             NOT NULL,
    "ngay_lap"          TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_chuyen"       TIMESTAMP(3),
    "ngay_nhan"         TIMESTAMP(3),
    "van_phong_nhan_id" INTEGER                 NOT NULL,
    "van_phong_gui_id"  INTEGER                 NOT NULL,
    "so_tien_tong"      DECIMAL(15,0)           NOT NULL,
    "hinh_thuc"         "HinhThucThanhToan"      NOT NULL DEFAULT 'tien_mat',
    "trang_thai"        "TrangThaiPhieuChuyen"   NOT NULL DEFAULT 'cho_chuyen',
    "ghi_chu"           TEXT,
    "nhan_vien_lap_id"  INTEGER                 NOT NULL,
    "nhan_vien_nhan_id" INTEGER,
    "phieu_chi_id"      INTEGER,
    "phieu_thu_id"      INTEGER,
    "created_at"        TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)            NOT NULL,
    CONSTRAINT "phieu_chuyen_cod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "phieu_chuyen_cod_chi_tiet" (
    "id"           SERIAL        NOT NULL,
    "phieu_id"     INTEGER       NOT NULL,
    "bien_nhan_id" INTEGER       NOT NULL,
    "so_tien"      DECIMAL(15,0) NOT NULL,
    CONSTRAINT "phieu_chuyen_cod_chi_tiet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "phieu_chuyen_cuoc" (
    "id"                SERIAL                  NOT NULL,
    "ma_phieu"          VARCHAR(20)             NOT NULL,
    "ngay_lap"          TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngay_chuyen"       TIMESTAMP(3),
    "ngay_nhan"         TIMESTAMP(3),
    "van_phong_nhan_id" INTEGER                 NOT NULL,
    "van_phong_gui_id"  INTEGER                 NOT NULL,
    "so_tien_tong"      DECIMAL(15,0)           NOT NULL,
    "hinh_thuc"         "HinhThucThanhToan"      NOT NULL DEFAULT 'tien_mat',
    "trang_thai"        "TrangThaiPhieuChuyen"   NOT NULL DEFAULT 'cho_chuyen',
    "ghi_chu"           TEXT,
    "nhan_vien_lap_id"  INTEGER                 NOT NULL,
    "nhan_vien_nhan_id" INTEGER,
    "phieu_chi_id"      INTEGER,
    "phieu_thu_id"      INTEGER,
    "created_at"        TIMESTAMP(3)            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)            NOT NULL,
    CONSTRAINT "phieu_chuyen_cuoc_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "phieu_chuyen_cuoc_chi_tiet" (
    "id"           SERIAL        NOT NULL,
    "phieu_id"     INTEGER       NOT NULL,
    "bien_nhan_id" INTEGER       NOT NULL,
    "so_tien"      DECIMAL(15,0) NOT NULL,
    CONSTRAINT "phieu_chuyen_cuoc_chi_tiet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lich_su_trang_thai" (
    "id"             SERIAL               NOT NULL,
    "bien_nhan_id"   INTEGER              NOT NULL,
    "trang_thai_cu"  "TrangThai",
    "trang_thai_moi" "TrangThai"          NOT NULL,
    "nhan_vien_id"   INTEGER              NOT NULL,
    "phuong_thuc"    "PhuongThucCapNhat"  NOT NULL DEFAULT 'manual',
    "ghi_chu"        TEXT,
    "created_at"     TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lich_su_trang_thai_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bang_ke" (
    "id"           SERIAL        NOT NULL,
    "ma_bang_ke"   VARCHAR(30)   NOT NULL,
    "ngay_xuat"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "so_bien_nhan" INTEGER       NOT NULL DEFAULT 0,
    "tong_cuoc"    DECIMAL(15,0) NOT NULL DEFAULT 0,
    "bien_so_xe"   VARCHAR(30),
    "ten_file"     VARCHAR(200)  NOT NULL,
    "created_at"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bang_ke_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bang_ke_chi_tiet" (
    "id"           SERIAL        NOT NULL,
    "bang_ke_id"   INTEGER       NOT NULL,
    "bien_nhan_id" INTEGER,
    "stt"          INTEGER       NOT NULL DEFAULT 0,
    "ngay"         TIMESTAMP(3)  NOT NULL,
    "tuyen"        VARCHAR(30),
    "nguoi_gui"    VARCHAR(300),
    "dia_chi_gui"  VARCHAR(500),
    "hang_hoa"     VARCHAR(300),
    "gia_cuoc"     DECIMAL(15,0) NOT NULL DEFAULT 0,
    "vai_tro_tra"  VARCHAR(20),
    CONSTRAINT "bang_ke_chi_tiet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doanh_nghiep_hddt" (
    "id"         SERIAL        NOT NULL,
    "ten"        VARCHAR(300)  NOT NULL,
    "ma_so_thue" VARCHAR(20),
    "dia_chi"    VARCHAR(500),
    "active"     BOOLEAN       NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doanh_nghiep_hddt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "phieu_thu" (
    "id"           SERIAL               NOT NULL,
    "ma_phieu"     VARCHAR(20)          NOT NULL,
    "ngay_thu"     TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doi_tuong"    VARCHAR(300)         NOT NULL,
    "ly_do"        VARCHAR(500)         NOT NULL,
    "so_tien"      DECIMAL(15,0)        NOT NULL,
    "hinh_thuc"    "HinhThucThanhToan"  NOT NULL DEFAULT 'tien_mat',
    "van_phong_id" INTEGER              NOT NULL,
    "nhan_vien_id" INTEGER              NOT NULL,
    "bien_nhan_id" INTEGER,
    "da_huy"       BOOLEAN              NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phieu_thu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "phieu_chi" (
    "id"           SERIAL               NOT NULL,
    "ma_phieu"     VARCHAR(20)          NOT NULL,
    "ngay_chi"     TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoi_nhan"   VARCHAR(300)         NOT NULL,
    "ly_do"        VARCHAR(500)         NOT NULL,
    "so_tien"      DECIMAL(15,0)        NOT NULL,
    "hinh_thuc"    "HinhThucThanhToan"  NOT NULL DEFAULT 'tien_mat',
    "van_phong_id" INTEGER              NOT NULL,
    "nhan_vien_id" INTEGER              NOT NULL,
    "bien_nhan_id" INTEGER,
    "da_huy"       BOOLEAN              NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "phieu_chi_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cong_no" (
    "id"               SERIAL             NOT NULL,
    "bien_nhan_id"     INTEGER            NOT NULL,
    "doi_tuong"        VARCHAR(300)       NOT NULL,
    "so_tien_no"       DECIMAL(15,0)      NOT NULL,
    "ngay_phat_sinh"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trang_thai"       "TrangThaiCongNo" NOT NULL DEFAULT 'chua_thu',
    "ngay_thu"         TIMESTAMP(3),
    "phieu_thu_id"     INTEGER,
    "khach_hang_id"    INTEGER,
    "doanh_nghiep_id"  INTEGER,
    "vai_tro"          "VaiTroCongNo"     NOT NULL DEFAULT 'nguoi_gui',
    "created_at"       TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cong_no_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "login_log" (
    "id"           SERIAL        NOT NULL,
    "nhan_vien_id" INTEGER,
    "username"     VARCHAR(100)  NOT NULL,
    "action"       VARCHAR(20)   NOT NULL,
    "ip_address"   VARCHAR(45),
    "user_agent"   VARCHAR(500),
    "timestamp"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id"           SERIAL        NOT NULL,
    "timestamp"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nhan_vien_id" INTEGER       NOT NULL,
    "action"       VARCHAR(20)   NOT NULL,
    "entity"       VARCHAR(50)   NOT NULL,
    "entity_id"    INTEGER,
    "old_data"     JSONB,
    "new_data"     JSONB,
    "ip_address"   VARCHAR(45),
    "user_agent"   VARCHAR(500),
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- UNIQUE INDEXES
-- ============================================================
CREATE UNIQUE INDEX "van_phong_ma_vp_key" ON "van_phong"("ma_vp");
CREATE UNIQUE INDEX "nhan_vien_ma_nv_key" ON "nhan_vien"("ma_nv");
CREATE UNIQUE INDEX "nhan_vien_username_key" ON "nhan_vien"("username");
CREATE UNIQUE INDEX "khach_hang_ma_kh_key" ON "khach_hang"("ma_kh");
CREATE UNIQUE INDEX "chanh_ten_key" ON "chanh"("ten");
CREATE UNIQUE INDEX "bien_nhan_ma_so_ngay_bien_nhan_key" ON "bien_nhan"("ma_so", "ngay_bien_nhan");
CREATE UNIQUE INDEX "bien_nhan_thu_ho_ma_bnth_key" ON "bien_nhan_thu_ho"("ma_bnth");
CREATE UNIQUE INDEX "bien_nhan_thu_ho_bien_nhan_id_key" ON "bien_nhan_thu_ho"("bien_nhan_id");
CREATE UNIQUE INDEX "phieu_chuyen_cod_ma_phieu_key" ON "phieu_chuyen_cod"("ma_phieu");
CREATE UNIQUE INDEX "phieu_chuyen_cod_phieu_chi_id_key" ON "phieu_chuyen_cod"("phieu_chi_id");
CREATE UNIQUE INDEX "phieu_chuyen_cod_phieu_thu_id_key" ON "phieu_chuyen_cod"("phieu_thu_id");
CREATE UNIQUE INDEX "phieu_chuyen_cod_chi_tiet_phieu_id_bien_nhan_id_key" ON "phieu_chuyen_cod_chi_tiet"("phieu_id", "bien_nhan_id");
CREATE UNIQUE INDEX "phieu_chuyen_cuoc_ma_phieu_key" ON "phieu_chuyen_cuoc"("ma_phieu");
CREATE UNIQUE INDEX "phieu_chuyen_cuoc_phieu_chi_id_key" ON "phieu_chuyen_cuoc"("phieu_chi_id");
CREATE UNIQUE INDEX "phieu_chuyen_cuoc_phieu_thu_id_key" ON "phieu_chuyen_cuoc"("phieu_thu_id");
CREATE UNIQUE INDEX "phieu_chuyen_cuoc_chi_tiet_phieu_id_bien_nhan_id_key" ON "phieu_chuyen_cuoc_chi_tiet"("phieu_id", "bien_nhan_id");
CREATE UNIQUE INDEX "bang_ke_ma_bang_ke_key" ON "bang_ke"("ma_bang_ke");
CREATE UNIQUE INDEX "phieu_thu_ma_phieu_key" ON "phieu_thu"("ma_phieu");
CREATE UNIQUE INDEX "phieu_chi_ma_phieu_key" ON "phieu_chi"("ma_phieu");

-- ============================================================
-- REGULAR INDEXES
-- ============================================================
CREATE INDEX "nhan_vien_van_phong_id_idx" ON "nhan_vien"("van_phong_id");
CREATE INDEX "nhan_vien_active_idx" ON "nhan_vien"("active");
CREATE INDEX "doanh_nghiep_active_idx" ON "doanh_nghiep"("active");
CREATE INDEX "khach_hang_dien_thoai_idx" ON "khach_hang"("dien_thoai");
CREATE INDEX "khach_hang_doanh_nghiep_id_idx" ON "khach_hang"("doanh_nghiep_id");
CREATE INDEX "bien_nhan_ma_so_idx" ON "bien_nhan"("ma_so");
CREATE INDEX "bien_nhan_van_phong_gui_id_idx" ON "bien_nhan"("van_phong_gui_id");
CREATE INDEX "bien_nhan_van_phong_nhan_id_idx" ON "bien_nhan"("van_phong_nhan_id");
CREATE INDEX "bien_nhan_van_phong_nhan_id_trang_thai_idx" ON "bien_nhan"("van_phong_nhan_id", "trang_thai");
CREATE INDEX "bien_nhan_van_phong_gui_id_trang_thai_idx" ON "bien_nhan"("van_phong_gui_id", "trang_thai");
CREATE INDEX "bien_nhan_van_phong_gui_id_ngay_bien_nhan_idx" ON "bien_nhan"("van_phong_gui_id", "ngay_bien_nhan");
CREATE INDEX "bien_nhan_van_phong_nhan_id_ngay_bien_nhan_idx" ON "bien_nhan"("van_phong_nhan_id", "ngay_bien_nhan");
CREATE INDEX "bien_nhan_trang_thai_idx" ON "bien_nhan"("trang_thai");
CREATE INDEX "bien_nhan_ngay_bien_nhan_idx" ON "bien_nhan"("ngay_bien_nhan");
CREATE INDEX "bien_nhan_can_xuat_hddt_da_vao_bang_ke_idx" ON "bien_nhan"("can_xuat_hddt", "da_vao_bang_ke");
CREATE INDEX "bien_nhan_chanh_id_idx" ON "bien_nhan"("chanh_id");
CREATE INDEX "bien_nhan_trang_thai_cod_idx" ON "bien_nhan"("trang_thai_cod");
CREATE INDEX "bien_nhan_van_phong_nhan_id_trang_thai_cod_idx" ON "bien_nhan"("van_phong_nhan_id", "trang_thai_cod");
CREATE INDEX "bien_nhan_van_phong_gui_id_trang_thai_cod_idx" ON "bien_nhan"("van_phong_gui_id", "trang_thai_cod");
CREATE INDEX "bien_nhan_trang_thai_cuoc_nhan_idx" ON "bien_nhan"("trang_thai_cuoc_nhan");
CREATE INDEX "bien_nhan_vp_nhan_cuoc_nhan_idx" ON "bien_nhan"("van_phong_nhan_id", "trang_thai_cuoc_nhan");
CREATE INDEX "bien_nhan_vp_gui_cuoc_nhan_idx" ON "bien_nhan"("van_phong_gui_id", "trang_thai_cuoc_nhan");
CREATE INDEX "bien_nhan_thu_ho_ngay_thu_idx" ON "bien_nhan_thu_ho"("ngay_thu");
CREATE INDEX "bien_nhan_thu_ho_van_phong_id_idx" ON "bien_nhan_thu_ho"("van_phong_id");
CREATE INDEX "phieu_chuyen_cod_van_phong_nhan_id_trang_thai_idx" ON "phieu_chuyen_cod"("van_phong_nhan_id", "trang_thai");
CREATE INDEX "phieu_chuyen_cod_van_phong_gui_id_trang_thai_idx" ON "phieu_chuyen_cod"("van_phong_gui_id", "trang_thai");
CREATE INDEX "phieu_chuyen_cod_chi_tiet_bien_nhan_id_idx" ON "phieu_chuyen_cod_chi_tiet"("bien_nhan_id");
CREATE INDEX "phieu_chuyen_cuoc_vp_nhan_trang_thai_idx" ON "phieu_chuyen_cuoc"("van_phong_nhan_id", "trang_thai");
CREATE INDEX "phieu_chuyen_cuoc_vp_gui_trang_thai_idx" ON "phieu_chuyen_cuoc"("van_phong_gui_id", "trang_thai");
CREATE INDEX "phieu_chuyen_cuoc_chi_tiet_bien_nhan_id_idx" ON "phieu_chuyen_cuoc_chi_tiet"("bien_nhan_id");
CREATE INDEX "lich_su_trang_thai_bien_nhan_id_idx" ON "lich_su_trang_thai"("bien_nhan_id");
CREATE INDEX "lich_su_trang_thai_nhan_vien_id_idx" ON "lich_su_trang_thai"("nhan_vien_id");
CREATE INDEX "lich_su_trang_thai_created_at_idx" ON "lich_su_trang_thai"("created_at");
CREATE INDEX "bang_ke_chi_tiet_bang_ke_id_idx" ON "bang_ke_chi_tiet"("bang_ke_id");
CREATE INDEX "doanh_nghiep_hddt_active_idx" ON "doanh_nghiep_hddt"("active");
CREATE INDEX "phieu_thu_ngay_thu_idx" ON "phieu_thu"("ngay_thu");
CREATE INDEX "phieu_thu_van_phong_id_idx" ON "phieu_thu"("van_phong_id");
CREATE INDEX "phieu_chi_ngay_chi_idx" ON "phieu_chi"("ngay_chi");
CREATE INDEX "phieu_chi_van_phong_id_idx" ON "phieu_chi"("van_phong_id");
CREATE INDEX "phieu_chi_bien_nhan_id_idx" ON "phieu_chi"("bien_nhan_id");
CREATE INDEX "cong_no_trang_thai_idx" ON "cong_no"("trang_thai");
CREATE INDEX "cong_no_ngay_phat_sinh_idx" ON "cong_no"("ngay_phat_sinh");
CREATE INDEX "cong_no_khach_hang_id_idx" ON "cong_no"("khach_hang_id");
CREATE INDEX "cong_no_doanh_nghiep_id_idx" ON "cong_no"("doanh_nghiep_id");
CREATE INDEX "login_log_nhan_vien_id_idx" ON "login_log"("nhan_vien_id");
CREATE INDEX "login_log_timestamp_idx" ON "login_log"("timestamp");
CREATE INDEX "audit_log_nhan_vien_id_idx" ON "audit_log"("nhan_vien_id");
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- ============================================================
-- GIN TRIGRAM INDEXES (full-text search)
-- ============================================================
CREATE INDEX idx_bien_nhan_nguoi_gui_trgm    ON bien_nhan USING GIN (nguoi_gui    gin_trgm_ops);
CREATE INDEX idx_bien_nhan_don_vi_gui_trgm   ON bien_nhan USING GIN (don_vi_gui   gin_trgm_ops);
CREATE INDEX idx_bien_nhan_nguoi_nhan_trgm   ON bien_nhan USING GIN (nguoi_nhan   gin_trgm_ops);
CREATE INDEX idx_bien_nhan_don_vi_nhan_trgm  ON bien_nhan USING GIN (don_vi_nhan  gin_trgm_ops);
CREATE INDEX idx_bien_nhan_dien_thoai_gui_trgm ON bien_nhan USING GIN (dien_thoai_gui gin_trgm_ops);
CREATE INDEX idx_bien_nhan_dien_thoai_nhan_trgm ON bien_nhan USING GIN (dien_thoai_nhan gin_trgm_ops);
CREATE INDEX idx_khach_hang_ten_don_vi_trgm  ON khach_hang USING GIN (ten_don_vi   gin_trgm_ops);
CREATE INDEX idx_khach_hang_nguoi_lien_he_trgm ON khach_hang USING GIN (nguoi_lien_he gin_trgm_ops);
CREATE INDEX idx_doanh_nghiep_ten_trgm       ON doanh_nghiep USING GIN (ten         gin_trgm_ops);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================
ALTER TABLE "nhan_vien" ADD CONSTRAINT "nhan_vien_van_phong_id_fkey" FOREIGN KEY ("van_phong_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "khach_hang" ADD CONSTRAINT "khach_hang_doanh_nghiep_id_fkey" FOREIGN KEY ("doanh_nghiep_id") REFERENCES "doanh_nghiep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_van_phong_gui_id_fkey" FOREIGN KEY ("van_phong_gui_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_van_phong_nhan_id_fkey" FOREIGN KEY ("van_phong_nhan_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_nhan_vien_nhap_id_fkey" FOREIGN KEY ("nhan_vien_nhap_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_kh_gui_id_fkey" FOREIGN KEY ("kh_gui_id") REFERENCES "khach_hang"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_kh_nhan_id_fkey" FOREIGN KEY ("kh_nhan_id") REFERENCES "khach_hang"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bien_nhan" ADD CONSTRAINT "bien_nhan_chanh_id_fkey" FOREIGN KEY ("chanh_id") REFERENCES "chanh"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bien_nhan_thu_ho" ADD CONSTRAINT "bien_nhan_thu_ho_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bien_nhan_thu_ho" ADD CONSTRAINT "bien_nhan_thu_ho_van_phong_id_fkey" FOREIGN KEY ("van_phong_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bien_nhan_thu_ho" ADD CONSTRAINT "bien_nhan_thu_ho_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod" ADD CONSTRAINT "phieu_chuyen_cod_van_phong_nhan_id_fkey" FOREIGN KEY ("van_phong_nhan_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod" ADD CONSTRAINT "phieu_chuyen_cod_van_phong_gui_id_fkey" FOREIGN KEY ("van_phong_gui_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod" ADD CONSTRAINT "phieu_chuyen_cod_nhan_vien_lap_id_fkey" FOREIGN KEY ("nhan_vien_lap_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod" ADD CONSTRAINT "phieu_chuyen_cod_nhan_vien_nhan_id_fkey" FOREIGN KEY ("nhan_vien_nhan_id") REFERENCES "nhan_vien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod" ADD CONSTRAINT "phieu_chuyen_cod_phieu_chi_id_fkey" FOREIGN KEY ("phieu_chi_id") REFERENCES "phieu_chi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod" ADD CONSTRAINT "phieu_chuyen_cod_phieu_thu_id_fkey" FOREIGN KEY ("phieu_thu_id") REFERENCES "phieu_thu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod_chi_tiet" ADD CONSTRAINT "phieu_chuyen_cod_chi_tiet_phieu_id_fkey" FOREIGN KEY ("phieu_id") REFERENCES "phieu_chuyen_cod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cod_chi_tiet" ADD CONSTRAINT "phieu_chuyen_cod_chi_tiet_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc" ADD CONSTRAINT "phieu_chuyen_cuoc_vp_nhan_fkey" FOREIGN KEY ("van_phong_nhan_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc" ADD CONSTRAINT "phieu_chuyen_cuoc_vp_gui_fkey" FOREIGN KEY ("van_phong_gui_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc" ADD CONSTRAINT "phieu_chuyen_cuoc_nv_lap_fkey" FOREIGN KEY ("nhan_vien_lap_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc" ADD CONSTRAINT "phieu_chuyen_cuoc_nv_nhan_fkey" FOREIGN KEY ("nhan_vien_nhan_id") REFERENCES "nhan_vien"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc" ADD CONSTRAINT "phieu_chuyen_cuoc_phieu_chi_fkey" FOREIGN KEY ("phieu_chi_id") REFERENCES "phieu_chi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc" ADD CONSTRAINT "phieu_chuyen_cuoc_phieu_thu_fkey" FOREIGN KEY ("phieu_thu_id") REFERENCES "phieu_thu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc_chi_tiet" ADD CONSTRAINT "phieu_chuyen_cuoc_chi_tiet_phieu_fkey" FOREIGN KEY ("phieu_id") REFERENCES "phieu_chuyen_cuoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "phieu_chuyen_cuoc_chi_tiet" ADD CONSTRAINT "phieu_chuyen_cuoc_chi_tiet_bn_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lich_su_trang_thai" ADD CONSTRAINT "lich_su_trang_thai_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lich_su_trang_thai" ADD CONSTRAINT "lich_su_trang_thai_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bang_ke_chi_tiet" ADD CONSTRAINT "bang_ke_chi_tiet_bang_ke_id_fkey" FOREIGN KEY ("bang_ke_id") REFERENCES "bang_ke"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bang_ke_chi_tiet" ADD CONSTRAINT "bang_ke_chi_tiet_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_thu" ADD CONSTRAINT "phieu_thu_van_phong_id_fkey" FOREIGN KEY ("van_phong_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_thu" ADD CONSTRAINT "phieu_thu_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_thu" ADD CONSTRAINT "phieu_thu_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "phieu_chi" ADD CONSTRAINT "phieu_chi_van_phong_id_fkey" FOREIGN KEY ("van_phong_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chi" ADD CONSTRAINT "phieu_chi_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "nhan_vien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "phieu_chi" ADD CONSTRAINT "phieu_chi_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cong_no" ADD CONSTRAINT "cong_no_bien_nhan_id_fkey" FOREIGN KEY ("bien_nhan_id") REFERENCES "bien_nhan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cong_no" ADD CONSTRAINT "cong_no_phieu_thu_id_fkey" FOREIGN KEY ("phieu_thu_id") REFERENCES "phieu_thu"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cong_no" ADD CONSTRAINT "cong_no_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "khach_hang"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cong_no" ADD CONSTRAINT "cong_no_doanh_nghiep_id_fkey" FOREIGN KEY ("doanh_nghiep_id") REFERENCES "doanh_nghiep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
