-- Fix process_stock_adjustment function to use correct table and column names
CREATE OR REPLACE FUNCTION public.process_stock_adjustment(
  p_raw_material_id uuid, 
  p_warehouse_id uuid, 
  p_lot_id uuid, 
  p_adjustment_qty numeric, 
  p_reason text, 
  p_adjusted_by_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_movement_id UUID;
  v_move_type TEXT;
  v_qty_in NUMERIC := 0;
  v_qty_out NUMERIC := 0;
BEGIN
  -- Determine move type and quantities
  IF p_adjustment_qty > 0 THEN
    v_move_type := 'adjustment_in';
    v_qty_in := p_adjustment_qty;
  ELSE
    v_move_type := 'adjustment_out';
    v_qty_out := ABS(p_adjustment_qty);
  END IF;
  
  -- Ensure balance exists
  INSERT INTO stock_balances (raw_material_id, warehouse_id, qty_on_hand, avg_cost, updated_at)
  VALUES (p_raw_material_id, p_warehouse_id, 0, 0, now())
  ON CONFLICT (raw_material_id, warehouse_id) DO NOTHING;
  
  -- Record movement in stock_moves
  INSERT INTO stock_moves (
    move_type,
    raw_material_id,
    warehouse_id,
    related_lot_id,
    qty_in,
    qty_out,
    notes,
    created_by,
    created_at
  )
  VALUES (
    v_move_type::stock_move_type,
    p_raw_material_id,
    p_warehouse_id,
    p_lot_id,
    v_qty_in,
    v_qty_out,
    p_reason,
    p_adjusted_by_user_id,
    now()
  )
  RETURNING id INTO v_movement_id;
  
  -- Update balance
  UPDATE stock_balances
  SET 
    qty_on_hand = qty_on_hand + p_adjustment_qty,
    updated_at = now()
  WHERE raw_material_id = p_raw_material_id 
    AND warehouse_id = p_warehouse_id;
  
  RETURN v_movement_id;
END;
$function$;