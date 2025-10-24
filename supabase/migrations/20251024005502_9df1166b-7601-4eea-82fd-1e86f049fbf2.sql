-- Fase 1: Funciones de validación y renovación de tokens

-- Función para validar si un token está activo
CREATE OR REPLACE FUNCTION public.validate_staff_token(_token text)
RETURNS TABLE(is_valid boolean, user_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (ss.is_active AND ss.expires_at > now()) as is_valid,
    ss.user_id,
    ss.expires_at
  FROM public.staff_sessions ss
  WHERE ss.token = _token;
END;
$$;

-- Función para renovar un token activo
CREATE OR REPLACE FUNCTION public.refresh_staff_token(_token text)
RETURNS TABLE(new_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_new_token text := gen_random_uuid()::text;
  v_expires_at timestamptz := now() + interval '12 hours';
BEGIN
  -- Verificar que el token actual es válido
  SELECT ss.user_id INTO v_user_id
  FROM public.staff_sessions ss
  WHERE ss.token = _token 
    AND ss.is_active = true 
    AND ss.expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido o expirado';
  END IF;
  
  -- Invalidar token anterior
  UPDATE public.staff_sessions 
  SET is_active = false 
  WHERE token = _token;
  
  -- Crear nuevo token
  INSERT INTO public.staff_sessions(user_id, token, expires_at)
  VALUES (v_user_id, v_new_token, v_expires_at)
  RETURNING staff_sessions.token, staff_sessions.expires_at 
  INTO new_token, expires_at;
  
  RETURN NEXT;
END;
$$;