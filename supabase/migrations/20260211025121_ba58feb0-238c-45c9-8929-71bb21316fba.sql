
-- Add usage tracking columns to discount subscriptions
ALTER TABLE public.customer_discount_subscriptions
  ADD COLUMN IF NOT EXISTS usage_limit integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;

-- NULL usage_limit = unlimited uses
COMMENT ON COLUMN public.customer_discount_subscriptions.usage_limit IS 'Max number of uses allowed. NULL = unlimited.';
COMMENT ON COLUMN public.customer_discount_subscriptions.usage_count IS 'Number of times this discount has been used.';
