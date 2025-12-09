-- Drop and recreate the process_stock_transfer function with correct schema
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
  v_quantity_base NUMERIC;
  v_current_stock NUMERIC;
BEGIN
  -- Get conversion factor to base UOM
  v_quantity_base := p_quantity;
  
  -- Try to convert if UOM is different from base
  BEGIN
    SELECT p_quantity * COALESCE(uom.conversion_factor, 1)
    INTO v_quantity_base
    FROM units_of_measure uom
    WHERE uom.id = p_uom_id;
  EXCEPTION WHEN OTHERS THEN
    v_quantity_base := p_quantity;
  END;
  
  -- Check current stock in source warehouse
  SELECT COALESCE(qty_on_hand, 0) INTO v_current_stock
  FROM stock_balances
  WHERE raw_material_id = p_raw_material_id 
    AND warehouse_id = p_from_warehouse_id;
  
  IF v_current_stock IS NULL OR v_current_stock < v_quantity_base THEN
    RAISE EXCEPTION 'Stock insuficiente en almacén origen. Disponible: %, Requerido: %', 
      COALESCE(v_current_stock, 0), v_quantity_base;
  END IF;
  
  -- Insert transfer OUT movement (from source warehouse)
  INSERT INTO stock_moves (
    move_type,
    raw_material_id,
    warehouse_id,
    related_lot_id,
    qty_in,
    qty_out,
    uom_id,
    notes,
    created_by
  )
  VALUES (
    'transfer_out',
    p_raw_material_id,
    p_from_warehouse_id,
    p_lot_id,
    0,
    v_quantity_base,
    p_uom_id,
    COALESCE(p_notes, '') || ' (Destino: ' || p_to_warehouse_id::text || ')',
    p_transferred_by_user_id
  )
  RETURNING id INTO v_movement_out_id;
  
  -- Insert transfer IN movement (to destination warehouse)
  INSERT INTO stock_moves (
    move_type,
    raw_material_id,
    warehouse_id,
    related_lot_id,
    qty_in,
    qty_out,
    uom_id,
    notes,
    created_by
  )
  VALUES (
    'transfer_in',
    p_raw_material_id,
    p_to_warehouse_id,
    p_lot_id,
    v_quantity_base,
    0,
    p_uom_id,
    COALESCE(p_notes, '') || ' (Origen: ' || p_from_warehouse_id::text || ')',
    p_transferred_by_user_id
  )
  RETURNING id INTO v_movement_in_id;
  
  -- Update source warehouse balance (subtract)
  INSERT INTO stock_balances (raw_material_id, warehouse_id, qty_on_hand, updated_at)
  VALUES (p_raw_material_id, p_from_warehouse_id, -v_quantity_base, now())
  ON CONFLICT (raw_material_id, warehouse_id) 
  DO UPDATE SET 
    qty_on_hand = stock_balances.qty_on_hand - v_quantity_base,
    updated_at = now();
  
  -- Update destination warehouse balance (add)
  INSERT INTO stock_balances (raw_material_id, warehouse_id, qty_on_hand, updated_at)
  VALUES (p_raw_material_id, p_to_warehouse_id, v_quantity_base, now())
  ON CONFLICT (raw_material_id, warehouse_id) 
  DO UPDATE SET 
    qty_on_hand = stock_balances.qty_on_hand + v_quantity_base,
    updated_at = now();
  
  -- Return both movement IDs
  RETURN ARRAY[v_movement_out_id, v_movement_in_id];
END;
$$;