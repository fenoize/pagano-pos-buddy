CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH current_staff AS (
    SELECT COALESCE(
      public.get_current_staff_user_from_token(),
      public.get_user_id_from_current_session(),
      auth.uid()
    ) AS user_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM current_staff cs
    JOIN public.users u ON u.id = cs.user_id
    JOIN public.staff_sessions ss ON ss.user_id = u.id
    JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE cs.user_id IS NOT NULL
      AND u.active = true
      AND ss.is_active = true
      AND ss.expires_at > now()
      AND ur.role = 'Administrador'
  );
$$;