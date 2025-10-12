-- ================================================================
-- FASE 3: FUNCIONES HELPER PARA INTEGRACIÓN CON VENTAS
-- ================================================================

-- Función helper: Descontar inventario de una orden completa
-- Procesa todos los items de una orden y descuenta según sus recetas
CREATE OR REPLACE FUNCTION public.deduct_inventory_from_order(
  p_order_id UUID,
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- Buscar receta para el producto
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

COMMENT ON FUNCTION public.deduct_inventory_from_order IS 'Procesa una orden completa y descuenta el inventario según las recetas configuradas para cada producto';