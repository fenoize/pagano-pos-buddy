-- Modificar la función para retornar la orden completa en lugar de solo id y order_number
CREATE OR REPLACE FUNCTION public.create_order_with_context(
  p_user_id uuid,
  p_order_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order record;
BEGIN
  -- Establecer contexto dentro de la transacción
  PERFORM set_config('app.user_id', p_user_id::text, false);
  PERFORM set_config('app.customer_id', '', false);
  PERFORM set_config('app.customer_account_id', '', false);
  
  -- Insertar la orden y capturar el registro completo
  INSERT INTO public.orders (
    customer_id,
    fulfillment,
    items,
    subtotal,
    delivery_fee,
    discount,
    total,
    payment_efectivo,
    payment_mp,
    payment_pos,
    payment_aplicacion,
    payment_runas,
    payment_method,
    status,
    created_by_user_id,
    nombre_resumen,
    notes,
    delivery_zone_id,
    delivery_zone_name,
    delivery_address,
    delivery_number,
    delivery_comuna_id,
    delivery_comuna,
    delivery_reference,
    delivery_person_id,
    delivery_person_name,
    combo_data,
    delivery_distance,
    cash_session_id
  )
  VALUES (
    NULLIF((p_order_data->>'customer_id'), '')::uuid,
    (p_order_data->>'fulfillment')::fulfillment_type,
    (p_order_data->'items')::jsonb,
    (p_order_data->>'subtotal')::integer,
    COALESCE((p_order_data->>'delivery_fee')::integer, 0),
    COALESCE((p_order_data->>'discount')::integer, 0),
    (p_order_data->>'total')::integer,
    COALESCE((p_order_data->>'payment_efectivo')::integer, 0),
    COALESCE((p_order_data->>'payment_mp')::integer, 0),
    COALESCE((p_order_data->>'payment_pos')::integer, 0),
    COALESCE((p_order_data->>'payment_aplicacion')::integer, 0),
    COALESCE((p_order_data->>'payment_runas')::integer, 0),
    (p_order_data->>'payment_method')::payment_method,
    'Pendiente'::order_status,
    p_user_id,
    p_order_data->>'nombre_resumen',
    p_order_data->>'notes',
    NULLIF((p_order_data->>'delivery_zone_id'), '')::uuid,
    p_order_data->>'delivery_zone_name',
    p_order_data->>'delivery_address',
    p_order_data->>'delivery_number',
    NULLIF((p_order_data->>'delivery_comuna_id'), '')::uuid,
    p_order_data->>'delivery_comuna',
    p_order_data->>'delivery_reference',
    NULLIF((p_order_data->>'delivery_person_id'), '')::uuid,
    p_order_data->>'delivery_person_name',
    (p_order_data->'combo_data')::jsonb,
    NULLIF((p_order_data->>'delivery_distance'), '')::numeric,
    NULLIF((p_order_data->>'cash_session_id'), '')::uuid
  )
  RETURNING * INTO v_order;
  
  -- Retornar el registro completo como JSON
  RETURN row_to_json(v_order)::jsonb;
END;
$function$;