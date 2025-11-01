-- Paso 1: Actualizar política RLS de users para aceptar token válido O admin por rol
DROP POLICY IF EXISTS "Staff can view all users" ON users;
CREATE POLICY "Staff can view all users" ON users
  FOR SELECT
  USING (
    -- Método 1: Token válido en staff_sessions
    EXISTS (
      SELECT 1 FROM staff_sessions ss
      WHERE ss.is_active = true
        AND ss.expires_at > NOW()
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = ss.user_id AND u.active = true
        )
    )
    -- Método 2: Es admin verificado por rol
    OR is_staff_admin()
  );

-- Paso 2: Actualizar política RLS de user_roles para aceptar token válido O admin por rol
DROP POLICY IF EXISTS "Staff can view all user roles" ON user_roles;
CREATE POLICY "Staff can view all user roles" ON user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_sessions ss
      WHERE ss.is_active = true
        AND ss.expires_at > NOW()
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = ss.user_id AND u.active = true
        )
    )
    OR is_staff_admin()
  );

-- Paso 3: Actualizar política RLS de orders para aceptar token válido O staff activo
DROP POLICY IF EXISTS "Staff can read all orders" ON orders;
CREATE POLICY "Staff can read all orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_sessions ss
      WHERE ss.is_active = true
        AND ss.expires_at > NOW()
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = ss.user_id AND u.active = true
        )
    )
    OR is_active_staff()
  );

-- Paso 4: Simplificar is_staff_admin() para usar sesiones directamente
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.staff_sessions ss
    INNER JOIN public.user_roles ur ON ur.user_id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > now()
      AND ur.role = 'Administrador'
  );
$$;