
-- Add is_optional column to combo_items
ALTER TABLE public.combo_items
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

-- Update recompute function to exclude optional slots from the base price
CREATE OR REPLACE FUNCTION public.recompute_combo_variant_prices(p_combo_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cp_record RECORD;
  burger_slot RECORD;
  extras_sum numeric := 0;
  v RECORD;
  burger_price numeric;
  combo_variant_names text[];
BEGIN
  SELECT * INTO cp_record
  FROM combo_products
  WHERE product_id = p_combo_product_id AND active = true
  LIMIT 1;

  IF cp_record IS NULL THEN RETURN; END IF;
  IF cp_record.pricing_mode IS DISTINCT FROM 'dynamic' THEN RETURN; END IF;

  SELECT COALESCE(array_agg(LOWER(cv.name)), ARRAY[]::text[])
    INTO combo_variant_names
  FROM product_variant_options pvo
  JOIN category_variants cv ON cv.id = pvo.category_variant_id
  WHERE pvo.product_id = p_combo_product_id;

  burger_slot := NULL;
  IF array_length(combo_variant_names, 1) IS NOT NULL THEN
    SELECT ci.* INTO burger_slot
    FROM combo_items ci
    WHERE ci.combo_product_id = cp_record.id
      AND EXISTS (
        SELECT 1
        FROM product_variant_options pvo2
        JOIN category_variants cv2 ON cv2.id = pvo2.category_variant_id
        WHERE pvo2.product_id = ci.default_product_id
          AND LOWER(cv2.name) = ANY(combo_variant_names)
      )
    ORDER BY ci.display_order
    LIMIT 1;
  END IF;

  -- Sum of remaining (non-burger, non-optional) slots using their default selections
  SELECT COALESCE(SUM(
    CASE
      WHEN ci.default_variant_id IS NOT NULL THEN
        COALESCE((
          SELECT price FROM product_variant_options
          WHERE product_id = ci.default_product_id
            AND category_variant_id = ci.default_variant_id
          LIMIT 1
        ), 0)
      ELSE
        COALESCE((
          SELECT price FROM product_variant_options
          WHERE product_id = ci.default_product_id
            AND is_default = true
            AND is_enabled = true
          LIMIT 1
        ), 0)
    END * COALESCE(ci.quantity, 1)
  ), 0) INTO extras_sum
  FROM combo_items ci
  WHERE ci.combo_product_id = cp_record.id
    AND (burger_slot.id IS NULL OR ci.id <> burger_slot.id)
    AND COALESCE(ci.is_optional, false) = false;

  FOR v IN
    SELECT pvo.id, cv.name AS variant_name
    FROM product_variant_options pvo
    JOIN category_variants cv ON cv.id = pvo.category_variant_id
    WHERE pvo.product_id = p_combo_product_id
  LOOP
    burger_price := 0;
    IF burger_slot.default_product_id IS NOT NULL THEN
      SELECT pvo2.price INTO burger_price
      FROM product_variant_options pvo2
      JOIN category_variants cv2 ON cv2.id = pvo2.category_variant_id
      WHERE pvo2.product_id = burger_slot.default_product_id
        AND LOWER(cv2.name) = LOWER(v.variant_name)
      LIMIT 1;
    END IF;

    UPDATE product_variant_options
    SET price = GREATEST(COALESCE(burger_price, 0) + extras_sum - COALESCE(cp_record.combo_discount, 0), 0),
        updated_at = now()
    WHERE id = v.id;
  END LOOP;
END;
$function$;
