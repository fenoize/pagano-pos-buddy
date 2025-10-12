-- ============================================================================
-- FASE 6: Actualizar función deduct_from_recipe para nueva estructura
-- Adapta el consumo automático de inventario a la nueva estructura de recetas
-- ============================================================================

-- Eliminar función antigua si existe
DROP FUNCTION IF EXISTS public.deduct_from_recipe(uuid, uuid, integer, uuid);

-- Crear nueva función actualizada
CREATE OR REPLACE FUNCTION public.deduct_from_recipe(
  p_order_id UUID,
  p_recipe_id UUID,
  p_quantity INTEGER,
  p_warehouse_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ingredient RECORD;
  v_balance_id UUID;
  v_quantity_base NUMERIC;
  v_required_qty NUMERIC;
BEGIN
  -- Iterar sobre los ingredientes activos de la receta (NUEVA ESTRUCTURA)
  FOR v_ingredient IN 
    SELECT 
      ri.raw_material_id,
      ri.quantity_per_unit,
      ri.uom_id,
      ri.is_optional
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = p_recipe_id
      AND ri.is_active = true
  LOOP
    -- Calcular cantidad requerida total
    v_required_qty := v_ingredient.quantity_per_unit * p_quantity;
    
    -- Convertir a UOM base
    v_quantity_base := public.convert_uom_to_base(
      v_ingredient.raw_material_id,
      v_ingredient.uom_id,
      v_required_qty
    );
    
    -- Asegurar balance (sin lote específico para consumo)
    v_balance_id := public.ensure_stock_balance(
      v_ingredient.raw_material_id,
      p_warehouse_id,
      NULL
    );
    
    -- Registrar movimiento de salida
    INSERT INTO stock_movements (
      movement_type,
      raw_material_id,
      warehouse_id,
      lot_id,
      quantity_base_uom,
      uom_id,
      reference_type,
      reference_id,
      notes
    )
    VALUES (
      'SALIDA',
      v_ingredient.raw_material_id,
      p_warehouse_id,
      NULL,
      -v_quantity_base, -- Negativo para salida
      v_ingredient.uom_id,
      'VENTA',
      p_order_id,
      format('Consumo por venta - Receta: %s x%s', p_recipe_id, p_quantity)
    );
    
    -- Actualizar balance (descontar)
    UPDATE stock_balances
    SET 
      quantity_base_uom = quantity_base_uom - v_quantity_base,
      updated_at = now()
    WHERE id = v_balance_id;
    
    -- Validar que no quedó negativo (solo warning, no bloquear venta)
    IF (SELECT quantity_base_uom FROM stock_balances WHERE id = v_balance_id) < 0 THEN
      RAISE NOTICE 'Stock negativo detectado para material % en almacén %', 
        v_ingredient.raw_material_id, p_warehouse_id;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.deduct_from_recipe IS 
'Descuenta inventario según receta (nueva estructura con recipe_ingredients). 
Se llama automáticamente al confirmar una venta con productos que tienen receta.';

-- ============================================================================
-- Actualizar función deduct_inventory_from_order para usar nueva estructura
-- ============================================================================

DROP FUNCTION IF EXISTS public.deduct_inventory_from_order(uuid, uuid);

CREATE OR REPLACE FUNCTION public.deduct_inventory_from_order(
  p_order_id UUID, 
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_recipe RECORD;
  v_warehouse_id UUID;
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
    -- Buscar receta para el producto (NUEVA ESTRUCTURA)
    -- Priorizar receta específica de variante, sino usar receta general
    SELECT * INTO v_recipe
    FROM recipes
    WHERE product_id = (v_item.value->>'productId')::UUID
      AND (
        (v_item.value->>'category_variant_id' IS NOT NULL 
         AND category_variant_id = (v_item.value->>'category_variant_id')::UUID)
        OR category_variant_id IS NULL
      )
      AND is_active = true
    ORDER BY category_variant_id NULLS LAST
    LIMIT 1;
    
    -- Si hay receta, descontar inventario
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
    ELSE
      -- Log informativo, no es error crítico
      RAISE NOTICE 'Producto % no tiene receta configurada', v_item.value->>'productName';
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    'processed', v_processed,
    'errors', v_errors
  );
END;
$$;

COMMENT ON FUNCTION public.deduct_inventory_from_order IS 
'Descuenta inventario de todos los items de una orden. 
Busca recetas activas priorizando variantes específicas.
Compatible con nueva estructura de recetas (cabecera + detalle).';