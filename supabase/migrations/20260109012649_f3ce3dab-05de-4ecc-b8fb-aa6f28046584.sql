-- Fix staff token extraction: use custom header (x-staff-token) instead of Authorization (JWT)
CREATE OR REPLACE FUNCTION public.get_current_staff_user_from_token()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers json;
  v_token text;
  v_user_id uuid;
BEGIN
  -- Read request headers injected by PostgREST
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_headers IS NULL THEN
    RETURN NULL;
  END IF;

  -- Prefer custom header to avoid PostgREST JWT parsing on Authorization
  v_token := v_headers->>'x-staff-token';

  IF v_token IS NULL OR length(v_token) = 0 THEN
    RETURN NULL;
  END IF;

  -- Validate token in staff_sessions and get user_id
  SELECT ss.user_id INTO v_user_id
  FROM public.staff_sessions ss
  INNER JOIN public.users u ON u.id = ss.user_id
  WHERE ss.token = v_token
    AND ss.is_active = true
    AND ss.expires_at > now()
    AND u.active = true;

  RETURN v_user_id;
END;
$$;

-- Ensure wrapper function has secure search_path too
CREATE OR REPLACE FUNCTION public.is_active_staff_with_token()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := public.get_current_staff_user_from_token();
  RETURN v_user_id IS NOT NULL;
END;
$$;
