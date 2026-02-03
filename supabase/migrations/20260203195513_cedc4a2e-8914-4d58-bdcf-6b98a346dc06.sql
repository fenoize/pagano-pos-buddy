-- Eliminar todas las versiones existentes de create_staff_session
DROP FUNCTION IF EXISTS public.create_staff_session(uuid);
DROP FUNCTION IF EXISTS public.create_staff_session(uuid, boolean);

-- Crear función actualizada con soporte de sesiones múltiples por rol
CREATE OR REPLACE FUNCTION public.create_staff_session(
  _user_id uuid,
  _is_pwa boolean DEFAULT false
)
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_expires_at timestamptz;
  v_user_role text;
  v_active_session_count int;
  v_max_sessions int;
  v_sessions_to_invalidate int;
BEGIN
  -- Obtener el rol del usuario
  SELECT role INTO v_user_role FROM public.users WHERE id = _user_id;
  
  -- Determinar máximo de sesiones según rol
  -- Solo Administrador puede tener hasta 3 sesiones simultáneas
  IF v_user_role = 'Administrador' THEN
    v_max_sessions := 3;
  ELSE
    v_max_sessions := 1;
  END IF;
  
  -- Contar sesiones activas actuales
  SELECT COUNT(*) INTO v_active_session_count
  FROM public.staff_sessions s
  WHERE s.user_id = _user_id
    AND s.expires_at > now();
  
  -- Si ya tiene el máximo de sesiones, invalidar las más antiguas
  IF v_active_session_count >= v_max_sessions THEN
    -- Calcular cuántas sesiones invalidar para dejar espacio a la nueva
    v_sessions_to_invalidate := v_active_session_count - v_max_sessions + 1;
    
    -- Invalidar las sesiones más antiguas
    UPDATE public.staff_sessions
    SET expires_at = now()
    WHERE id IN (
      SELECT id 
      FROM public.staff_sessions
      WHERE user_id = _user_id
        AND expires_at > now()
      ORDER BY created_at ASC
      LIMIT v_sessions_to_invalidate
    );
  END IF;
  
  -- Generar token seguro (64 caracteres hex)
  v_token := replace(gen_random_uuid()::text, '-', '') || 
             replace(gen_random_uuid()::text, '-', '');

  -- Duración según tipo de sesión (PWA = 365 días, Web = 4 horas)
  v_expires_at := CASE
    WHEN _is_pwa THEN now() + interval '365 days'
    ELSE now() + interval '4 hours'
  END;

  -- Crear nueva sesión
  INSERT INTO public.staff_sessions (user_id, token, expires_at, is_pwa)
  VALUES (_user_id, v_token, v_expires_at, _is_pwa);

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

-- Comentario para documentar el cambio
COMMENT ON FUNCTION public.create_staff_session(uuid, boolean) IS 'Crea sesión de staff con límite de sesiones por rol: Administrador=3, otros=1. PWA=365 días, Web=4 horas.';