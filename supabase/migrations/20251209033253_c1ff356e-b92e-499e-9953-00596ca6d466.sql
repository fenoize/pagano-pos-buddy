-- Update deduct_inventory_from_order function to support variant-level raw material linkage
-- Priority: Recipe > Variant raw_material_id > Product raw_material_id
CREATE OR REPLACE FUNCTION public.deduct_inventory_from_order(
  p_order_id uuid,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_recipe RECORD;
  v_ingredient RECORD;
  v_warehouse uuid;
  v_processed integer := 0;
  v_errors text[] := ARRAY[]::text[];
  v_raw_material_id uuid;
  v_variant_raw_material_id uuid;
  v_product_raw_material_id uuid;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orden no encontrada', 'processed', 0, 'errors', v_errors);
  END IF;

  -- Get warehouse (use provided or default)
  IF p_warehouse_id IS NOT NULL THEN
    v_warehouse := p_warehouse_id;
  ELSE
    SELECT id INTO v_warehouse FROM warehouses WHERE is_default = true LIMIT 1;
  END IF;

  IF v_warehouse IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No hay almacén configurado', 'processed', 0, 'errors', v_errors);
  END IF;

  -- Process each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := COALESCE((v_item->>'quantity')::integer, 1);

    -- Skip if no product_id
    IF v_product_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Priority 1: Check for recipe
    SELECT r.* INTO v_recipe 
    FROM recipes r
    WHERE r.product_id = v_product_id 
      AND r.is_active = true
      AND (r.category_variant_id = v_variant_id OR r.category_variant_id IS NULL)
    ORDER BY 
      CASE WHEN r.category_variant_id = v_variant_id THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_recipe IS NOT NULL THEN
      -- Deduct using recipe
      FOR v_ingredient IN 
        SELECT ri.*, rm.name as material_name
        FROM recipe_ingredients ri
        JOIN raw_materials rm ON rm.id = ri.raw_material_id
        WHERE ri.recipe_id = v_recipe.id AND ri.is_active = true
      LOOP
        BEGIN
          INSERT INTO stock_moves (
            raw_material_id,
            warehouse_id,
            move_type,
            qty_out,
            reference_type,
            reference_id,
            notes
          ) VALUES (
            v_ingredient.raw_material_id,
            v_warehouse,
            'sale',
            v_ingredient.quantity * v_quantity,
            'order',
            p_order_id,
            'Venta automática - Orden #' || v_order.order_number
          );

          -- Update stock balance
          UPDATE stock_balances
          SET qty_on_hand = qty_on_hand - (v_ingredient.quantity * v_quantity),
              updated_at = now()
          WHERE raw_material_id = v_ingredient.raw_material_id 
            AND warehouse_id = v_warehouse;

          v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
          v_errors := array_append(v_errors, 'Error deduciendo ' || v_ingredient.material_name || ': ' || SQLERRM);
        END;
      END LOOP;
    ELSE
      -- Priority 2: Check variant-level raw_material_id
      v_variant_raw_material_id := NULL;
      IF v_variant_id IS NOT NULL THEN
        SELECT pvo.raw_material_id INTO v_variant_raw_material_id
        FROM product_variant_options pvo
        WHERE pvo.product_id = v_product_id 
          AND pvo.category_variant_id = v_variant_id
          AND pvo.raw_material_id IS NOT NULL;
      END IF;

      -- Priority 3: Check product-level raw_material_id
      SELECT p.raw_material_id INTO v_product_raw_material_id
      FROM products p
      WHERE p.id = v_product_id;

      -- Use variant linkage first, then product linkage
      v_raw_material_id := COALESCE(v_variant_raw_material_id, v_product_raw_material_id);

      IF v_raw_material_id IS NOT NULL THEN
        -- Deduct 1:1 from linked raw material
        BEGIN
          INSERT INTO stock_moves (
            raw_material_id,
            warehouse_id,
            move_type,
            qty_out,
            reference_type,
            reference_id,
            notes
          ) VALUES (
            v_raw_material_id,
            v_warehouse,
            'sale',
            v_quantity,
            'order',
            p_order_id,
            'Venta automática (vinculación directa) - Orden #' || v_order.order_number
          );

          -- Update stock balance
          UPDATE stock_balances
          SET qty_on_hand = qty_on_hand - v_quantity,
              updated_at = now()
          WHERE raw_material_id = v_raw_material_id 
            AND warehouse_id = v_warehouse;

          v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
          v_errors := array_append(v_errors, 'Error deduciendo material vinculado para producto ' || v_product_id::text || ': ' || SQLERRM);
        END;
      END IF;
      -- If no recipe and no linkage, skip silently (product doesn't affect inventory)
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'errors', v_errors
  );
END;
$$;