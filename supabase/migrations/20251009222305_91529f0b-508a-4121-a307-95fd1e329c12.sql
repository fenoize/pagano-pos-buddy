-- Paso 1: Revertir las funciones de contexto a transaccional (false)
CREATE OR REPLACE FUNCTION public.set_staff_context(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, false);
  PERFORM set_config('app.customer_id', '', false);
  PERFORM set_config('app.customer_account_id', '', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_customer_context(p_account_id uuid, p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.customer_account_id', p_account_id::text, false);
  PERFORM set_config('app.customer_id', p_customer_id::text, false);
  PERFORM set_config('app.user_id', '', false);
END;
$function$;

-- Paso 2: Actualizar la política RLS de INSERT
DROP POLICY IF EXISTS "Cajero and Admin can create orders" ON public.orders;

CREATE POLICY "Staff can create orders" 
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  -- El usuario actual debe tener rol Cajero o Administrador
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = get_current_staff_user_id()
      AND role IN ('Cajero', 'Administrador')
  )
  -- Y el created_by_user_id debe coincidir con el usuario actual
  AND created_by_user_id = get_current_staff_user_id()
);

-- Paso 3: Crear función para crear orden con contexto en una transacción
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
  v_order_id uuid;
  v_order_number integer;
BEGIN
  -- Establecer contexto dentro de la transacción
  PERFORM set_config('app.user_id', p_user_id::text, false);
  PERFORM set_config('app.customer_id', '', false);
  PERFORM set_config('app.customer_account_id', '', false);
  
  -- Insertar la orden y capturar el ID y número
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
  RETURNING id, order_number INTO v_order_id, v_order_number;
  
  -- Retornar el resultado
  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number
  );
END;
$function$;