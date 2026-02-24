
-- RPC to fetch all purchase orders with supplier and warehouse (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_purchase_orders()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT po.*,
      row_to_json(s) as supplier,
      row_to_json(w) as warehouse
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    LEFT JOIN warehouses w ON w.id = po.warehouse_id
    ORDER BY po.created_at DESC
  ) t;
  
  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- RPC to fetch a single purchase order with items
CREATE OR REPLACE FUNCTION public.get_purchase_order_detail(p_order_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order json;
  v_items json;
BEGIN
  SELECT row_to_json(t) INTO v_order
  FROM (
    SELECT po.*,
      row_to_json(s) as supplier,
      row_to_json(w) as warehouse
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    LEFT JOIN warehouses w ON w.id = po.warehouse_id
    WHERE po.id = p_order_id
  ) t;

  IF v_order IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_agg(row_to_json(i))
  INTO v_items
  FROM (
    SELECT pi.*,
      row_to_json(rm) as raw_material,
      row_to_json(u) as uom
    FROM purchase_items pi
    LEFT JOIN raw_materials rm ON rm.id = pi.raw_material_id
    LEFT JOIN units_of_measure u ON u.id = pi.uom_id
    WHERE pi.purchase_id = p_order_id
    ORDER BY pi.created_at
  ) i;

  RETURN (v_order::jsonb || jsonb_build_object('items', COALESCE(v_items, '[]'::json)))::json;
END;
$$;

-- RPC to receive items and update stock (bypasses RLS on stock_balances)
CREATE OR REPLACE FUNCTION public.receive_purchase_items(
  p_order_id uuid,
  p_receipts jsonb,
  p_ingress_to_inventory boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_item record;
  v_receipt jsonb;
  v_new_qty_received numeric;
  v_all_received boolean;
  v_some_received boolean;
  v_current_balance numeric;
BEGIN
  -- Get order
  SELECT * INTO v_order FROM purchase_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;

  -- Process each receipt
  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    SELECT * INTO v_item 
    FROM purchase_items 
    WHERE id = (v_receipt->>'itemId')::uuid;
    
    IF v_item IS NULL THEN CONTINUE; END IF;

    v_new_qty_received := COALESCE(v_item.qty_received, 0) + (v_receipt->>'qtyReceived')::numeric;

    UPDATE purchase_items
    SET qty_received = v_new_qty_received
    WHERE id = v_item.id;

    -- Create stock movement and update balance if ingressing
    IF p_ingress_to_inventory AND (v_receipt->>'qtyReceived')::numeric > 0 THEN
      INSERT INTO stock_moves (
        move_type, raw_material_id, warehouse_id,
        qty_in, qty_out, uom_id, unit_cost,
        related_purchase_id, notes
      ) VALUES (
        'purchase',
        v_item.raw_material_id,
        v_order.warehouse_id,
        (v_receipt->>'qtyReceived')::numeric,
        0,
        v_item.uom_id,
        v_item.unit_cost,
        p_order_id,
        'Recepción OC ' || v_order.po_number
      );

      -- Upsert stock balance
      SELECT qty_on_hand INTO v_current_balance
      FROM stock_balances
      WHERE raw_material_id = v_item.raw_material_id
        AND warehouse_id = v_order.warehouse_id;

      IF v_current_balance IS NOT NULL THEN
        UPDATE stock_balances
        SET qty_on_hand = qty_on_hand + (v_receipt->>'qtyReceived')::numeric,
            last_cost = v_item.unit_cost,
            updated_at = now()
        WHERE raw_material_id = v_item.raw_material_id
          AND warehouse_id = v_order.warehouse_id;
      ELSE
        INSERT INTO stock_balances (raw_material_id, warehouse_id, qty_on_hand, last_cost, updated_at)
        VALUES (v_item.raw_material_id, v_order.warehouse_id, (v_receipt->>'qtyReceived')::numeric, v_item.unit_cost, now());
      END IF;
    END IF;
  END LOOP;

  -- Check order completion status
  SELECT 
    bool_and(COALESCE(qty_received, 0) >= qty),
    bool_or(COALESCE(qty_received, 0) > 0)
  INTO v_all_received, v_some_received
  FROM purchase_items
  WHERE purchase_id = p_order_id;

  IF v_all_received THEN
    UPDATE purchase_orders SET status = 'received', received_date = now() WHERE id = p_order_id;
  ELSIF v_some_received THEN
    UPDATE purchase_orders SET status = 'partial' WHERE id = p_order_id;
  END IF;

  RETURN true;
END;
$$;
