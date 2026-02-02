-- FIX: Corregir is_active_staff para verificar el usuario actual autenticado
-- El problema es que la función debe verificar que el usuario ACTUAL (auth.uid())
-- tenga una sesión activa, no simplemente que exista alguna sesión activa.

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.users u
        INNER JOIN public.staff_sessions ss ON ss.user_id = u.id
        WHERE u.id = auth.uid()
          AND u.active = true
          AND ss.is_active = true
          AND ss.expires_at > NOW()
      )
    ),
    -- Fallback: verificar si hay contexto app.user_id establecido
    (
      COALESCE(current_setting('app.user_id', true), '') != '' 
      AND EXISTS (
        SELECT 1
        FROM public.users u
        INNER JOIN public.staff_sessions ss ON ss.user_id = u.id
        WHERE u.id::text = current_setting('app.user_id', true)
          AND u.active = true
          AND ss.is_active = true
          AND ss.expires_at > NOW()
      )
    )
  );
$$;

-- También corregir is_active_admin para consistencia
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT EXISTS (
        SELECT 1
        FROM public.users u
        INNER JOIN public.staff_sessions ss ON ss.user_id = u.id
        WHERE u.id = auth.uid()
          AND u.active = true
          AND u.role = 'Administrador'
          AND ss.is_active = true
          AND ss.expires_at > NOW()
      )
    ),
    -- Fallback: verificar si hay contexto app.user_id establecido
    (
      COALESCE(current_setting('app.user_id', true), '') != '' 
      AND EXISTS (
        SELECT 1
        FROM public.users u
        INNER JOIN public.staff_sessions ss ON ss.user_id = u.id
        WHERE u.id::text = current_setting('app.user_id', true)
          AND u.active = true
          AND u.role = 'Administrador'
          AND ss.is_active = true
          AND ss.expires_at > NOW()
      )
    )
  );
$$;