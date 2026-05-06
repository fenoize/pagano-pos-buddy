CREATE TABLE IF NOT EXISTS public.coupon_allowed_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_allowed_tags_coupon ON public.coupon_allowed_tags(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_allowed_tags_tag ON public.coupon_allowed_tags(tag_id);

ALTER TABLE public.coupon_allowed_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read coupon allowed tags"
  ON public.coupon_allowed_tags FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage coupon allowed tags"
  ON public.coupon_allowed_tags FOR ALL
  USING (is_active_staff())
  WITH CHECK (is_active_staff());