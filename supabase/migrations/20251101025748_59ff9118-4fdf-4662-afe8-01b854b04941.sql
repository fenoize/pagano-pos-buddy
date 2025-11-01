-- Fix: Infinite recursion in RLS policies
-- Solución: Crear funciones SECURITY DEFINER que bypaseen RLS y simplificar políticas

-- 1. Función para verificar si hay una sesión de staff activa (SECURITY DEFINER bypasea RLS)
CREATE OR REPLACE FUNCTION public.has_active_staff_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.staff_sessions ss
    INNER JOIN public.users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > NOW()
      AND u.active = true
  );
$$;

-- 2. Recrear is_staff_admin() para que sea más eficiente
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.staff_sessions ss
    INNER JOIN public.user_roles ur ON ur.user_id = ss.user_id
    INNER JOIN public.users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > NOW()
      AND ur.role = 'Administrador'
      AND u.active = true
  );
$$;

-- 3. USERS: Política simplificada que SOLO usa funciones SECURITY DEFINER
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
CREATE POLICY "Staff can view all users" 
ON public.users
FOR SELECT
USING (
  public.has_active_staff_session()
);

-- 4. USER_ROLES: Política simplificada
DROP POLICY IF EXISTS "Staff can view all user roles" ON public.user_roles;
CREATE POLICY "Staff can view all user roles" 
ON public.user_roles
FOR SELECT
USING (
  public.has_active_staff_session()
);

-- 5. ORDERS: Política simplificada
DROP POLICY IF EXISTS "Staff can read all orders" ON public.orders;
CREATE POLICY "Staff can read all orders" 
ON public.orders
FOR SELECT
USING (
  public.has_active_staff_session()
);

-- 6. CUSTOMERS: Asegurar que también use el mismo patrón
DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
CREATE POLICY "Staff can view all customers" 
ON public.customers
FOR SELECT
USING (
  public.has_active_staff_session()
);

-- 7. CASH_SESSIONS: Para el dashboard
DROP POLICY IF EXISTS "Staff can view cash sessions" ON public.cash_sessions;
CREATE POLICY "Staff can view cash sessions" 
ON public.cash_sessions
FOR SELECT
USING (
  public.has_active_staff_session()
);