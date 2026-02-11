ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS commission_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_type text,
  ADD COLUMN IF NOT EXISTS commission_value numeric,
  ADD COLUMN IF NOT EXISTS commission_contact text;