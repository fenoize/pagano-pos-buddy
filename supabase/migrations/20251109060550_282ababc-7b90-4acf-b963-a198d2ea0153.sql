-- Funciones RPC seguras para manejar online_order_settings sin conflictos de JWT

-- Función para obtener configuración de pedidos online
CREATE OR REPLACE FUNCTION public.get_online_order_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings RECORD;
BEGIN
  -- Verificar que sea staff activo
  IF NOT public.is_active_staff() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;
  
  -- Obtener o crear configuración
  SELECT * INTO v_settings
  FROM online_order_settings
  LIMIT 1;
  
  -- Si no existe, crear con valores por defecto
  IF NOT FOUND THEN
    INSERT INTO online_order_settings (
      app_orders_enabled,
      app_pickup_enabled,
      app_delivery_enabled,
      mp_enabled,
      mp_mode,
      mp_public_key
    ) VALUES (
      false,
      true,
      false,
      false,
      'sandbox',
      null
    )
    RETURNING * INTO v_settings;
  END IF;
  
  RETURN row_to_json(v_settings)::jsonb;
END;
$$;

-- Función para actualizar configuración de pedidos online
CREATE OR REPLACE FUNCTION public.update_online_order_settings(
  p_settings jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings RECORD;
  v_id uuid;
BEGIN
  -- Verificar que sea staff activo (administrador)
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar esta configuración';
  END IF;
  
  -- Obtener ID del registro existente
  SELECT id INTO v_id FROM online_order_settings LIMIT 1;
  
  -- Si no existe, insertar
  IF v_id IS NULL THEN
    INSERT INTO online_order_settings (
      app_orders_enabled,
      app_pickup_enabled,
      app_delivery_enabled,
      mp_enabled,
      mp_mode,
      mp_public_key
    ) VALUES (
      COALESCE((p_settings->>'app_orders_enabled')::boolean, false),
      COALESCE((p_settings->>'app_pickup_enabled')::boolean, true),
      COALESCE((p_settings->>'app_delivery_enabled')::boolean, false),
      COALESCE((p_settings->>'mp_enabled')::boolean, false),
      COALESCE(p_settings->>'mp_mode', 'sandbox')::text,
      p_settings->>'mp_public_key'
    )
    RETURNING * INTO v_settings;
  ELSE
    -- Actualizar existente
    UPDATE online_order_settings
    SET
      app_orders_enabled = COALESCE((p_settings->>'app_orders_enabled')::boolean, app_orders_enabled),
      app_pickup_enabled = COALESCE((p_settings->>'app_pickup_enabled')::boolean, app_pickup_enabled),
      app_delivery_enabled = COALESCE((p_settings->>'app_delivery_enabled')::boolean, app_delivery_enabled),
      mp_enabled = COALESCE((p_settings->>'mp_enabled')::boolean, mp_enabled),
      mp_mode = COALESCE(p_settings->>'mp_mode', mp_mode),
      mp_public_key = COALESCE(p_settings->>'mp_public_key', mp_public_key),
      updated_at = now()
    WHERE id = v_id
    RETURNING * INTO v_settings;
  END IF;
  
  RETURN row_to_json(v_settings)::jsonb;
END;
$$;