-- ============================================
-- CORRECCIÓN DEFINITIVA: RLS sin dependencias circulares
-- Fecha: 2025-10-09
-- Objetivo: Eliminar JOIN a users en funciones y políticas
-- ============================================

-- ============================================
-- PASO 1: Funciones SECURITY DEFINER corregidas
-- ============================================

-- 1. is_staff_admin() - Solo consulta user_roles
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = public.get_current_staff_user_id()
      AND ur.role = 'Administrador'
  );
$$;

-- 2. has_role() - Solo consulta user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 3. has_permission() - user_roles + role_permissions (sin users)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
  );
$$;

-- 4. is_active_user() - Consulta directa a users (SECURITY DEFINER bypass RLS)
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = _user_id
      AND active = true
  );
$$;

-- ============================================
-- PASO 2: role_permissions RLS
-- ============================================

-- Eliminar política vieja si existe
DROP POLICY IF EXISTS "Staff can read permissions" ON public.role_permissions;

-- Permitir a staff leer permisos (para usePermissions)
CREATE POLICY "Staff can read permissions"
ON public.role_permissions FOR SELECT
USING (public.get_current_staff_user_id() IS NOT NULL);

-- ============================================
-- PASO 3: user_roles RLS (sin TO authenticated)
-- ============================================

-- Eliminar política vieja
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Recrear SIN "TO authenticated"
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = public.get_current_staff_user_id());

-- ============================================
-- PASO 4: orders RLS (sin JOIN a users)
-- ============================================

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
DROP POLICY IF EXISTS "Cajero and Admin can create orders" ON public.orders;

-- Crear política limpia usando has_role()
CREATE POLICY "Cajero and Admin can create orders"
ON public.orders FOR INSERT
WITH CHECK (
  public.has_role(orders.created_by_user_id, 'Cajero')
  OR public.has_role(orders.created_by_user_id, 'Administrador')
);

-- ============================================
-- PASO 5: cash_sessions RLS (sin JOIN a users)
-- ============================================

-- Eliminar políticas viejas con subqueries problemáticas
DROP POLICY IF EXISTS "Active users can create cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Session owner or admin can update" ON public.cash_sessions;

-- INSERT: Validar con has_role() limpio
CREATE POLICY "Cajeros and admins can create sessions"
ON public.cash_sessions FOR INSERT
WITH CHECK (
  public.has_role(public.get_current_staff_user_id(), 'Cajero')
  OR public.is_staff_admin()
);

-- UPDATE: Solo owner o admin (sin subquery a users)
CREATE POLICY "Session owner or admin can update sessions"
ON public.cash_sessions FOR UPDATE
USING (
  user_id = public.get_current_staff_user_id()
  OR public.is_staff_admin()
)
WITH CHECK (
  user_id = public.get_current_staff_user_id()
  OR public.is_staff_admin()
);

-- ============================================
-- PASO 6: cash_movements RLS (sin JOIN a users)
-- ============================================

-- Eliminar políticas viejas con subquery problemática
DROP POLICY IF EXISTS "Staff with cashier role can create movements" ON public.cash_movements;

-- INSERT: Validar rol limpiamente
CREATE POLICY "Cajeros and admins can create movements"
ON public.cash_movements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cash_sessions cs
    WHERE cs.id = cash_movements.session_id
      AND cs.user_id = public.get_current_staff_user_id()
      AND (
        public.has_role(cs.user_id, 'Cajero')
        OR public.has_role(cs.user_id, 'Administrador')
      )
  )
);