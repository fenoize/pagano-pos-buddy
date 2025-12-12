-- Crear función RPC para obtener historial de runas con contexto
CREATE OR REPLACE FUNCTION public.get_runas_history_with_context(
  p_user_id uuid,
  p_customer_id uuid,
  p_type text DEFAULT NULL,
  p_origen text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_page integer DEFAULT 0,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transactions jsonb;
  v_count integer;
  v_offset integer;
BEGIN
  -- Establecer contexto de staff
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.user_id', p_user_id::text, true);
  END IF;

  v_offset := p_page * p_limit;

  -- Obtener conteo total
  SELECT COUNT(*) INTO v_count
  FROM runas_transactions
  WHERE customer_id = p_customer_id
    AND (p_type IS NULL OR type::text = p_type)
    AND (p_origen IS NULL OR origen::text = p_origen)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  -- Obtener transacciones
  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO v_transactions
  FROM (
    SELECT *
    FROM runas_transactions
    WHERE customer_id = p_customer_id
      AND (p_type IS NULL OR type::text = p_type)
      AND (p_origen IS NULL OR origen::text = p_origen)
      AND (p_date_from IS NULL OR created_at >= p_date_from)
      AND (p_date_to IS NULL OR created_at <= p_date_to)
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'success', true,
    'transactions', v_transactions,
    'total_count', v_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Crear función RPC para obtener pedidos del cliente con contexto
CREATE OR REPLACE FUNCTION public.get_customer_orders_with_context(
  p_user_id uuid,
  p_customer_id uuid,
  p_status text DEFAULT NULL,
  p_fulfillment text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_page integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_orders jsonb;
  v_count integer;
  v_offset integer;
BEGIN
  -- Establecer contexto de staff
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.user_id', p_user_id::text, true);
  END IF;

  v_offset := p_page * p_limit;

  -- Obtener conteo total
  SELECT COUNT(*) INTO v_count
  FROM orders
  WHERE customer_id = p_customer_id
    AND (p_status IS NULL OR status::text = p_status)
    AND (p_fulfillment IS NULL OR fulfillment::text = p_fulfillment)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  -- Obtener pedidos
  SELECT COALESCE(jsonb_agg(o ORDER BY o.created_at DESC), '[]'::jsonb) INTO v_orders
  FROM (
    SELECT o.id, o.order_number, o.customer_id, o.fulfillment, o.status,
           o.items, o.subtotal, o.delivery_fee, o.discount, o.total,
           o.payment_efectivo, o.payment_mp, o.payment_pos, o.payment_aplicacion,
           o.payment_runas, o.payment_method, o.delivery_address, o.delivery_number,
           o.delivery_comuna, o.delivery_distance, o.notes, o.created_at, o.updated_at
    FROM orders o
    WHERE o.customer_id = p_customer_id
      AND (p_status IS NULL OR o.status::text = p_status)
      AND (p_fulfillment IS NULL OR o.fulfillment::text = p_fulfillment)
      AND (p_date_from IS NULL OR o.created_at >= p_date_from)
      AND (p_date_to IS NULL OR o.created_at <= p_date_to)
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  ) o;

  RETURN jsonb_build_object(
    'success', true,
    'orders', v_orders,
    'total_count', v_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Crear función RPC para obtener estadísticas del cliente
CREATE OR REPLACE FUNCTION public.get_customer_order_stats_with_context(
  p_user_id uuid,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_orders integer;
  v_total_spent numeric;
  v_avg_order_value numeric;
  v_last_order_date timestamptz;
BEGIN
  -- Establecer contexto de staff
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.user_id', p_user_id::text, true);
  END IF;

  -- Calcular estadísticas de pedidos completados
  SELECT 
    COUNT(*),
    COALESCE(SUM(total), 0),
    COALESCE(AVG(total), 0),
    MAX(created_at)
  INTO v_total_orders, v_total_spent, v_avg_order_value, v_last_order_date
  FROM orders
  WHERE customer_id = p_customer_id
    AND status = 'Entregado';

  RETURN jsonb_build_object(
    'success', true,
    'total_orders', v_total_orders,
    'total_spent', v_total_spent,
    'average_order_value', v_avg_order_value,
    'last_order_date', v_last_order_date
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Crear función RPC para obtener direcciones del cliente con contexto
CREATE OR REPLACE FUNCTION public.get_customer_addresses_with_context(
  p_user_id uuid,
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_addresses jsonb;
BEGIN
  -- Establecer contexto de staff
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.user_id', p_user_id::text, true);
  END IF;

  SELECT COALESCE(jsonb_agg(a ORDER BY a.is_default DESC, a.created_at ASC), '[]'::jsonb) INTO v_addresses
  FROM addresses a
  WHERE a.customer_id = p_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'addresses', v_addresses
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Agregar política RLS para que staff pueda gestionar direcciones
CREATE POLICY "Staff can manage addresses"
ON public.addresses
FOR ALL
USING (is_active_staff_with_token())
WITH CHECK (is_active_staff_with_token());

-- Agregar política de INSERT para staff en runas_transactions cuando se usa RPC
-- (Ya existe la función insert_runas_transaction_with_context que es SECURITY DEFINER)