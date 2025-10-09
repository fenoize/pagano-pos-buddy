-- ================================================
-- PASO 1: Crear tabla de sesiones de staff
-- ================================================
CREATE TABLE IF NOT EXISTS public.staff_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_token ON public.staff_sessions(token);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_user_id ON public.staff_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires ON public.staff_sessions(expires_at) WHERE is_active = true;

-- RLS: No permitir acceso directo
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to staff_sessions"
ON public.staff_sessions FOR ALL
USING (false) WITH CHECK (false);

-- ================================================
-- PASO 2: Funciones para gestión de sesiones
-- ================================================

-- Crear sesión al login
CREATE OR REPLACE FUNCTION public.create_staff_session(_user_id uuid)
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text := gen_random_uuid()::text;
  v_expires_at timestamptz := now() + interval '12 hours';
BEGIN
  -- Invalidar sesiones antiguas del usuario (mantener solo 1 sesión activa)
  UPDATE public.staff_sessions 
  SET is_active = false 
  WHERE user_id = _user_id AND is_active = true;
  
  -- Crear nueva sesión
  INSERT INTO public.staff_sessions(user_id, token, expires_at)
  VALUES (_user_id, v_token, v_expires_at)
  RETURNING staff_sessions.token, staff_sessions.expires_at INTO token, expires_at;
  
  RETURN NEXT;
END;
$$;

-- Invalidar sesión (logout)
CREATE OR REPLACE FUNCTION public.invalidate_staff_session(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.staff_sessions 
  SET is_active = false 
  WHERE token = _token;
  
  RETURN FOUND;
END;
$$;

-- ================================================
-- PASO 3: Cerrar políticas SELECT en customers
-- ================================================

-- Eliminar política permisiva actual
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;

-- Crear política solo para clientes autenticados (Supabase Auth)
CREATE POLICY "Customer can view own data"
ON public.customers FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = auth_user_id
);

-- Las políticas de INSERT/UPDATE/DELETE ya existen y están seguras:
-- - "Cajero and Admin can create customers"
-- - "Staff can update customers"  
-- - "Only admins can delete customers"