-- ============================================================
-- [M-03 / Batch 3C] GIN Trigram Indexes cho full-text search
-- ============================================================
-- Mục tiêu: Tăng tốc ILIKE '%keyword%' trên các cột tìm kiếm
-- thường xuyên, tránh full sequential scan khi dữ liệu lớn.
--
-- NOTE: Bỏ CONCURRENTLY vì Prisma migrate chạy trong transaction block.
-- Index sẽ lock table trong thời gian ngắn (chấp nhận được khi deploy).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---- bien_nhan ----
CREATE INDEX IF NOT EXISTS idx_bien_nhan_nguoi_gui_trgm
  ON bien_nhan USING GIN (nguoi_gui gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_bien_nhan_don_vi_gui_trgm
  ON bien_nhan USING GIN (don_vi_gui gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_bien_nhan_nguoi_nhan_trgm
  ON bien_nhan USING GIN (nguoi_nhan gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_bien_nhan_don_vi_nhan_trgm
  ON bien_nhan USING GIN (don_vi_nhan gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_bien_nhan_dien_thoai_gui_trgm
  ON bien_nhan USING GIN (dien_thoai_gui gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_bien_nhan_dien_thoai_nhan_trgm
  ON bien_nhan USING GIN (dien_thoai_nhan gin_trgm_ops);

-- ---- khach_hang ----
CREATE INDEX IF NOT EXISTS idx_khach_hang_ten_don_vi_trgm
  ON khach_hang USING GIN (ten_don_vi gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_khach_hang_nguoi_lien_he_trgm
  ON khach_hang USING GIN (nguoi_lien_he gin_trgm_ops);

-- ---- doanh_nghiep ----
CREATE INDEX IF NOT EXISTS idx_doanh_nghiep_ten_trgm
  ON doanh_nghiep USING GIN (ten gin_trgm_ops);
