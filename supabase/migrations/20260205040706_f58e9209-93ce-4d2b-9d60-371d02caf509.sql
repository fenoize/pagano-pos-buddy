-- 1. Agregar 'pendiente' al enum payment_method
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'pendiente';

-- 2. Agregar campo payment_status a orders para distinguir órdenes pagadas de pendientes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text 
  DEFAULT 'paid';

-- 3. Agregar constraint para valores permitidos (usando trigger en lugar de CHECK para flexibilidad)
CREATE OR REPLACE FUNCTION validate_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status NOT IN ('paid', 'unpaid', 'partial') THEN
    RAISE EXCEPTION 'Invalid payment_status: %. Must be paid, unpaid, or partial', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_payment_status ON orders;
CREATE TRIGGER trg_validate_payment_status
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_status();

-- 4. Índice parcial para consultas rápidas de pedidos pendientes
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_unpaid 
  ON orders(payment_status) WHERE payment_status = 'unpaid';

-- 5. Índice compuesto para consultas de pendientes por sesión de caja
CREATE INDEX IF NOT EXISTS idx_orders_pending_by_session 
  ON orders(cash_session_id, payment_status) WHERE payment_status = 'unpaid';

-- 6. Actualizar la función create_order_with_context para aceptar payment_status
CREATE OR REPLACE FUNCTION create_order_with_context(
  p_order_data jsonb,
  p_items jsonb,
  p_staff_user_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number bigint;
  v_item jsonb;
  v_result jsonb;
BEGIN
  -- Establecer contexto del staff si se proporciona
  IF p_staff_user_id IS NOT NULL THEN
    PERFORM set_config('app.current_staff_user_id', p_staff_user_id::text, true);
  END IF;

  -- Establecer contexto del cliente si se proporciona
  IF p_customer_id IS NOT NULL THEN
    PERFORM set_config('app.current_customer_id', p_customer_id::text, true);
  END IF;

  -- Insertar la orden
  INSERT INTO orders (
    customer_id,
    total,
    subtotal,
    discount,
    tip,
    fulfillment,
    status,
    payment_method,
    payment_status,
    payment_efectivo,
    payment_mp,
    payment_pos,
    payment_runas,
    cash_session_id,
    delivery_fee,
    delivery_distance_km,
    delivery_zone_id,
    address_id,
    customer_name,
    customer_phone,
    delivery_address,
    notes,
    source,
    coupon_discount,
    coupon_code
  ) VALUES (
    (p_order_data->>'customer_id')::uuid,
    COALESCE((p_order_data->>'total')::numeric, 0),
    COALESCE((p_order_data->>'subtotal')::numeric, 0),
    COALESCE((p_order_data->>'discount')::numeric, 0),
    COALESCE((p_order_data->>'tip')::numeric, 0),
    COALESCE(p_order_data->>'fulfillment', 'Retiro'),
    COALESCE(p_order_data->>'status', 'Pendiente'),
    COALESCE((p_order_data->>'payment_method')::payment_method, 'efectivo'),
    COALESCE(p_order_data->>'payment_status', 'paid'),
    COALESCE((p_order_data->>'payment_efectivo')::numeric, 0),
    COALESCE((p_order_data->>'payment_mp')::numeric, 0),
    COALESCE((p_order_data->>'payment_pos')::numeric, 0),
    COALESCE((p_order_data->>'payment_runas')::numeric, 0),
    (p_order_data->>'cash_session_id')::uuid,
    COALESCE((p_order_data->>'delivery_fee')::numeric, 0),
    (p_order_data->>'delivery_distance_km')::numeric,
    (p_order_data->>'delivery_zone_id')::uuid,
    (p_order_data->>'address_id')::uuid,
    p_order_data->>'customer_name',
    p_order_data->>'customer_phone',
    p_order_data->>'delivery_address',
    p_order_data->>'notes',
    COALESCE(p_order_data->>'source', 'pos'),
    COALESCE((p_order_data->>'coupon_discount')::numeric, 0),
    p_order_data->>'coupon_code'
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  -- Insertar los items de la orden
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      variant_id,
      variant_name,
      quantity,
      unit_price,
      extras,
      modifiers,
      notes,
      combo_items
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'variant_id')::uuid,
      v_item->>'variant_name',
      COALESCE((v_item->>'quantity')::integer, 1),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE(v_item->'extras', '[]'::jsonb),
      COALESCE(v_item->'modifiers', '[]'::jsonb),
      v_item->>'notes',
      v_item->'combo_items'
    );
  END LOOP;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;