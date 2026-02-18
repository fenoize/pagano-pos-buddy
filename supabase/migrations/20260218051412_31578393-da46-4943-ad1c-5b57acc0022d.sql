
-- Add coupon-like rules to customer_discount_subscriptions
ALTER TABLE public.customer_discount_subscriptions
  ADD COLUMN IF NOT EXISTS min_spend integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_spend integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS affects_delivery boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_amount numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS apply_to_discounted boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS apply_to_combo_children boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS scope_mode text DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS allowed_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allowed_products text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_products text[] DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN public.customer_discount_subscriptions.min_spend IS 'Minimum order subtotal for discount to apply';
COMMENT ON COLUMN public.customer_discount_subscriptions.max_spend IS 'Maximum order subtotal for discount to apply';
COMMENT ON COLUMN public.customer_discount_subscriptions.affects_delivery IS 'Whether discount also applies to delivery fee';
COMMENT ON COLUMN public.customer_discount_subscriptions.delivery_mode IS 'Delivery discount mode: free, fixed, percent';
COMMENT ON COLUMN public.customer_discount_subscriptions.delivery_amount IS 'Delivery discount amount (for fixed/percent modes)';
COMMENT ON COLUMN public.customer_discount_subscriptions.apply_to_discounted IS 'Whether to apply on already discounted items';
COMMENT ON COLUMN public.customer_discount_subscriptions.apply_to_combo_children IS 'Whether to apply on combo child items';
COMMENT ON COLUMN public.customer_discount_subscriptions.scope_mode IS 'Scope: all, categories, products';
COMMENT ON COLUMN public.customer_discount_subscriptions.allowed_categories IS 'Category IDs where discount applies';
COMMENT ON COLUMN public.customer_discount_subscriptions.excluded_categories IS 'Category IDs excluded from discount';
COMMENT ON COLUMN public.customer_discount_subscriptions.allowed_products IS 'Product IDs where discount applies';
COMMENT ON COLUMN public.customer_discount_subscriptions.excluded_products IS 'Product IDs excluded from discount';
