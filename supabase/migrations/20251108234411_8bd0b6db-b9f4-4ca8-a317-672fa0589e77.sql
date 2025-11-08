-- ============================================
-- Crear permiso finance.manage_expenses
-- ============================================

-- Insertar el nuevo permiso para Administrador
INSERT INTO public.role_permissions (role, permission)
VALUES 
  ('Administrador', 'finance.manage_expenses')
ON CONFLICT (role, permission) DO NOTHING;

COMMENT ON TABLE public.role_permissions IS 
  'Permisos por rol. Incluye finance.manage_expenses para gestión de gastos fijos y variables.';