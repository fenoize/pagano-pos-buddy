-- ============================================
-- OPCIÓN 3: Máxima Seguridad - SECURITY DEFINER + Trigger
-- Solo Administradores y Cajeros pueden abrir/cerrar turnos
-- Sin exponer tabla users a public
-- ============================================

-- 1. Crear función helper SECURITY DEFINER para validar usuarios activos
-- Esta función evita exponer la tabla users directamente en RLS
CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = _user_id
      AND active = true
  );
$$;

-- 2. Eliminar políticas RLS antiguas de cash_sessions
DROP POLICY IF EXISTS "Active users can create cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Staff with cashier role can create sessions" ON public.cash_sessions;

-- 3. Crear nueva política RLS para INSERT usando la función helper
-- CAPA 1: Valida que el usuario esté activo
CREATE POLICY "Active users can create cash sessions"
ON public.cash_sessions FOR INSERT
WITH CHECK (public.is_active_user(user_id));

-- 4. Asegurar que existe la función de validación de roles
-- CAPA 2: Valida que el usuario tenga rol Cajero o Administrador
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

-- 5. Recrear trigger para validación de roles
DROP TRIGGER IF EXISTS check_cash_session_user ON public.cash_sessions;

CREATE TRIGGER check_cash_session_user
  BEFORE INSERT ON public.cash_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cash_session_user();

-- 6. Reforzar política RLS de cash_movements para INSERT
-- Incluye validación de usuario activo además de sesión y roles
DROP POLICY IF EXISTS "Staff with cashier role can create movements" ON public.cash_movements;

CREATE POLICY "Staff with cashier role can create movements"
ON public.cash_movements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.cash_sessions cs
    JOIN public.user_roles ur ON ur.user_id = cs.user_id
    WHERE cs.id = cash_movements.session_id
      AND public.is_active_user(cs.user_id)
      AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ Cajero puede abrir/cerrar turno
-- ✅ Administrador puede abrir/cerrar turno
-- ❌ Cocina NO puede abrir turno (falla en trigger)
-- ❌ Usuario inactivo NO puede abrir turno (falla en RLS)
-- ✅ No se expone tabla users a public
-- ============================================