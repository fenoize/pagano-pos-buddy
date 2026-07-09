
-- Función para acumular runas por compra al entregar un pedido
CREATE OR REPLACE FUNCTION public.accrue_runas_for_order(
  p_customer_id uuid,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_runa_value integer;
  v_min_amount integer;
  v_max_per_order integer;
  v_exclude_discounted boolean;
  v_exclude_paid_runas boolean;
  v_real_amount numeric;
  v_runas integer;
BEGIN
  IF p_customer_id IS NULL OR p_order_id IS NULL THEN
    RETURN jsonb_build_object('runas', 0, 'reason', 'missing_ids');
  END IF;

  -- Idempotencia: si ya se acumularon runas para esta orden, no hacer nada
  IF EXISTS (
    SELECT 1 FROM runas_transactions
    WHERE order_id = p_order_id AND type = 'acumulacion'
  ) THEN
    RETURN jsonb_build_object('runas', 0, 'reason', 'already_accrued');
  END IF;

  SELECT total, discount, payment_runas, payment_method, order_number
  INTO v_order
  FROM orders
  WHERE id = p_order_id AND customer_id = p_customer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('runas', 0, 'reason', 'order_not_found');
  END IF;

  -- Leer configuración
  SELECT COALESCE((value)::text::integer, 5000) INTO v_runa_value
    FROM config WHERE key = 'runa_value';
  SELECT COALESCE((value)::text::integer, 5000) INTO v_min_amount
    FROM config WHERE key = 'runas_min_eligible_amount';
  SELECT COALESCE((value)::text::integer, 50) INTO v_max_per_order
    FROM config WHERE key = 'max_runas_per_order';
  SELECT COALESCE((value)::text::boolean, true) INTO v_exclude_discounted
    FROM config WHERE key = 'runas_exclude_if_discounted';
  SELECT COALESCE((value)::text::boolean, true) INTO v_exclude_paid_runas
    FROM config WHERE key = 'runas_exclude_if_paid_with_runas';

  -- Reglas de exclusión
  IF v_exclude_paid_runas AND (COALESCE(v_order.payment_runas, 0) > 0 OR v_order.payment_method = 'runas') THEN
    RETURN jsonb_build_object('runas', 0, 'reason', 'paid_with_runas');
  END IF;

  IF v_exclude_discounted AND COALESCE(v_order.discount, 0) > 0 THEN
    RETURN jsonb_build_object('runas', 0, 'reason', 'discounted');
  END IF;

  v_real_amount := GREATEST(0, COALESCE(v_order.total, 0) - COALESCE(v_order.payment_runas, 0));

  IF v_real_amount < COALESCE(v_min_amount, 0) THEN
    RETURN jsonb_build_object('runas', 0, 'reason', 'below_min');
  END IF;

  v_runas := floor(v_real_amount / GREATEST(v_runa_value, 1))::integer;
  IF v_max_per_order IS NOT NULL AND v_max_per_order > 0 THEN
    v_runas := LEAST(v_runas, v_max_per_order);
  END IF;

  IF v_runas <= 0 THEN
    RETURN jsonb_build_object('runas', 0, 'reason', 'zero_runas');
  END IF;

  INSERT INTO runas_transactions (
    customer_id, order_id, type, runas, amount, origen, motivo
  ) VALUES (
    p_customer_id, p_order_id, 'acumulacion', v_runas, v_real_amount::integer, 'Web',
    'Acumulación por compra #' || v_order.order_number::text
  );

  -- Acumular puntos también (idempotente por diseño)
  BEGIN
    PERFORM public.accrue_points_for_order(p_customer_id, p_order_id);
  EXCEPTION WHEN OTHERS THEN
    -- No fallar si accrue_points_for_order tiene problemas
    NULL;
  END;

  RETURN jsonb_build_object('runas', v_runas, 'amount', v_real_amount, 'reason', 'ok');
END;
$$;

-- Modificar update_order_status para acumular runas al Entregar
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_new_status order_status, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated_order RECORD;
  v_old_status text;
  v_customer_id uuid;
BEGIN
  IF NOT public.has_user_active_session(p_user_id) THEN
    RAISE EXCEPTION 'Usuario no tiene sesión activa para actualizar órdenes';
  END IF;

  PERFORM set_config('app.user_id', p_user_id::text, true);

  SELECT status, customer_id INTO v_old_status, v_customer_id
  FROM public.orders WHERE id = p_order_id;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;

  UPDATE public.orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_updated_order;

  INSERT INTO public.order_audits (order_id, user_id, field_name, old_value, new_value, reason)
  VALUES (p_order_id, p_user_id, 'status', v_old_status, p_new_status::text, 'Cambio de estado');

  -- Acumular runas al entregar
  IF p_new_status::text = 'Entregado' AND v_old_status <> 'Entregado' AND v_customer_id IS NOT NULL THEN
    BEGIN
      PERFORM public.accrue_runas_for_order(v_customer_id, p_order_id);
    EXCEPTION WHEN OTHERS THEN
      -- No fallar el update por un error en acumulación
      RAISE WARNING 'accrue_runas_for_order falló: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'status', v_updated_order.status,
    'updated_at', v_updated_order.updated_at
  );
END;
$$;

-- Backfill: acumular runas del pedido 3771
DO $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT public.accrue_runas_for_order(
    'e100aaef-c87f-4888-a7de-ce7d29cee894'::uuid,
    '961f9466-af9e-451c-907d-3cf68d4afe6c'::uuid
  ) INTO v_res;
  RAISE NOTICE 'Backfill pedido 3771: %', v_res;
END $$;
