-- Fix create_order_with_context to persist pickup_mode
CREATE OR REPLACE FUNCTION public.create_order_with_context(
  p_user_id uuid,
  p_order_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number integer;
  v_items jsonb;
  v_item jsonb;
  v_customer_id uuid;
  v_customer_name text;
  v_customer_phone text;
  v_customer_rut text;
  v_session_id uuid;
  v_fulfillment text;
  v_status text;
  v_delivery_address text;
  v_delivery_comuna text;
  v_delivery_fee numeric;
  v_payment_efectivo numeric;
  v_payment_mp numeric;
  v_payment_pos numeric;
  v_payment_runas numeric;
  v_tip numeric;
  v_notes text;
  v_total numeric;
  v_discount numeric;
  v_subtotal numeric;
  v_zona_id uuid;
  v_delivery_distance numeric;
  v_coupon_code text;
  v_mp_preference_id text;
  v_source text;
  v_pickup_mode text;
BEGIN
  -- Extract order data
  v_items := p_order_data->'items';
  v_customer_id := NULLIF((p_order_data->>'customer_id'), '')::uuid;
  v_customer_name := p_order_data->>'customer_name';
  v_customer_phone := p_order_data->>'customer_phone';
  v_customer_rut := p_order_data->>'customer_rut';
  v_session_id := NULLIF((p_order_data->>'session_id'), '')::uuid;
  v_fulfillment := COALESCE(p_order_data->>'fulfillment', 'retiro');
  v_status := COALESCE(p_order_data->>'status', 'Pendiente');
  v_delivery_address := p_order_data->>'delivery_address';
  v_delivery_comuna := p_order_data->>'delivery_comuna';
  v_delivery_fee := COALESCE((p_order_data->>'delivery_fee')::numeric, 0);
  v_payment_efectivo := COALESCE((p_order_data->>'payment_efectivo')::numeric, 0);
  v_payment_mp := COALESCE((p_order_data->>'payment_mp')::numeric, 0);
  v_payment_pos := COALESCE((p_order_data->>'payment_pos')::numeric, 0);
  v_payment_runas := COALESCE((p_order_data->>'payment_runas')::numeric, 0);
  v_tip := COALESCE((p_order_data->>'tip')::numeric, 0);
  v_notes := p_order_data->>'notes';
  v_total := COALESCE((p_order_data->>'total')::numeric, 0);
  v_discount := COALESCE((p_order_data->>'discount')::numeric, 0);
  v_subtotal := COALESCE((p_order_data->>'subtotal')::numeric, 0);
  v_zona_id := NULLIF((p_order_data->>'zona_id'), '')::uuid;
  v_delivery_distance := (p_order_data->>'delivery_distance')::numeric;
  v_coupon_code := p_order_data->>'coupon_code';
  v_mp_preference_id := p_order_data->>'mp_preference_id';
  v_source := COALESCE(p_order_data->>'source', 'pos');
  v_pickup_mode := NULLIF((p_order_data->>'pickup_mode'), '');

  -- Generate order number
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO v_order_number FROM orders;

  -- Create order
  INSERT INTO public.orders (
    id,
    order_number,
    user_id,
    customer_id,
    customer_name,
    customer_phone,
    customer_rut,
    session_id,
    fulfillment,
    pickup_mode,
    status,
    delivery_address,
    delivery_comuna,
    delivery_fee,
    payment_efectivo,
    payment_mp,
    payment_pos,
    payment_runas,
    tip,
    notes,
    total,
    discount,
    subtotal,
    zona_id,
    delivery_distance,
    coupon_code,
    mp_preference_id,
    source,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_order_number,
    p_user_id,
    v_customer_id,
    v_customer_name,
    v_customer_phone,
    v_customer_rut,
    v_session_id,
    v_fulfillment,
    v_pickup_mode,
    v_status,
    v_delivery_address,
    v_delivery_comuna,
    v_delivery_fee,
    v_payment_efectivo,
    v_payment_mp,
    v_payment_pos,
    v_payment_runas,
    v_tip,
    v_notes,
    v_total,
    v_discount,
    v_subtotal,
    v_zona_id,
    v_delivery_distance,
    v_coupon_code,
    v_mp_preference_id,
    v_source,
    now(),
    now()
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    INSERT INTO public.order_items (
      id,
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
      is_combo,
      combo_items,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      NULLIF((v_item->>'product_id'), '')::uuid,
      v_item->>'product_name',
      NULLIF((v_item->>'variant_id'), '')::uuid,
      v_item->>'variant_name',
      COALESCE((v_item->>'quantity')::integer, 1),
      COALESCE((v_item->>'unit_price')::numeric, 0),
      COALESCE(v_item->'extras', '[]'::jsonb),
      COALESCE(v_item->'modifiers', '[]'::jsonb),
      v_item->>'notes',
      COALESCE((v_item->>'is_combo')::boolean, false),
      v_item->'combo_items',
      now()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;