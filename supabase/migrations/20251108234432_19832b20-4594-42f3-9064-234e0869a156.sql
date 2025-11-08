-- ============================================
-- FIX: Políticas RLS de finance_expenses
-- Usar funciones basadas en token JWT
-- ============================================

-- 1. Eliminar políticas antiguas
DROP POLICY IF EXISTS "Staff can create finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can update own expenses or admin" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can view finance expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Admins can delete finance expenses" ON public.finance_expenses;

-- 2. Crear políticas nuevas basadas en token

-- SELECT: Staff activo con permiso finance.view
CREATE POLICY "Staff with token can view finance expenses"
  ON public.finance_expenses
  FOR SELECT
  USING (
    public.is_active_staff_with_token()
    AND public.has_permission(
      public.get_current_staff_user_from_token(), 
      'finance.view'
    )
  );

-- INSERT: Staff activo con permiso finance.manage_expenses
CREATE POLICY "Staff with permission can create finance expenses"
  ON public.finance_expenses
  FOR INSERT
  WITH CHECK (
    public.is_active_staff_with_token()
    AND public.has_permission(
      public.get_current_staff_user_from_token(), 
      'finance.manage_expenses'
    )
    AND registered_by = public.get_current_staff_user_from_token()
  );

-- UPDATE: Solo puede editar sus propios registros, o si tiene permiso y es admin
CREATE POLICY "Staff can update own expenses or admin with permission"
  ON public.finance_expenses
  FOR UPDATE
  USING (
    public.is_active_staff_with_token()
    AND (
      (
        registered_by = public.get_current_staff_user_from_token()
        AND public.has_permission(
          public.get_current_staff_user_from_token(), 
          'finance.manage_expenses'
        )
      )
      OR (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = public.get_current_staff_user_from_token()
            AND ur.role = 'Administrador'
        )
        AND public.has_permission(
          public.get_current_staff_user_from_token(), 
          'finance.manage_expenses'
        )
      )
    )
  )
  WITH CHECK (
    public.is_active_staff_with_token()
    AND public.has_permission(
      public.get_current_staff_user_from_token(), 
      'finance.manage_expenses'
    )
  );

-- DELETE: Solo Administradores con permiso
CREATE POLICY "Admins with permission can delete finance expenses"
  ON public.finance_expenses
  FOR DELETE
  USING (
    public.is_active_staff_with_token()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = public.get_current_staff_user_from_token()
        AND ur.role = 'Administrador'
    )
    AND public.has_permission(
      public.get_current_staff_user_from_token(), 
      'finance.manage_expenses'
    )
  );

-- Documentación
COMMENT ON TABLE public.finance_expenses IS 
  'Gastos variables operativos. RLS basado en token JWT y permiso finance.manage_expenses.';