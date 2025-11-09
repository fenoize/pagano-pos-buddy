-- Corregir política RLS de DELETE para finance_expenses
-- Problema: La política verifica si existe ALGÚN admin con sesión activa,
-- pero no verifica si el usuario ACTUAL es admin

-- 1. Eliminar la política actual
DROP POLICY IF EXISTS "Active admins can delete expenses" ON public.finance_expenses;

-- 2. Crear función para obtener el user_id del contexto de sesión actual
CREATE OR REPLACE FUNCTION public.get_current_staff_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

-- 3. Crear función para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    INNER JOIN users u ON u.id = ur.user_id
    WHERE ur.user_id = public.get_current_staff_user_id()
      AND ur.role = 'Administrador'::app_role
      AND u.active = true
  );
$$;

-- 4. Crear nueva política DELETE que verifica el usuario actual
CREATE POLICY "Admins can delete expenses"
  ON public.finance_expenses
  FOR DELETE
  USING (
    public.has_active_staff_session()
    AND public.is_current_user_admin()
  );

-- 5. Comentarios de documentación
COMMENT ON FUNCTION public.get_current_staff_user_id() IS 
  'Obtiene el user_id del contexto de sesión actual establecido por set_staff_context()';

COMMENT ON FUNCTION public.is_current_user_admin() IS 
  'Verifica si el usuario actual (según app.user_id) tiene rol de Administrador';

COMMENT ON POLICY "Admins can delete expenses" ON public.finance_expenses IS 
  'Permite a administradores autenticados eliminar egresos financieros';