-- Corregir función create_staff_session para usar gen_random_uuid() en lugar de gen_random_bytes()
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
BEGIN
  -- Generar token único usando gen_random_uuid (disponible sin extensiones adicionales)
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  
  -- Expiración según tipo de sesión
  v_expires_at := CASE 
    WHEN _is_pwa THEN NOW() + INTERVAL '365 days'
    ELSE NOW() + INTERVAL '4 hours'
  END;
  
  -- Invalidar sesiones anteriores del usuario
  UPDATE staff_sessions 
  SET expires_at = NOW() 
  WHERE user_id = _user_id AND expires_at > NOW();
  
  -- Crear nueva sesión
  INSERT INTO staff_sessions (user_id, token, expires_at, is_pwa)
  VALUES (_user_id, v_token, v_expires_at, _is_pwa);
  
  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

-- También corregir refresh_staff_token por si acaso usa lo mismo
CREATE OR REPLACE FUNCTION public.refresh_staff_token(_token text)
RETURNS TABLE(new_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_pwa boolean;
  v_new_token text;
  v_expires_at timestamptz;
BEGIN
  -- Buscar sesión actual válida
  SELECT user_id, is_pwa INTO v_user_id, v_is_pwa
  FROM staff_sessions
  WHERE token = _token AND expires_at > NOW();
  
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Generar nuevo token
  v_new_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  
  -- Calcular nueva expiración según tipo de sesión
  v_expires_at := CASE 
    WHEN v_is_pwa THEN NOW() + INTERVAL '365 days'
    ELSE NOW() + INTERVAL '4 hours'
  END;
  
  -- Actualizar sesión con nuevo token
  UPDATE staff_sessions
  SET token = v_new_token, expires_at = v_expires_at
  WHERE token = _token;
  
  RETURN QUERY SELECT v_new_token, v_expires_at;
END;
$$;