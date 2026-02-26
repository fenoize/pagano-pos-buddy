
DROP FUNCTION IF EXISTS public.receive_purchase_items(uuid, jsonb, boolean);

CREATE FUNCTION public.receive_purchase_items(
  p_order_id uuid,
  p_receipts jsonb,
  p_ingress_to_inventory boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt jsonb;
  v_item_id uuid;
  v_qty_received numeric;
  v_item record;
  v_order record;
  v_all_received boolean;
  v_any_received boolean;
  v_stock_uom_id uuid;
  v_uom_name text;
  v_current_bal numeric;
  v_current_cost numeric;
  v_new_avg_cost numeric;
BEGIN
  SELECT * INTO v_order FROM purchase_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Orden de compra no encontrada: %', p_order_id;
  END IF;

  v_any_received := false;

  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    v_item_id := COALESCE((v_receipt->>'itemId')::uuid, (v_receipt->>'item_id')::uuid);
    v_qty_received := COALESCE((v_receipt->>'qtyReceived')::numeric, (v_receipt->>'qty_received')::numeric);

    IF v_qty_received IS NULL OR v_qty_received <= 0 THEN CONTINUE; END IF;

    SELECT pi.*, rm.name as material_name, rm.base_uom_id
    INTO v_item
    FROM purchase_items pi
    JOIN raw_materials rm ON rm.id = pi.raw_material_id
    WHERE pi.id = v_item_id AND pi.purchase_id = p_order_id;

    IF v_item IS NULL THEN
      RAISE EXCEPTION 'Item % no pertenece a la orden %', v_item_id, p_order_id;
    END IF;

    -- Clamp: no recibir más que pendiente
    v_qty_received := LEAST(v_qty_received, GREATEST(v_item.qty - v_item.qty_received, 0));
    IF v_qty_received <= 0 THEN CONTINUE; END IF;

    -- Actualizar qty_received en purchase_items
    UPDATE purchase_items SET qty_received = qty_received + v_qty_received WHERE id = v_item_id;
    v_any_received := true;

    IF p_ingress_to_inventory THEN
      -- Resolver UOM para stock_moves (tabla legada unit_of_measures)
      v_stock_uom_id := NULL;
      SELECT u_new.name INTO v_uom_name FROM units_of_measure u_new WHERE u_new.id = v_item.uom_id;
      IF v_uom_name IS NOT NULL THEN
        SELECT u_old.id INTO v_stock_uom_id FROM unit_of_measures u_old WHERE lower(u_old.name) = lower(v_uom_name) LIMIT 1;
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

      -- INSERT stock_moves con move_type correcto
      INSERT INTO stock_moves (
        warehouse_id, raw_material_id, move_type,
        qty_in, qty_out, uom_id, unit_cost, notes, related_purchase_id
      ) VALUES (
        v_order.warehouse_id, v_item.raw_material_id, 'purchase'::stock_move_type,
        v_qty_received, 0, v_stock_uom_id, v_item.unit_cost,
        'Recepción OC ' || v_order.po_number, p_order_id
      );

      -- UPSERT stock_balances con qty_on_hand y avg_cost
      SELECT qty_on_hand, avg_cost INTO v_current_bal, v_current_cost
      FROM stock_balances
      WHERE warehouse_id = v_order.warehouse_id AND raw_material_id = v_item.raw_material_id;

      IF v_current_bal IS NOT NULL AND (v_current_bal + v_qty_received) > 0 THEN
        v_new_avg_cost := ((v_current_bal * COALESCE(v_current_cost, 0)) + (v_qty_received * COALESCE(v_item.unit_cost, 0))) / (v_current_bal + v_qty_received);
      ELSE
        v_new_avg_cost := COALESCE(v_item.unit_cost, 0);
      END IF;

      INSERT INTO stock_balances (warehouse_id, raw_material_id, qty_on_hand, avg_cost)
      VALUES (v_order.warehouse_id, v_item.raw_material_id, v_qty_received, v_new_avg_cost)
      ON CONFLICT (warehouse_id, raw_material_id)
      DO UPDATE SET
        qty_on_hand = stock_balances.qty_on_hand + EXCLUDED.qty_on_hand,
        avg_cost = v_new_avg_cost,
        updated_at = now();
    END IF;
  END LOOP;

  IF v_any_received THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM purchase_items WHERE purchase_id = p_order_id AND qty_received < qty
    ) INTO v_all_received;

    IF v_all_received THEN
      UPDATE purchase_orders SET status = 'received', received_date = now() WHERE id = p_order_id;
    ELSE
      UPDATE purchase_orders SET status = 'partial' WHERE id = p_order_id AND status != 'received';
    END IF;
  END IF;
END;
$$;
