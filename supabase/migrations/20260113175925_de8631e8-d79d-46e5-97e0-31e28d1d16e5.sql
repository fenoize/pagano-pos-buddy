-- Fix get_user_id_from_current_session to not throw when app.user_id is an empty/quoted/invalid uuid
CREATE OR REPLACE FUNCTION public.get_user_id_from_current_session()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_raw text;
BEGIN
  v_user_id := NULL;

  v_raw := current_setting('app.user_id', true);

  -- Normalize common bad values like '"uuid"' or '""'
  IF v_raw IS NOT NULL THEN
    v_raw := btrim(v_raw);
    v_raw := trim(both '"' from v_raw);
  END IF;

  IF v_raw IS NOT NULL AND v_raw <> '' THEN
    BEGIN
      v_user_id := v_raw::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  -- Fallback: buscar sesión activa más reciente del usuario
  SELECT ss.user_id INTO v_user_id
  FROM staff_sessions ss
  JOIN users u ON u.id = ss.user_id
  WHERE ss.is_active = true
    AND ss.expires_at > NOW()
    AND u.active = true
  ORDER BY ss.created_at DESC
  LIMIT 1;

  RETURN v_user_id;
END;
$$;