-- Drop the old unique constraint that prevents multiple group option combos
ALTER TABLE public.product_variant_options
  DROP CONSTRAINT product_variant_options_product_id_category_variant_id_key;

-- Create new unique constraint that allows one row per product + variant + group option
CREATE UNIQUE INDEX idx_pvo_product_variant_group
  ON public.product_variant_options (product_id, category_variant_id, variant_group_option_id)
  WHERE variant_group_option_id IS NOT NULL;

-- Keep uniqueness for rows WITHOUT a group option (backward compat)
CREATE UNIQUE INDEX idx_pvo_product_variant_no_group
  ON public.product_variant_options (product_id, category_variant_id)
  WHERE variant_group_option_id IS NULL;

-- Drop the old single-default index (can't have just 1 default when combos exist)
DROP INDEX IF EXISTS idx_product_variant_options_default;