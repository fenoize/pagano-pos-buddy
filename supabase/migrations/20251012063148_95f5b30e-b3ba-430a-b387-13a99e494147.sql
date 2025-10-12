-- ================================================================
-- FASE 2.2: FUNCIONES DE MOVIMIENTOS DE STOCK
-- ================================================================

-- Función 1: Procesar recepción de compras (entrada de stock)
CREATE OR REPLACE FUNCTION public.process_purchase_receipt(
  p_purchase_id UUID,
  p_raw_material_id UUID,
  p_warehouse_id UUID,
  p_quantity NUMERIC,
  p_uom_id UUID,
  p_unit_cost NUMERIC,
  p_lot_number TEXT DEFAULT NULL,
  p_expiry_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id UUID;
  v_balance_id UUID;
  v_lot_id UUID;
  v_quantity_base NUMERIC;
BEGIN
  -- Convertir cantidad a UOM base
  v_quantity_base := public.convert_uom_to_base(p_raw_material_id, p_uom_id, p_quantity);
  
  -- Si hay lote, crear o buscar registro de lote
  IF p_lot_number IS NOT NULL THEN
    INSERT INTO stock_lots (
      lot_number,
      raw_material_id,
      received_date,
      expiry_date
    )
    VALUES (
      p_lot_number,
      p_raw_material_id,
      now(),
      p_expiry_date
    )
    ON CONFLICT (lot_number, raw_material_id) 
    DO UPDATE SET updated_at = now()
    RETURNING id INTO v_lot_id;
  END IF;
  
  -- Asegurar balance de stock
  v_balance_id := public.ensure_stock_balance(p_raw_material_id, p_warehouse_id, v_lot_id);
  
  -- Registrar movimiento
  INSERT INTO stock_movements (
    movement_type,
    raw_material_id,
    warehouse_id,
    lot_id,
    quantity_base_uom,
    uom_id,
    unit_cost,
    reference_type,
    reference_id,
    notes
  )
  VALUES (
    'ENTRADA',
    p_raw_material_id,
    p_warehouse_id,
    v_lot_id,
    v_quantity_base,
    p_uom_id,
    p_unit_cost,
    'COMPRA',
    p_purchase_id,
    'Recepción de compra'
  )
  RETURNING id INTO v_movement_id;
  
  -- Actualizar balance
  UPDATE stock_balances
  SET 
    quantity_base_uom = quantity_base_uom + v_quantity_base,
    last_cost = p_unit_cost,
    updated_at = now()
  WHERE id = v_balance_id;
  
  RETURN v_movement_id;
END;
$$;

-- Función 2: Descontar stock según receta (para ventas)
CREATE OR REPLACE FUNCTION public.deduct_from_recipe(
  p_order_id UUID,
  p_recipe_id UUID,
  p_quantity INTEGER,
  p_warehouse_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ingredient RECORD;
  v_balance_id UUID;
  v_quantity_base NUMERIC;
  v_required_qty NUMERIC;
BEGIN
  -- Iterar sobre los ingredientes de la receta
  FOR v_ingredient IN 
    SELECT 
      ri.raw_material_id,
      ri.quantity_per_unit,
      ri.uom_id
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = p_recipe_id
      AND ri.is_active = true
  LOOP
    -- Calcular cantidad requerida
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
    
    -- Validar que no quedó negativo
    IF (SELECT quantity_base_uom FROM stock_balances WHERE id = v_balance_id) < 0 THEN
      RAISE NOTICE 'Stock negativo detectado para material % en almacén %', 
        v_ingredient.raw_material_id, p_warehouse_id;
    END IF;
  END LOOP;
END;
$$;

-- Función 3: Ajuste manual de inventario
CREATE OR REPLACE FUNCTION public.process_stock_adjustment(
  p_raw_material_id UUID,
  p_warehouse_id UUID,
  p_lot_id UUID,
  p_adjustment_qty NUMERIC, -- Positivo = aumento, Negativo = disminución
  p_reason TEXT,
  p_adjusted_by_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id UUID;
  v_balance_id UUID;
  v_movement_type TEXT;
BEGIN
  -- Determinar tipo de movimiento
  IF p_adjustment_qty > 0 THEN
    v_movement_type := 'ENTRADA';
  ELSE
    v_movement_type := 'SALIDA';
  END IF;
  
  -- Asegurar balance
  v_balance_id := public.ensure_stock_balance(p_raw_material_id, p_warehouse_id, p_lot_id);
  
  -- Registrar movimiento
  INSERT INTO stock_movements (
    movement_type,
    raw_material_id,
    warehouse_id,
    lot_id,
    quantity_base_uom,
    reference_type,
    notes,
    created_by_user_id
  )
  VALUES (
    v_movement_type,
    p_raw_material_id,
    p_warehouse_id,
    p_lot_id,
    p_adjustment_qty,
    'AJUSTE',
    p_reason,
    p_adjusted_by_user_id
  )
  RETURNING id INTO v_movement_id;
  
  -- Actualizar balance
  UPDATE stock_balances
  SET 
    quantity_base_uom = quantity_base_uom + p_adjustment_qty,
    updated_at = now()
  WHERE id = v_balance_id;
  
  RETURN v_movement_id;
END;
$$;

-- Función 4: Transferencia entre almacenes
CREATE OR REPLACE FUNCTION public.process_stock_transfer(
  p_raw_material_id UUID,
  p_from_warehouse_id UUID,
  p_to_warehouse_id UUID,
  p_lot_id UUID,
  p_quantity NUMERIC,
  p_uom_id UUID,
  p_notes TEXT,
  p_transferred_by_user_id UUID
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_out_id UUID;
  v_movement_in_id UUID;
  v_balance_from_id UUID;
  v_balance_to_id UUID;
  v_quantity_base NUMERIC;
BEGIN
  -- Convertir a UOM base
  v_quantity_base := public.convert_uom_to_base(p_raw_material_id, p_uom_id, p_quantity);
  
  -- Asegurar balances
  v_balance_from_id := public.ensure_stock_balance(p_raw_material_id, p_from_warehouse_id, p_lot_id);
  v_balance_to_id := public.ensure_stock_balance(p_raw_material_id, p_to_warehouse_id, p_lot_id);
  
  -- Validar stock disponible en origen
  IF (SELECT quantity_base_uom FROM stock_balances WHERE id = v_balance_from_id) < v_quantity_base THEN
    RAISE EXCEPTION 'Stock insuficiente en almacén origen';
  END IF;
  
  -- Registrar salida del almacén origen
  INSERT INTO stock_movements (
    movement_type,
    raw_material_id,
    warehouse_id,
    lot_id,
    quantity_base_uom,
    uom_id,
    reference_type,
    notes,
    created_by_user_id
  )
  VALUES (
    'SALIDA',
    p_raw_material_id,
    p_from_warehouse_id,
    p_lot_id,
    -v_quantity_base,
    p_uom_id,
    'TRANSFERENCIA',
    format('Transferencia a almacén %s - %s', p_to_warehouse_id, p_notes),
    p_transferred_by_user_id
  )
  RETURNING id INTO v_movement_out_id;
  
  -- Registrar entrada al almacén destino
  INSERT INTO stock_movements (
    movement_type,
    raw_material_id,
    warehouse_id,
    lot_id,
    quantity_base_uom,
    uom_id,
    reference_type,
    notes,
    created_by_user_id
  )
  VALUES (
    'ENTRADA',
    p_raw_material_id,
    p_to_warehouse_id,
    p_lot_id,
    v_quantity_base,
    p_uom_id,
    'TRANSFERENCIA',
    format('Transferencia desde almacén %s - %s', p_from_warehouse_id, p_notes),
    p_transferred_by_user_id
  )
  RETURNING id INTO v_movement_in_id;
  
  -- Actualizar balance origen (descontar)
  UPDATE stock_balances
  SET 
    quantity_base_uom = quantity_base_uom - v_quantity_base,
    updated_at = now()
  WHERE id = v_balance_from_id;
  
  -- Actualizar balance destino (sumar)
  UPDATE stock_balances
  SET 
    quantity_base_uom = quantity_base_uom + v_quantity_base,
    updated_at = now()
  WHERE id = v_balance_to_id;
  
  -- Retornar ambos IDs de movimiento
  RETURN ARRAY[v_movement_out_id, v_movement_in_id];
END;
$$;

-- Comentarios de documentación
COMMENT ON FUNCTION public.process_purchase_receipt IS 'Procesa la recepción de una compra, creando entrada de stock y actualizando balances';
COMMENT ON FUNCTION public.deduct_from_recipe IS 'Descuenta automáticamente los ingredientes según una receta al procesar una venta';
COMMENT ON FUNCTION public.process_stock_adjustment IS 'Registra un ajuste manual de inventario (positivo o negativo)';
COMMENT ON FUNCTION public.process_stock_transfer IS 'Transfiere stock entre almacenes, registrando salida y entrada correspondientes';