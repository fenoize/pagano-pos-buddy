-- Políticas RLS para tabla suppliers

-- Habilitar RLS en suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Staff activo puede ver proveedores activos
CREATE POLICY "Active staff can view suppliers"
  ON public.suppliers
  FOR SELECT
  USING (
    has_active_staff_session()
    AND is_active = true
  );

-- Staff con permiso finance.manage_expenses puede crear proveedores
CREATE POLICY "Staff can create suppliers"
  ON public.suppliers
  FOR INSERT
  WITH CHECK (
    has_active_staff_session()
    AND staff_has_permission('finance.manage_expenses')
  );

-- Staff con permiso finance.manage_expenses puede actualizar proveedores
CREATE POLICY "Staff can update suppliers"
  ON public.suppliers
  FOR UPDATE
  USING (
    has_active_staff_session()
    AND staff_has_permission('finance.manage_expenses')
  )
  WITH CHECK (
    has_active_staff_session()
    AND staff_has_permission('finance.manage_expenses')
  );

-- Solo administradores pueden eliminar proveedores
CREATE POLICY "Admins can delete suppliers"
  ON public.suppliers
  FOR DELETE
  USING (
    has_active_staff_session()
    AND EXISTS (
      SELECT 1
      FROM staff_sessions ss
      INNER JOIN user_roles ur ON ur.user_id = ss.user_id
      WHERE ss.is_active = true
        AND ss.expires_at > NOW()
        AND ur.role = 'Administrador'
    )
  );