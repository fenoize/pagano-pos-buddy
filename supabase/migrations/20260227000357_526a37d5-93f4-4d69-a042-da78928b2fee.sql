
-- RPC para recepcionar un ítem de compra directa en inventario
-- Crea movimiento de stock y actualiza stock_balances con costo promedio ponderado
CREATE OR REPLACE FUNCTION public.receive_direct_purchase_item(
  p_request_item_id uuid,
  p_warehouse_id uuid,
  p_qty numeric,
  p_total_cost numeric,  -- costo TOTAL pagado (no unitario)
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_unit_cost numeric;
  v_stock_uom_id uuid;
  v_uom_name text;
  v_current_bal numeric;
  v_current_cost numeric;
  v_new_avg_cost numeric;
BEGIN
  -- Obtener el ítem de la solicitud
  SELECT pri.*, rm.name as material_name, rm.base_uom_id
  INTO v_item
  FROM purchase_request_items pri
  JOIN raw_materials rm ON rm.id = pri.raw_material_id
  WHERE pri.id = p_request_item_id;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Item de solicitud no encontrado: %', p_request_item_id;
  END IF;

  -- Calcular costo unitario
  IF p_qty > 0 AND p_total_cost > 0 THEN
    v_unit_cost := p_total_cost / p_qty;
  ELSE
    v_unit_cost := 0;
  END IF;

  -- Resolver UOM para stock_moves (tabla legada unit_of_measures)
  v_stock_uom_id := NULL;
  IF v_item.uom_id IS NOT NULL THEN
    SELECT u_new.name INTO v_uom_name FROM units_of_measure u_new WHERE u_new.id = v_item.uom_id;
    IF v_uom_name IS NOT NULL THEN
      SELECT u_old.id INTO v_stock_uom_id FROM unit_of_measures u_old WHERE lower(u_old.name) = lower(v_uom_name) LIMIT 1;
    END IF;
  END IF;
  IF v_stock_uom_id IS NULL AND v_item.base_uom_id IS NOT NULL THEN
    SELECT u_new.name INTO v_uom_name FROM units_of_measure u_new WHERE u_new.id = v_item.base_uom_id;
    IF v_uom_name IS NOT NULL THEN
      SELECT u_old.id INTO v_stock_uom_id FROM unit_of_measures u_old WHERE lower(u_old.name) = lower(v_uom_name) LIMIT 1;
    END IF;
  END IF;
  IF v_stock_uom_id IS NULL THEN
    SELECT u_old.id INTO v_stock_uom_id FROM unit_of_measures u_old LIMIT 1;
  END IF;

  -- Insertar movimiento de stock
  INSERT INTO stock_moves (
    warehouse_id, raw_material_id, move_type,
    qty_in, qty_out, uom_id, unit_cost, notes
  ) VALUES (
    p_warehouse_id, v_item.raw_material_id, 'purchase'::stock_move_type,
    p_qty, 0, v_stock_uom_id, v_unit_cost,
    COALESCE(p_notes, 'Compra directa - ' || v_item.material_name)
  );

  -- Upsert stock_balances con costo promedio ponderado
  SELECT qty_on_hand, avg_cost INTO v_current_bal, v_current_cost
  FROM stock_balances
  WHERE warehouse_id = p_warehouse_id AND raw_material_id = v_item.raw_material_id;

  IF v_current_bal IS NOT NULL AND (v_current_bal + p_qty) > 0 THEN
    v_new_avg_cost := ((v_current_bal * COALESCE(v_current_cost, 0)) + (p_qty * v_unit_cost)) / (v_current_bal + p_qty);
  ELSE
    v_new_avg_cost := v_unit_cost;
  END IF;

  INSERT INTO stock_balances (warehouse_id, raw_material_id, qty_on_hand, avg_cost)
  VALUES (p_warehouse_id, v_item.raw_material_id, p_qty, v_new_avg_cost)
  ON CONFLICT (warehouse_id, raw_material_id)
  DO UPDATE SET
    qty_on_hand = stock_balances.qty_on_hand + EXCLUDED.qty_on_hand,
    avg_cost = v_new_avg_cost,
    updated_at = now();

  -- Actualizar last_cost y last_supplier_id en raw_materials
  UPDATE raw_materials SET
    last_cost = v_unit_cost,
    last_supplier_id = v_item.actual_supplier_id,
    last_procurement_mode = 'compra_directa',
    updated_at = now()
  WHERE id = v_item.raw_material_id;
END;
$$;
