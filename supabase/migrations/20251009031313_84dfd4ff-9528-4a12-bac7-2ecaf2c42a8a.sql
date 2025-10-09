-- Asegurar que la tabla role_permissions tenga RLS habilitado
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para role_permissions: Administradores tienen acceso completo
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.role_permissions;
CREATE POLICY "Admins can view all permissions"
ON public.role_permissions
FOR SELECT
USING (public.is_staff_admin());

DROP POLICY IF EXISTS "Admins can insert permissions" ON public.role_permissions;
CREATE POLICY "Admins can insert permissions"
ON public.role_permissions
FOR INSERT
WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS "Admins can update permissions" ON public.role_permissions;
CREATE POLICY "Admins can update permissions"
ON public.role_permissions
FOR UPDATE
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

DROP POLICY IF EXISTS "Admins can delete permissions" ON public.role_permissions;
CREATE POLICY "Admins can delete permissions"
ON public.role_permissions
FOR DELETE
USING (public.is_staff_admin());

-- Insertar TODOS los permisos del sistema para el rol Administrador
INSERT INTO public.role_permissions (role, permission, description)
VALUES
  -- Clientes
  ('Administrador', 'customers.manage', 'Crear, editar y eliminar clientes'),
  ('Administrador', 'customers.view', 'Ver todos los clientes'),
  ('Administrador', 'customers.create', 'Crear clientes'),
  ('Administrador', 'customers.edit', 'Editar clientes'),
  ('Administrador', 'customers.export', 'Exportar datos de clientes'),
  
  -- Runas
  ('Administrador', 'runas.adjust', 'Ajustar runas manualmente'),
  ('Administrador', 'runas.view', 'Ver historial de runas'),
  
  -- Sesiones de caja
  ('Administrador', 'cash_sessions.manage_all', 'Gestionar todas las sesiones de caja'),
  ('Administrador', 'cash_sessions.view_all', 'Ver todas las sesiones de caja'),
  ('Administrador', 'cash_sessions.manage_own', 'Gestionar su propia sesión de caja'),
  ('Administrador', 'cash_sessions.view_own', 'Ver su propia sesión de caja'),
  
  -- Productos
  ('Administrador', 'products.manage', 'Crear, editar y eliminar productos'),
  ('Administrador', 'products.view', 'Ver todos los productos'),
  
  -- Categorías
  ('Administrador', 'categories.manage', 'Gestionar categorías'),
  
  -- Órdenes
  ('Administrador', 'orders.create', 'Crear órdenes'),
  ('Administrador', 'orders.edit', 'Editar órdenes'),
  ('Administrador', 'orders.delete', 'Eliminar órdenes'),
  ('Administrador', 'orders.view_all', 'Ver todas las órdenes'),
  ('Administrador', 'orders.view_kitchen', 'Ver órdenes en cocina'),
  ('Administrador', 'orders.update_status', 'Actualizar estado de órdenes'),
  ('Administrador', 'orders.view_delivery', 'Ver órdenes de delivery'),
  ('Administrador', 'orders.update_delivery', 'Actualizar delivery'),
  
  -- Reportes
  ('Administrador', 'reports.view', 'Ver reportes y estadísticas'),
  ('Administrador', 'reports.export', 'Exportar reportes'),
  
  -- Sistema
  ('Administrador', 'users.manage', 'Gestionar usuarios del sistema'),
  ('Administrador', 'config.manage', 'Modificar configuración del sistema'),
  
  -- Cupones
  ('Administrador', 'coupons.manage', 'Gestionar cupones'),
  ('Administrador', 'coupons.apply', 'Aplicar cupones')
ON CONFLICT (role, permission) DO NOTHING;