-- ============================================
-- CORRECCIÓN: RLS Simplificado + Trigger de Validación de Roles
-- Solo Administradores y Cajeros pueden abrir/cerrar turnos
-- ============================================

-- 1. Eliminar política RLS problemática actual
DROP POLICY IF EXISTS "Staff with cashier role can create sessions" ON cash_sessions;

-- 2. Crear política RLS simplificada (solo valida usuario activo)
CREATE POLICY "Active users can create cash sessions"
ON cash_sessions FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM users WHERE active = true)
);

-- 3. Función de validación de rol (ejecuta ANTES del INSERT)
CREATE OR REPLACE FUNCTION public.validate_cash_session_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario tiene rol Cajero o Administrador
  IF NOT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
      AND ur.role IN ('Cajero', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuario no tiene permisos para abrir sesión de caja. Solo Cajeros y Administradores pueden abrir turnos.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Trigger que ejecuta la validación ANTES del INSERT
DROP TRIGGER IF EXISTS check_cash_session_user ON cash_sessions;

CREATE TRIGGER check_cash_session_user
  BEFORE INSERT ON cash_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cash_session_user();