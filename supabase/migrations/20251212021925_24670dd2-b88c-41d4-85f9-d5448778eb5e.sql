-- Fix: Reduce staff session token expiration from 12 hours to 4 hours
-- This reduces the window of opportunity for token theft via XSS attacks
-- Industry standard for POS systems is 1-4 hours

CREATE OR REPLACE FUNCTION public.create_staff_session(_user_id uuid)
 RETURNS TABLE(token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token text := gen_random_uuid()::text;
  v_expires_at timestamptz := now() + interval '4 hours';  -- Reduced from 12 hours to 4 hours
BEGIN
  -- Invalidate old sessions for this user (maintain single active session)
  UPDATE public.staff_sessions 
  SET is_active = false 
  WHERE user_id = _user_id AND is_active = true;
  
  -- Create new session with reduced expiration
  INSERT INTO public.staff_sessions(user_id, token, expires_at)
  VALUES (_user_id, v_token, v_expires_at)
  RETURNING staff_sessions.token, staff_sessions.expires_at INTO token, expires_at;
  
  RETURN NEXT;
END;
$function$;

-- Also update the refresh_staff_token function to use 4-hour expiration
CREATE OR REPLACE FUNCTION public.refresh_staff_token(_token text)
 RETURNS TABLE(new_token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_new_token text := gen_random_uuid()::text;
  v_expires_at timestamptz := now() + interval '4 hours';  -- Reduced from 12 hours to 4 hours
BEGIN
  -- Verify current token is valid
  SELECT ss.user_id INTO v_user_id
  FROM public.staff_sessions ss
  WHERE ss.token = _token 
    AND ss.is_active = true 
    AND ss.expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido o expirado';
  END IF;
  
  -- Invalidate old token
  UPDATE public.staff_sessions 
  SET is_active = false 
  WHERE token = _token;
  
  -- Create new token with reduced expiration
  INSERT INTO public.staff_sessions(user_id, token, expires_at)
  VALUES (v_user_id, v_new_token, v_expires_at)
  RETURNING staff_sessions.token, staff_sessions.expires_at 
  INTO new_token, expires_at;
  
  RETURN NEXT;
END;
$function$;

-- Add comment explaining the security decision
COMMENT ON FUNCTION public.create_staff_session IS 'Creates a new staff session with 4-hour expiration (reduced from 12 hours for security). Single active session per user enforced.';
COMMENT ON FUNCTION public.refresh_staff_token IS 'Refreshes staff session token with new 4-hour expiration. Old token is invalidated.';