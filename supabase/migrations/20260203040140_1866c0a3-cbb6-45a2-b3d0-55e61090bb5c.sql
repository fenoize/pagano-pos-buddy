-- Agregar columna is_pwa a staff_sessions
ALTER TABLE public.staff_sessions 
ADD COLUMN IF NOT EXISTS is_pwa boolean DEFAULT false;

-- Recrear función create_staff_session con soporte PWA
CREATE OR REPLACE FUNCTION public.create_staff_session(_user_id uuid, _is_pwa boolean DEFAULT false)
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_expires_at timestamptz;
BEGIN
  -- Calcular expiración: 365 días para PWA, 4 horas para web
  v_expires_at := CASE 
    WHEN _is_pwa THEN NOW() + INTERVAL '365 days'
    ELSE NOW() + INTERVAL '4 hours'
  END;
  
  -- Generar token único
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Invalidar sesiones anteriores del usuario
  DELETE FROM public.staff_sessions WHERE user_id = _user_id;
  
  -- Crear nueva sesión
  INSERT INTO public.staff_sessions (user_id, token, expires_at, is_pwa)
  VALUES (_user_id, v_token, v_expires_at, _is_pwa);
  
  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

-- Recrear función refresh_staff_token con soporte PWA
CREATE OR REPLACE FUNCTION public.refresh_staff_token(_token text)
RETURNS TABLE(new_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_record RECORD;
  v_new_token text;
  v_new_expires_at timestamptz;
BEGIN
  -- Buscar sesión existente
  SELECT ss.user_id, ss.is_pwa INTO v_session_record
  FROM public.staff_sessions ss
  WHERE ss.token = _token
    AND ss.expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Generar nuevo token
  v_new_token := encode(gen_random_bytes(32), 'hex');
  
  -- Calcular nueva expiración basada en si es PWA o no
  v_new_expires_at := CASE 
    WHEN v_session_record.is_pwa THEN NOW() + INTERVAL '365 days'
    ELSE NOW() + INTERVAL '4 hours'
  END;
  
  -- Actualizar sesión con nuevo token y expiración
  UPDATE public.staff_sessions
  SET token = v_new_token,
      expires_at = v_new_expires_at
  WHERE token = _token;
  
  RETURN QUERY SELECT v_new_token, v_new_expires_at;
END;
$$;