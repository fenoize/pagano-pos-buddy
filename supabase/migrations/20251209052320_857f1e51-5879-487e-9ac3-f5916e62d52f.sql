-- Create RPC function to read stock balances bypassing RLS
CREATE OR REPLACE FUNCTION public.get_stock_balances(p_warehouse_id uuid)
RETURNS TABLE(raw_material_id uuid, qty_on_hand numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT sb.raw_material_id, sb.qty_on_hand
  FROM stock_balances sb
  WHERE sb.warehouse_id = p_warehouse_id;
END;
$$;