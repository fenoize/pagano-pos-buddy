-- ============================================
-- FASE 2: MÓDULO CENTRALIZADO DE PERMISOS
-- Sistema escalable de permisos por rol
-- ============================================

-- 1. Crear tabla de permisos por rol
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (role, permission)
);

-- Habilitar RLS en role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden gestionar permisos
CREATE POLICY "Admins can manage permissions"
ON public.role_permissions FOR ALL
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

-- 2. Crear función central de validación de permisos
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
      AND u.active = true
  );
$$;

-- 3. Popular permisos iniciales por rol
INSERT INTO public.role_permissions (role, permission, description) VALUES
  -- ADMINISTRADOR: Acceso completo
  ('Administrador', 'customers.manage', 'Crear, editar y eliminar clientes'),
  ('Administrador', 'customers.view', 'Ver todos los clientes'),
  ('Administrador', 'customers.export', 'Exportar datos de clientes'),
  ('Administrador', 'runas.adjust', 'Ajustar runas manualmente'),
  ('Administrador', 'runas.view', 'Ver historial de runas'),
  ('Administrador', 'cash_sessions.manage_all', 'Gestionar todas las sesiones de caja'),
  ('Administrador', 'cash_sessions.view_all', 'Ver todas las sesiones de caja'),
  ('Administrador', 'products.manage', 'Crear, editar y eliminar productos'),
  ('Administrador', 'products.view', 'Ver todos los productos'),
  ('Administrador', 'categories.manage', 'Gestionar categorías'),
  ('Administrador', 'orders.create', 'Crear órdenes'),
  ('Administrador', 'orders.edit', 'Editar órdenes'),
  ('Administrador', 'orders.delete', 'Eliminar órdenes'),
  ('Administrador', 'orders.view_all', 'Ver todas las órdenes'),
  ('Administrador', 'reports.view', 'Ver reportes y estadísticas'),
  ('Administrador', 'reports.export', 'Exportar reportes'),
  ('Administrador', 'users.manage', 'Gestionar usuarios del sistema'),
  ('Administrador', 'config.manage', 'Modificar configuración del sistema'),
  ('Administrador', 'coupons.manage', 'Gestionar cupones'),
  
  -- CAJERO: Operaciones de POS y ventas
  ('Cajero', 'customers.view', 'Ver clientes'),
  ('Cajero', 'customers.create', 'Crear clientes'),
  ('Cajero', 'customers.edit', 'Editar clientes'),
  ('Cajero', 'runas.view', 'Ver saldo de runas'),
  ('Cajero', 'cash_sessions.manage_own', 'Abrir/cerrar su propia caja'),
  ('Cajero', 'cash_sessions.view_own', 'Ver su propia sesión de caja'),
  ('Cajero', 'products.view', 'Ver productos'),
  ('Cajero', 'orders.create', 'Crear órdenes'),
  ('Cajero', 'orders.edit', 'Editar órdenes propias'),
  ('Cajero', 'orders.view_all', 'Ver todas las órdenes'),
  ('Cajero', 'coupons.apply', 'Aplicar cupones'),
  
  -- COCINA: Gestión de comandas
  ('Cocina', 'orders.view_kitchen', 'Ver comandas en cocina'),
  ('Cocina', 'orders.update_status', 'Actualizar estado de comandas'),
  
  -- REPARTO: Gestión de entregas
  ('Reparto', 'orders.view_delivery', 'Ver órdenes para entregar'),
  ('Reparto', 'orders.update_delivery', 'Actualizar estado de entrega'),
  
  -- VIEWER: Solo lectura
  ('Viewer', 'orders.view_all', 'Ver todas las órdenes'),
  ('Viewer', 'products.view', 'Ver productos'),
  ('Viewer', 'customers.view', 'Ver clientes')
ON CONFLICT (role, permission) DO NOTHING;

-- 4. Trigger para updated_at en role_permissions
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ Tabla role_permissions con permisos granulares
-- ✅ Función has_permission() centralizada
-- ✅ 34 permisos iniciales configurados
-- ✅ Administrador: 19 permisos (acceso completo)
-- ✅ Cajero: 11 permisos (POS y ventas)
-- ✅ Cocina: 2 permisos (comandas)
-- ✅ Reparto: 2 permisos (entregas)
-- ✅ Viewer: 3 permisos (solo lectura)
-- ============================================