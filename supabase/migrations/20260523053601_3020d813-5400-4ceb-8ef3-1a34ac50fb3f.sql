ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS cash_given numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_number text,
  ADD COLUMN IF NOT EXISTS operation_number text;