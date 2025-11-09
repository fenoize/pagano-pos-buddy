-- ============================================
-- SOLUCIÓN DEFINITIVA: RLS basado en staff_sessions
-- Sin dependencia de contexto de sesión ni headers JWT
-- ============================================

-- 1. Crear funciones RLS optimizadas basadas en staff_sessions

-- Verifica si hay al menos una sesión de staff activa
CREATE OR REPLACE FUNCTION public.has_active_staff_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM staff_sessions ss
    INNER JOIN users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > NOW()
      AND u.active = true
  );
$$;

-- Obtiene el user_id de la sesión activa más reciente
CREATE OR REPLACE FUNCTION public.get_active_staff_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ss.user_id
  FROM staff_sessions ss
  INNER JOIN users u ON u.id = ss.user_id
  WHERE ss.is_active = true
    AND ss.expires_at > NOW()
    AND u.active = true
  ORDER BY ss.created_at DESC
  LIMIT 1;
$$;

-- Verifica permisos usando la sesión activa más reciente
CREATE OR REPLACE FUNCTION public.staff_has_permission(perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM staff_sessions ss
    INNER JOIN user_roles ur ON ur.user_id = ss.user_id
    INNER JOIN role_permissions rp ON rp.role = ur.role
    INNER JOIN users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > NOW()
      AND u.active = true
      AND rp.permission = perm
  );
$$;

-- 2. Eliminar políticas antiguas de finance_expenses
DROP POLICY IF EXISTS "Staff can view expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can create expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can update own expenses or admin" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff with token can view finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff with permission can create finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can update own expenses or admin with permission" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admins with permission can delete finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can view finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can create finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admins can delete finance expenses" ON public.finance_expenses;

-- 3. Crear políticas RLS basadas en staff_sessions

-- SELECT: Cualquier staff con sesión activa y permiso finance.view
CREATE POLICY "Active staff can view expenses"
  ON public.finance_expenses
  FOR SELECT
  USING (
    public.has_active_staff_session()
    AND public.staff_has_permission('finance.view')
  );

-- INSERT: Staff con sesión activa y permiso finance.manage_expenses
CREATE POLICY "Active staff can create expenses"
  ON public.finance_expenses
  FOR INSERT
  WITH CHECK (
    public.has_active_staff_session()
    AND public.staff_has_permission('finance.manage_expenses')
  );

-- UPDATE: Staff con sesión activa y permiso finance.manage_expenses
CREATE POLICY "Active staff can update expenses"
  ON public.finance_expenses
  FOR UPDATE
  USING (
    public.has_active_staff_session()
    AND public.staff_has_permission('finance.manage_expenses')
  )
  WITH CHECK (
    public.has_active_staff_session()
    AND public.staff_has_permission('finance.manage_expenses')
  );

-- DELETE: Solo administradores con sesión activa
CREATE POLICY "Active admins can delete expenses"
  ON public.finance_expenses
  FOR DELETE
  USING (
    public.has_active_staff_session()
    AND EXISTS (
      SELECT 1
      FROM staff_sessions ss
      INNER JOIN user_roles ur ON ur.user_id = ss.user_id
      INNER JOIN users u ON u.id = ss.user_id
      WHERE ss.is_active = true
        AND ss.expires_at > NOW()
        AND u.active = true
        AND ur.role = 'Administrador'
    )
  );

-- Comentarios de documentación
COMMENT ON FUNCTION public.has_active_staff_session() IS 
  'Verifica si existe al menos una sesión de staff activa válida. No valida headers ni contexto.';

COMMENT ON FUNCTION public.get_active_staff_user_id() IS 
  'Retorna el user_id de la sesión de staff activa más reciente. Útil para auditoría.';

COMMENT ON FUNCTION public.staff_has_permission(text) IS 
  'Verifica si la sesión de staff activa tiene el permiso especificado. Usa role_permissions.';

COMMENT ON TABLE public.finance_expenses IS 
  'Gastos variables. RLS basado en staff_sessions (no contexto). Requiere permisos finance.view y finance.manage_expenses.';