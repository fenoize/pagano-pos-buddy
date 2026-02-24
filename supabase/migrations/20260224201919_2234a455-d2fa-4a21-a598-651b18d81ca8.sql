CREATE OR REPLACE FUNCTION public.receive_purchase_items(
  p_order_id uuid,
  p_receipts jsonb,
  p_ingress_to_inventory boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order record;
  v_item record;
  v_receipt jsonb;
  v_new_qty_received numeric;
  v_all_received boolean;
  v_some_received boolean;
  v_current_balance numeric;
  v_qty_received numeric;
  v_receipt_item_id uuid;
  v_stock_uom_id uuid;
  v_uom_code text;
BEGIN
  SELECT * INTO v_order
  FROM purchase_orders
  WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;

  FOR v_receipt IN SELECT * FROM jsonb_array_elements(p_receipts)
  LOOP
    v_receipt_item_id := COALESCE(
      NULLIF(v_receipt->>'itemId', '')::uuid,
      NULLIF(v_receipt->>'item_id', '')::uuid
    );

    IF v_receipt_item_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO v_item
    FROM purchase_items
    WHERE id = v_receipt_item_id
      AND purchase_id = p_order_id;

    IF v_item IS NULL THEN
      CONTINUE;
    END IF;

    v_qty_received := GREATEST(0, COALESCE(
      NULLIF(v_receipt->>'qtyReceived', '')::numeric,
      NULLIF(v_receipt->>'qty_received', '')::numeric,
      0
    ));

    IF v_qty_received = 0 THEN
      CONTINUE;
    END IF;

    v_new_qty_received := LEAST(v_item.qty, COALESCE(v_item.qty_received, 0) + v_qty_received);

    UPDATE purchase_items
    SET qty_received = v_new_qty_received
    WHERE id = v_item.id;

    IF p_ingress_to_inventory THEN
      v_stock_uom_id := NULL;

      IF v_item.uom_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM unit_of_measures um WHERE um.id = v_item.uom_id
      ) THEN
        v_stock_uom_id := v_item.uom_id;
      END IF;

      IF v_stock_uom_id IS NULL AND v_item.uom_id IS NOT NULL THEN
        SELECT u_new.code INTO v_uom_code
        FROM units_of_measure u_new
        WHERE u_new.id = v_item.uom_id;

        IF v_uom_code IS NOT NULL THEN
          SELECT u_old.id INTO v_stock_uom_id
          FROM unit_of_measures u_old
          WHERE lower(u_old.code) = lower(v_uom_code)
          LIMIT 1;
        END IF;
      END IF;

      IF v_stock_uom_id IS NULL THEN
        SELECT rm.uom_id INTO v_stock_uom_id
        FROM raw_materials rm
        WHERE rm.id = v_item.raw_material_id
          AND rm.uom_id IS NOT NULL
        LIMIT 1;
      END IF;

      IF v_stock_uom_id IS NULL THEN
        RAISE EXCEPTION 'No existe equivalencia de unidad para el item % (uom_id=%)', v_item.id, v_item.uom_id;
      END IF;

      INSERT INTO stock_moves (
        move_type,
        raw_material_id,
        warehouse_id,
        qty_in,
        qty_out,
        uom_id,
        unit_cost,
        related_purchase_id,
        notes
      ) VALUES (
        'purchase',
        v_item.raw_material_id,
        v_order.warehouse_id,
        v_qty_received,
        0,
        v_stock_uom_id,
        v_item.unit_cost,
        p_order_id,
        'Recepción OC ' || v_order.po_number
      );

      SELECT qty_on_hand INTO v_current_balance
      FROM stock_balances
      WHERE raw_material_id = v_item.raw_material_id
        AND warehouse_id = v_order.warehouse_id;

      IF v_current_balance IS NOT NULL THEN
        UPDATE stock_balances
        SET qty_on_hand = qty_on_hand + v_qty_received,
            last_cost = v_item.unit_cost,
            updated_at = now()
        WHERE raw_material_id = v_item.raw_material_id
          AND warehouse_id = v_order.warehouse_id;
      ELSE
        INSERT INTO stock_balances (
          raw_material_id,
          warehouse_id,
          qty_on_hand,
          last_cost,
          updated_at
        ) VALUES (
          v_item.raw_material_id,
          v_order.warehouse_id,
          v_qty_received,
          v_item.unit_cost,
          now()
        );
      END IF;
    END IF;
  END LOOP;

  SELECT
    bool_and(COALESCE(qty_received, 0) >= qty),
    bool_or(COALESCE(qty_received, 0) > 0)
  INTO v_all_received, v_some_received
  FROM purchase_items
  WHERE purchase_id = p_order_id;

  IF v_all_received THEN
    UPDATE purchase_orders
    SET status = 'received',
        received_date = now()
    WHERE id = p_order_id;
  ELSIF v_some_received THEN
    UPDATE purchase_orders
    SET status = 'partial'
    WHERE id = p_order_id;
  END IF;

  RETURN true;
END;
$$;