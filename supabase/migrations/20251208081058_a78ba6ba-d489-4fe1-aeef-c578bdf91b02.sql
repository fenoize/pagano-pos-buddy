-- Agregar campo para vincular producto directamente a materia prima (productos simples sin receta)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE SET NULL;

-- Agregar comentario explicativo
COMMENT ON COLUMN public.products.raw_material_id IS 'Para productos simples sin receta (ej: bebidas), vincula directamente a la materia prima para descuento automático 1:1';

-- Actualizar función de descuento de inventario para considerar productos con raw_material_id
CREATE OR REPLACE FUNCTION public.deduct_inventory_from_order(p_order_id uuid, p_warehouse_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_recipe RECORD;
  v_product RECORD;
  v_warehouse_id UUID;
  v_balance_id UUID;
  v_quantity_base NUMERIC;
  v_errors TEXT[] := '{}';
  v_processed INTEGER := 0;
BEGIN
  -- Obtener warehouse predeterminado si no se especifica
  IF p_warehouse_id IS NULL THEN
    SELECT id INTO v_warehouse_id
    FROM warehouses
    WHERE is_default = true AND is_active = true
    LIMIT 1;
    
    IF v_warehouse_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No se encontró almacén predeterminado',
        'processed', 0
      );
    END IF;
  ELSE
    v_warehouse_id := p_warehouse_id;
  END IF;
  
  -- Obtener la orden
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Orden no encontrada',
      'processed', 0
    );
  END IF;
  
  -- Procesar cada item del JSON de items
  FOR v_item IN
    SELECT * FROM jsonb_array_elements(v_order.items)
  LOOP
    -- Obtener el producto
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item.value->>'productId')::UUID;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- Primero intentar buscar receta para el producto
    SELECT * INTO v_recipe
    FROM recipes
    WHERE product_id = v_product.id
      AND (
        (v_item.value->>'category_variant_id' IS NOT NULL 
         AND category_variant_id = (v_item.value->>'category_variant_id')::UUID)
        OR category_variant_id IS NULL
      )
      AND is_active = true
    ORDER BY category_variant_id NULLS LAST
    LIMIT 1;
    
    -- Si hay receta, descontar inventario usando receta
    IF FOUND THEN
      BEGIN
        PERFORM public.deduct_from_recipe(
          p_order_id,
          v_recipe.id,
          (v_item.value->>'quantity')::INTEGER,
          v_warehouse_id
        );
        
        v_processed := v_processed + 1;
      EXCEPTION
        WHEN OTHERS THEN
          v_errors := array_append(v_errors, 
            format('Error en producto %s: %s', 
              v_item.value->>'productName', 
              SQLERRM
            )
          );
      END;
    -- Si no hay receta pero tiene raw_material_id, descontar 1:1
    ELSIF v_product.raw_material_id IS NOT NULL THEN
      BEGIN
        -- Obtener UOM base del material
        DECLARE
          v_base_uom_id UUID;
        BEGIN
          SELECT base_uom_id INTO v_base_uom_id
          FROM raw_materials
          WHERE id = v_product.raw_material_id;
          
          -- Cantidad a descontar = cantidad del item
          v_quantity_base := (v_item.value->>'quantity')::INTEGER;
          
          -- Asegurar balance
          v_balance_id := public.ensure_stock_balance(
            v_product.raw_material_id,
            v_warehouse_id,
            NULL
          );
          
          -- Registrar movimiento de salida
          INSERT INTO stock_moves (
            move_type,
            raw_material_id,
            warehouse_id,
            related_lot_id,
            qty_in,
            qty_out,
            uom_id,
            related_order_id,
            notes
          )
          VALUES (
            'sale',
            v_product.raw_material_id,
            v_warehouse_id,
            NULL,
            0,
            v_quantity_base,
            v_base_uom_id,
            p_order_id,
            format('Venta directa - %s x%s', v_product.name, v_quantity_base)
          );
          
          -- Actualizar balance (descontar)
          UPDATE stock_balances
          SET 
            qty_on_hand = qty_on_hand - v_quantity_base,
            updated_at = now()
          WHERE id = v_balance_id;
          
          v_processed := v_processed + 1;
        END;
      EXCEPTION
        WHEN OTHERS THEN
          v_errors := array_append(v_errors, 
            format('Error en producto simple %s: %s', 
              v_product.name, 
              SQLERRM
            )
          );
      END;
    ELSE
      -- Log informativo, no es error crítico
      RAISE NOTICE 'Producto % no tiene receta ni materia prima vinculada', v_item.value->>'productName';
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    'processed', v_processed,
    'errors', v_errors
  );
END;
$function$;