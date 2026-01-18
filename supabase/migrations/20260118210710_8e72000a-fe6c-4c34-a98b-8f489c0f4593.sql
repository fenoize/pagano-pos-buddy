
-- Fix has_active_staff_session to use app.user_id context variable
-- Current function checks for ANY active session, not the current user's session

CREATE OR REPLACE FUNCTION public.has_active_staff_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
    AND current_setting('app.user_id', true) != '""'
    AND EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = get_user_id_from_current_session()
        AND u.active = true
    ),
    false
  );
$$;

-- Also fix is_staff_admin to use context variable instead of staff_sessions table
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
    AND EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = get_user_id_from_current_session()
        AND u.active = true
        AND u.role = 'Administrador'
    ),
    false
  );
$$;

-- Fix is_cashier_or_admin to work with context
CREATE OR REPLACE FUNCTION public.is_cashier_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
    AND EXISTS (
      SELECT 1 
      FROM public.users u
      WHERE u.id = get_user_id_from_current_session()
        AND u.active = true
        AND u.role IN ('Administrador', 'Caja')
    ),
    false
  );
$$;

-- Fix is_active_staff
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = get_user_id_from_current_session()
        AND u.active = true
    ),
    false
  );
$$;
