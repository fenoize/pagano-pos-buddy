-- Add payment method columns to online_order_settings
ALTER TABLE public.online_order_settings
ADD COLUMN IF NOT EXISTS runas_payment_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mp_payment_enabled boolean DEFAULT true;

COMMENT ON COLUMN online_order_settings.runas_payment_enabled IS 'Permite pagos con runas desde la app de cliente';
COMMENT ON COLUMN online_order_settings.mp_payment_enabled IS 'Permite pagos con MercadoPago desde la app de cliente';

-- Update RPC functions to include new fields
CREATE OR REPLACE FUNCTION public.get_online_order_settings(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_settings jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'app_orders_enabled', app_orders_enabled,
    'app_pickup_enabled', app_pickup_enabled,
    'app_delivery_enabled', app_delivery_enabled,
    'mp_enabled', mp_enabled,
    'mp_mode', mp_mode,
    'mp_public_key', mp_public_key,
    'mp_client_id', mp_client_id,
    'mp_client_secret', mp_client_secret,
    'runas_payment_enabled', runas_payment_enabled,
    'mp_payment_enabled', mp_payment_enabled,
    'created_at', created_at,
    'updated_at', updated_at
  )
  INTO v_settings
  FROM public.online_order_settings
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_settings, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_online_order_settings(
  p_settings jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_record_id uuid;
BEGIN
  -- Get first record or create if doesn't exist
  SELECT id INTO v_record_id
  FROM public.online_order_settings
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_record_id IS NULL THEN
    INSERT INTO public.online_order_settings (
      app_orders_enabled,
      app_pickup_enabled,
      app_delivery_enabled,
      mp_enabled,
      mp_mode,
      mp_public_key,
      mp_client_id,
      mp_client_secret,
      runas_payment_enabled,
      mp_payment_enabled
    )
    VALUES (
      COALESCE((p_settings->>'app_orders_enabled')::boolean, false),
      COALESCE((p_settings->>'app_pickup_enabled')::boolean, true),
      COALESCE((p_settings->>'app_delivery_enabled')::boolean, false),
      COALESCE((p_settings->>'mp_enabled')::boolean, false),
      COALESCE(p_settings->>'mp_mode', 'sandbox'),
      p_settings->>'mp_public_key',
      p_settings->>'mp_client_id',
      p_settings->>'mp_client_secret',
      COALESCE((p_settings->>'runas_payment_enabled')::boolean, true),
      COALESCE((p_settings->>'mp_payment_enabled')::boolean, true)
    )
    RETURNING id INTO v_record_id;
  ELSE
    UPDATE public.online_order_settings
    SET
      app_orders_enabled = COALESCE((p_settings->>'app_orders_enabled')::boolean, app_orders_enabled),
      app_pickup_enabled = COALESCE((p_settings->>'app_pickup_enabled')::boolean, app_pickup_enabled),
      app_delivery_enabled = COALESCE((p_settings->>'app_delivery_enabled')::boolean, app_delivery_enabled),
      mp_enabled = COALESCE((p_settings->>'mp_enabled')::boolean, mp_enabled),
      mp_mode = COALESCE(p_settings->>'mp_mode', mp_mode),
      mp_public_key = COALESCE(p_settings->>'mp_public_key', mp_public_key),
      mp_client_id = COALESCE(p_settings->>'mp_client_id', mp_client_id),
      mp_client_secret = COALESCE(p_settings->>'mp_client_secret', mp_client_secret),
      runas_payment_enabled = COALESCE((p_settings->>'runas_payment_enabled')::boolean, runas_payment_enabled),
      mp_payment_enabled = COALESCE((p_settings->>'mp_payment_enabled')::boolean, mp_payment_enabled),
      updated_at = now()
    WHERE id = v_record_id;
  END IF;

  -- Return updated settings
  RETURN public.get_online_order_settings(p_user_id);
END;
$function$;