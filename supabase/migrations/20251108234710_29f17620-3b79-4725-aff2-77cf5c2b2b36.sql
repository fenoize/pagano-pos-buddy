-- ============================================
-- FIX DEFINITIVO: Políticas RLS de finance_expenses
-- Usar funciones basadas en CONTEXTO DE SESIÓN (no token)
-- ============================================

-- 1. Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Staff with token can view finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff with permission can create finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can update own expenses or admin with permission" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admins with permission can delete finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can create finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can update own expenses or admin" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can view finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admins can delete finance expenses" ON public.finance_expenses;

-- 2. Crear políticas usando CONTEXTO DE SESIÓN (app.user_id)

-- SELECT: Staff activo con permiso finance.view
CREATE POLICY "Staff can view expenses"
  ON public.finance_expenses
  FOR SELECT
  USING (
    public.is_active_staff()
    AND public.has_permission(
      public.get_current_staff_user_id(), 
      'finance.view'
    )
  );

-- INSERT: Staff activo con permiso finance.manage_expenses
CREATE POLICY "Staff can create expenses"
  ON public.finance_expenses
  FOR INSERT
  WITH CHECK (
    public.is_active_staff()
    AND public.has_permission(
      public.get_current_staff_user_id(), 
      'finance.manage_expenses'
    )
    AND registered_by = public.get_current_staff_user_id()
  );

-- UPDATE: Puede editar sus propios registros o si es admin
CREATE POLICY "Staff can update own expenses or admin"
  ON public.finance_expenses
  FOR UPDATE
  USING (
    public.is_active_staff()
    AND (
      (
        registered_by = public.get_current_staff_user_id()
        AND public.has_permission(
          public.get_current_staff_user_id(), 
          'finance.manage_expenses'
        )
      )
      OR public.is_active_admin()
    )
  )
  WITH CHECK (
    public.is_active_staff()
    AND public.has_permission(
      public.get_current_staff_user_id(), 
      'finance.manage_expenses'
    )
  );

-- DELETE: Solo administradores
CREATE POLICY "Admins can delete expenses"
  ON public.finance_expenses
  FOR DELETE
  USING (public.is_active_admin());

COMMENT ON TABLE public.finance_expenses IS 
  'Gastos variables operativos. RLS basado en contexto de sesión (app.user_id) y permiso finance.manage_expenses.';