-- Fix: evitar ambigüedad entre columnas de salida (RETURNS TABLE) y columnas de tabla
-- En PL/pgSQL, los nombres de RETURNS TABLE actúan como variables y pueden chocar con columnas.

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
  -- Token: UUIDs concatenados (sin requerir pgcrypto)
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  v_expires_at := CASE
    WHEN _is_pwa THEN now() + interval '365 days'
    ELSE now() + interval '4 hours'
  END;

  -- Invalidar sesiones anteriores activas del usuario
  UPDATE public.staff_sessions s
  SET expires_at = now()
  WHERE s.user_id = _user_id
    AND s.expires_at > now();

  INSERT INTO public.staff_sessions (user_id, token, expires_at, is_pwa)
  VALUES (_user_id, v_token, v_expires_at, _is_pwa);

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_staff_token(
  _token text
)
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
  SELECT s.user_id, s.is_pwa
    INTO v_user_id, v_is_pwa
  FROM public.staff_sessions s
  WHERE s.token = _token
    AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  v_new_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  v_expires_at := CASE
    WHEN coalesce(v_is_pwa, false) THEN now() + interval '365 days'
    ELSE now() + interval '4 hours'
  END;

  UPDATE public.staff_sessions s
  SET token = v_new_token,
      expires_at = v_expires_at
  WHERE s.token = _token;

  RETURN QUERY SELECT v_new_token, v_expires_at;
END;
$$;