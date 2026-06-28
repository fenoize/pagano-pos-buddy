
CREATE OR REPLACE FUNCTION public.recompute_combo_variant_prices(p_combo_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cp_record RECORD;
  burger_slot RECORD;
  extras_sum numeric := 0;
  v RECORD;
  burger_price numeric;
  combo_variant_category uuid;
BEGIN
  SELECT * INTO cp_record
  FROM combo_products
  WHERE product_id = p_combo_product_id AND active = true
  LIMIT 1;

  IF cp_record IS NULL THEN RETURN; END IF;
  IF cp_record.pricing_mode IS DISTINCT FROM 'dynamic' THEN RETURN; END IF;

  -- Category that drives the combo's own variants (e.g. Smash)
  SELECT DISTINCT cv.category_id INTO combo_variant_category
  FROM product_variant_options pvo
  JOIN category_variants cv ON cv.id = pvo.category_variant_id
  WHERE pvo.product_id = p_combo_product_id
  LIMIT 1;

  -- Burger slot = combo_item whose category matches the combo's variant category
  SELECT ci.* INTO burger_slot
  FROM combo_items ci
  WHERE ci.combo_product_id = cp_record.id
    AND ci.category_id = combo_variant_category
  LIMIT 1;

  -- Sum of remaining slots using their default selections
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
    AND (burger_slot.id IS NULL OR ci.id <> burger_slot.id);

  -- Update each combo variant price
  FOR v IN
    SELECT pvo.id, pvo.category_variant_id
    FROM product_variant_options pvo
    WHERE pvo.product_id = p_combo_product_id
  LOOP
    burger_price := 0;
    IF burger_slot.default_product_id IS NOT NULL THEN
      SELECT price INTO burger_price
      FROM product_variant_options
      WHERE product_id = burger_slot.default_product_id
        AND category_variant_id = v.category_variant_id
      LIMIT 1;
    END IF;

    UPDATE product_variant_options
    SET price = GREATEST(COALESCE(burger_price, 0) + extras_sum - COALESCE(cp_record.combo_discount, 0), 0),
        updated_at = now()
    WHERE id = v.id;
  END LOOP;
END;
$$;

-- Trigger: when a combo_item changes, recompute its combo
CREATE OR REPLACE FUNCTION public.trg_recompute_combo_on_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cp_pid uuid;
BEGIN
  SELECT product_id INTO cp_pid FROM combo_products
  WHERE id = COALESCE(NEW.combo_product_id, OLD.combo_product_id);
  IF cp_pid IS NOT NULL THEN
    PERFORM public.recompute_combo_variant_prices(cp_pid);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS combo_items_recompute ON public.combo_items;
CREATE TRIGGER combo_items_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.combo_items
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_combo_on_item_change();

-- Trigger: when combo_products changes (discount, pricing_mode), recompute
CREATE OR REPLACE FUNCTION public.trg_recompute_combo_on_combo_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_combo_variant_prices(COALESCE(NEW.product_id, OLD.product_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS combo_products_recompute ON public.combo_products;
CREATE TRIGGER combo_products_recompute
AFTER INSERT OR UPDATE OF combo_discount, pricing_mode, active, base_price ON public.combo_products
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_combo_on_combo_change();

-- Trigger: when a base product's variant price changes, recompute combos that use it
CREATE OR REPLACE FUNCTION public.trg_recompute_combos_on_variant_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_combo_pid uuid;
  source_pid uuid;
BEGIN
  source_pid := COALESCE(NEW.product_id, OLD.product_id);

  -- Avoid recursion: if the row belongs to a combo itself, do nothing here
  IF EXISTS (SELECT 1 FROM combo_products WHERE product_id = source_pid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOR affected_combo_pid IN
    SELECT DISTINCT cp.product_id
    FROM combo_items ci
    JOIN combo_products cp ON cp.id = ci.combo_product_id
    WHERE ci.default_product_id = source_pid
       OR ci.category_id IN (
         SELECT pc.category_id FROM product_categories pc WHERE pc.product_id = source_pid
       )
  LOOP
    PERFORM public.recompute_combo_variant_prices(affected_combo_pid);
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS pvo_recompute_combos ON public.product_variant_options;
CREATE TRIGGER pvo_recompute_combos
AFTER INSERT OR UPDATE OF price, is_default, is_enabled, active OR DELETE
ON public.product_variant_options
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_combos_on_variant_change();

-- Backfill: recompute every active dynamic combo now
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT product_id FROM combo_products WHERE active = true AND pricing_mode = 'dynamic' LOOP
    PERFORM public.recompute_combo_variant_prices(r.product_id);
  END LOOP;
END $$;
