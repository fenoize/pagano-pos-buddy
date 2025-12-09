-- Create a comprehensive RPC function to handle full stock adjustment
CREATE OR REPLACE FUNCTION public.adjust_stock_quick(
  p_raw_material_id uuid,
  p_warehouse_id uuid,
  p_new_stock numeric,
  p_current_stock numeric,
  p_notes text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_adjustment numeric;
  v_move_id uuid;
  v_balance_exists boolean;
BEGIN
  -- Calculate adjustment
  v_adjustment := p_new_stock - p_current_stock;
  
  -- Skip if no change
  IF v_adjustment = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No change needed');
  END IF;
  
  -- Insert stock movement
  INSERT INTO stock_moves (
    raw_material_id,
    warehouse_id,
    move_type,
    qty_in,
    qty_out,
    notes,
    created_by
  ) VALUES (
    p_raw_material_id,
    p_warehouse_id,
    'adjustment',
    CASE WHEN v_adjustment > 0 THEN v_adjustment ELSE 0 END,
    CASE WHEN v_adjustment < 0 THEN ABS(v_adjustment) ELSE 0 END,
    COALESCE(p_notes, 'Conteo físico - Ajuste rápido'),
    p_user_id
  )
  RETURNING id INTO v_move_id;
  
  -- Check if balance exists
  SELECT EXISTS(
    SELECT 1 FROM stock_balances 
    WHERE raw_material_id = p_raw_material_id 
    AND warehouse_id = p_warehouse_id
  ) INTO v_balance_exists;
  
  -- Update or insert balance
  IF v_balance_exists THEN
    UPDATE stock_balances
    SET qty_on_hand = p_new_stock, updated_at = now()
    WHERE raw_material_id = p_raw_material_id 
    AND warehouse_id = p_warehouse_id;
  ELSE
    INSERT INTO stock_balances (raw_material_id, warehouse_id, qty_on_hand)
    VALUES (p_raw_material_id, p_warehouse_id, p_new_stock);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'move_id', v_move_id,
    'adjustment', v_adjustment
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;