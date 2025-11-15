-- ============================================================================
-- PASO 1: Crear función para obtener user_id desde sesión actual
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_id_from_current_session()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Intentar obtener desde app.user_id (por si se estableció en la misma transacción)
  v_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;
  
  -- Fallback: buscar sesión activa más reciente del usuario
  -- Esto es un workaround temporal hasta implementar validación por token
  SELECT ss.user_id INTO v_user_id
  FROM staff_sessions ss
  JOIN users u ON u.id = ss.user_id
  WHERE ss.is_active = true
    AND ss.expires_at > NOW()
    AND u.active = true
  ORDER BY ss.created_at DESC
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;

-- ============================================================================
-- PASO 2: Recrear funciones de seguridad
-- ============================================================================

-- Verificar si es Cajero o Administrador
CREATE OR REPLACE FUNCTION public.is_cashier_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = get_user_id_from_current_session()
      AND ur.role IN ('Cajero', 'Administrador')
  );
$$;

-- Verificar si es Administrador
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = get_user_id_from_current_session()
      AND ur.role = 'Administrador'
  );
$$;

-- Verificar si es staff activo
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = get_user_id_from_current_session()
      AND u.active = true
  );
$$;

-- ============================================================================
-- PASO 3: Actualizar RLS Policies de cash_movements
-- ============================================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Staff can view cash movements" ON cash_movements;
DROP POLICY IF EXISTS "Staff can insert cash movements" ON cash_movements;
DROP POLICY IF EXISTS "Staff can update cash movements" ON cash_movements;
DROP POLICY IF EXISTS "Only admins can delete cash movements" ON cash_movements;

-- Crear nuevas políticas simplificadas
CREATE POLICY "Staff can view cash movements" ON cash_movements
FOR SELECT
USING (is_cashier_or_admin());

CREATE POLICY "Staff can insert cash movements" ON cash_movements
FOR INSERT
WITH CHECK (is_cashier_or_admin());

CREATE POLICY "Staff can update cash movements" ON cash_movements
FOR UPDATE
USING (is_cashier_or_admin())
WITH CHECK (is_cashier_or_admin());

CREATE POLICY "Only admins can delete cash movements" ON cash_movements
FOR DELETE
USING (is_active_admin());

-- ============================================================================
-- PASO 4: Actualizar RLS Policies de cash_sessions
-- ============================================================================

-- Limpiar políticas existentes
DROP POLICY IF EXISTS "Staff can view all sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Staff can view cash sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Cajeros and admins can create sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Staff can update sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Only admins can delete sessions" ON cash_sessions;

-- Nuevas políticas
CREATE POLICY "Staff can view sessions" ON cash_sessions
FOR SELECT
USING (is_active_staff());

CREATE POLICY "Cajeros and admins can create sessions" ON cash_sessions
FOR INSERT
WITH CHECK (is_cashier_or_admin());

CREATE POLICY "Users can update own sessions, admins can update all" ON cash_sessions
FOR UPDATE
USING (
  get_user_id_from_current_session() = user_id 
  OR is_active_admin()
)
WITH CHECK (
  get_user_id_from_current_session() = user_id 
  OR is_active_admin()
);

CREATE POLICY "Only admins can delete sessions" ON cash_sessions
FOR DELETE
USING (is_active_admin());

-- ============================================================================
-- PASO 5: Actualizar RLS Policies de orders
-- ============================================================================

-- Eliminar políticas antiguas que usan current_setting directamente
DROP POLICY IF EXISTS "Cashiers and admins can create orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;
DROP POLICY IF EXISTS "Staff can view orders" ON orders;

-- Crear nuevas políticas usando las funciones actualizadas
CREATE POLICY "Staff can view orders" ON orders
FOR SELECT
USING (is_active_staff());

CREATE POLICY "Cashiers and admins can create orders" ON orders
FOR INSERT
WITH CHECK (is_cashier_or_admin());

CREATE POLICY "Staff can update orders" ON orders
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Admins can delete orders" ON orders
FOR DELETE
USING (is_active_admin());