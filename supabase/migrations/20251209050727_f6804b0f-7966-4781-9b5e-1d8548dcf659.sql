-- Create an RPC function to insert stock adjustments bypassing RLS
CREATE OR REPLACE FUNCTION public.insert_stock_adjustment(
  p_raw_material_id uuid,
  p_warehouse_id uuid,
  p_qty_in numeric,
  p_qty_out numeric,
  p_notes text,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_move_id uuid;
BEGIN
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
    p_qty_in,
    p_qty_out,
    p_notes,
    p_user_id
  )
  RETURNING id INTO v_move_id;
  
  RETURN v_move_id;
END;
$$;