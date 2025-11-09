-- Arreglar validación de admin y agregar campos de MercadoPago

-- 1. Primero, agregar columnas para credenciales sensibles de MercadoPago
ALTER TABLE public.online_order_settings 
ADD COLUMN IF NOT EXISTS mp_client_id text,
ADD COLUMN IF NOT EXISTS mp_client_secret text;

-- 2. Crear función helper para validar admin directamente
CREATE OR REPLACE FUNCTION public.is_user_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id = p_user_id
      AND ur.role = 'Administrador'
      AND u.active = true
  );
$$;

-- 3. Actualizar función update_online_order_settings para recibir user_id
CREATE OR REPLACE FUNCTION public.update_online_order_settings(
  p_settings jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_settings RECORD;
  v_id uuid;
  v_user_id uuid;
BEGIN
  -- Obtener user_id del parámetro o del contexto
  v_user_id := COALESCE(p_user_id, public.get_current_staff_user_id());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay sesión de staff activa';
  END IF;
  
  -- Verificar que sea administrador
  IF NOT public.is_user_admin(v_user_id) THEN
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
      mp_public_key,
      mp_client_id,
      mp_client_secret
    ) VALUES (
      COALESCE((p_settings->>'app_orders_enabled')::boolean, false),
      COALESCE((p_settings->>'app_pickup_enabled')::boolean, true),
      COALESCE((p_settings->>'app_delivery_enabled')::boolean, false),
      COALESCE((p_settings->>'mp_enabled')::boolean, false),
      COALESCE(p_settings->>'mp_mode', 'sandbox')::text,
      p_settings->>'mp_public_key',
      p_settings->>'mp_client_id',
      p_settings->>'mp_client_secret'
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
      mp_client_id = COALESCE(p_settings->>'mp_client_id', mp_client_id),
      mp_client_secret = COALESCE(p_settings->>'mp_client_secret', mp_client_secret),
      updated_at = now()
    WHERE id = v_id
    RETURNING * INTO v_settings;
  END IF;
  
  RETURN row_to_json(v_settings)::jsonb;
END;
$$;