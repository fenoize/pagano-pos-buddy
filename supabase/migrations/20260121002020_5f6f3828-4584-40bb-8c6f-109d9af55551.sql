-- =============================================
-- FIX: Session and Permission Issues for Cajero/Administrador
-- =============================================

-- 1. Update is_cashier_or_admin() to include 'Cajero' role
CREATE OR REPLACE FUNCTION public.is_cashier_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT COALESCE(
  current_setting('app.user_id', true) IS NOT NULL 
  AND current_setting('app.user_id', true) != ''
  AND EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = public.get_user_id_from_current_session()
      AND u.active = true
      AND u.role IN ('Administrador', 'Caja', 'Cajero')
  ),
  false
);
$$;

-- 2. CASH_SESSIONS: Permissive policies for internal POS operations
DROP POLICY IF EXISTS "Staff can view sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Cajeros and admins can create sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Users can update own sessions, admins can update all" ON public.cash_sessions;
DROP POLICY IF EXISTS "Allow read access to cash_sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Allow insert to cash_sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Allow update to cash_sessions" ON public.cash_sessions;

CREATE POLICY "Allow read access to cash_sessions" 
ON public.cash_sessions FOR SELECT USING (true);

CREATE POLICY "Allow insert to cash_sessions" 
ON public.cash_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update to cash_sessions" 
ON public.cash_sessions FOR UPDATE USING (true) WITH CHECK (true);

-- 3. CASH_MOVEMENTS: Permissive policies
DROP POLICY IF EXISTS "Staff can view cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff can insert cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff can update cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff can delete cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Allow read access to cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Allow insert to cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Allow update to cash_movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Allow delete to cash_movements" ON public.cash_movements;

CREATE POLICY "Allow read access to cash_movements" 
ON public.cash_movements FOR SELECT USING (true);

CREATE POLICY "Allow insert to cash_movements" 
ON public.cash_movements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update to cash_movements" 
ON public.cash_movements FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete to cash_movements" 
ON public.cash_movements FOR DELETE USING (true);

-- 4. USER_ROLES: Permissive read for permission checks
DROP POLICY IF EXISTS "Staff can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow read access to user_roles" ON public.user_roles;

CREATE POLICY "Allow read access to user_roles" 
ON public.user_roles FOR SELECT USING (true);

-- 5. ROLE_PERMISSIONS: Permissive read for permission checks
DROP POLICY IF EXISTS "Staff can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Allow read access to role_permissions" ON public.role_permissions;

CREATE POLICY "Allow read access to role_permissions" 
ON public.role_permissions FOR SELECT USING (true);

-- 6. USERS table: Ensure staff can read users for lookups
DROP POLICY IF EXISTS "Staff can view users" ON public.users;
DROP POLICY IF EXISTS "Allow read access to users" ON public.users;

CREATE POLICY "Allow read access to users" 
ON public.users FOR SELECT USING (true);