ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code text;

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON public.orders(coupon_id) WHERE coupon_id IS NOT NULL;