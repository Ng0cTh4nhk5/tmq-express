-- Fix race condition: unique index trên (ma_so, ngày VN = UTC+7)
-- AT TIME ZONE không IMMUTABLE → dùng offset cố định UTC+7 = interval '7h'
-- Thay thế @@unique([ma_so, ngay_bien_nhan]) vốn dùng TIMESTAMP đầy đủ (không đủ)

-- 1. Bỏ unique constraint cũ nếu tồn tại
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bien_nhan_ma_so_ngay_bien_nhan_key'
      AND conrelid = 'bien_nhan'::regclass
  ) THEN
    ALTER TABLE bien_nhan DROP CONSTRAINT bien_nhan_ma_so_ngay_bien_nhan_key;
  END IF;
END $$;

-- 2. Tạo expression unique index dùng UTC+7 offset cố định (IMMUTABLE-safe)
DROP INDEX IF EXISTS bien_nhan_ma_so_date_uidx;
CREATE UNIQUE INDEX bien_nhan_ma_so_date_uidx
  ON bien_nhan (
    ma_so,
    ((ngay_bien_nhan + interval '7 hours')::date)
  );

-- Verify
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bien_nhan'
  AND indexname = 'bien_nhan_ma_so_date_uidx';
