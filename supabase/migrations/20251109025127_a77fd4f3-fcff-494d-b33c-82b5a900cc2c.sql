-- Primero, eliminamos las políticas existentes que están causando problemas
DROP POLICY IF EXISTS "Finance viewers can read closures" ON public.financial_closures;
DROP POLICY IF EXISTS "Finance managers can create closures" ON public.financial_closures;
DROP POLICY IF EXISTS "Finance managers can update closures" ON public.financial_closures;
DROP POLICY IF EXISTS "Finance managers can delete closures" ON public.financial_closures;

-- Crear políticas más simples y efectivas basadas en sesiones activas de staff

-- Política para SELECT: permitir a usuarios con sesión activa de staff ver los cierres
CREATE POLICY "Staff can view financial closures"
ON public.financial_closures
FOR SELECT
USING (
  has_active_staff_session()
);

-- Política para INSERT: permitir a administradores y usuarios con permiso de finanzas crear cierres
CREATE POLICY "Staff can create financial closures"
ON public.financial_closures
FOR INSERT
WITH CHECK (
  has_active_staff_session() AND 
  (is_current_user_admin() OR staff_has_permission('finance.manage_closures'))
);

-- Política para UPDATE: permitir a administradores y usuarios con permiso actualizar cierres
CREATE POLICY "Staff can update financial closures"
ON public.financial_closures
FOR UPDATE
USING (
  has_active_staff_session() AND 
  (is_current_user_admin() OR staff_has_permission('finance.manage_closures'))
)
WITH CHECK (
  has_active_staff_session() AND 
  (is_current_user_admin() OR staff_has_permission('finance.manage_closures'))
);

-- Política para DELETE: solo administradores pueden eliminar cierres
CREATE POLICY "Admins can delete financial closures"
ON public.financial_closures
FOR DELETE
USING (
  has_active_staff_session() AND is_current_user_admin()
);