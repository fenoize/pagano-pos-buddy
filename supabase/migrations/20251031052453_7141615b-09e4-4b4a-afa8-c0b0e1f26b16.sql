-- =====================================================
-- SOLUCIÓN: Usar tokens de staff_sessions en RLS
-- Fecha: 2025-01-31
-- Descripción: Modificar políticas RLS para validar tokens en lugar de contexto de sesión
-- =====================================================

-- 1. Crear función para obtener user_id desde token en Authorization header
CREATE OR REPLACE FUNCTION public.get_current_staff_user_from_token()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_auth_header text;
  v_token text;
  v_user_id uuid;
BEGIN
  -- Intentar obtener el header Authorization
  BEGIN
    v_auth_header := current_setting('request.headers', true)::json->>'authorization';
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
  
  -- Si no hay header, retornar NULL
  IF v_auth_header IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extraer token (formato: "Bearer <token>" o solo "<token>")
  IF v_auth_header LIKE 'Bearer %' THEN
    v_token := substring(v_auth_header from 8);
  ELSE
    v_token := v_auth_header;
  END IF;
  
  -- Validar token en staff_sessions y obtener user_id
  SELECT ss.user_id INTO v_user_id
  FROM public.staff_sessions ss
  INNER JOIN public.users u ON u.id = ss.user_id
  WHERE ss.token = v_token
    AND ss.is_active = true
    AND ss.expires_at > now()
    AND u.active = true;
  
  RETURN v_user_id;
END;
$$;

-- 2. Crear función helper para validar staff activo con token
CREATE OR REPLACE FUNCTION public.is_active_staff_with_token()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := public.get_current_staff_user_from_token();
  RETURN v_user_id IS NOT NULL;
END;
$$;

-- 3. Actualizar políticas RLS de ORDERS
DROP POLICY IF EXISTS "Staff can read all orders" ON public.orders;
CREATE POLICY "Staff can read all orders" ON public.orders
  FOR SELECT
  USING (public.is_active_staff_with_token());

-- 4. Actualizar políticas RLS de USERS
DROP POLICY IF EXISTS "Staff can view all users" ON public.users;
CREATE POLICY "Staff can view all users" ON public.users
  FOR SELECT
  USING (public.is_active_staff_with_token());

-- 5. Actualizar políticas RLS de USER_ROLES
DROP POLICY IF EXISTS "Staff can view all user roles" ON public.user_roles;
CREATE POLICY "Staff can view all user roles" ON public.user_roles
  FOR SELECT
  USING (public.is_active_staff_with_token());

-- 6. Actualizar políticas RLS de ADDRESSES
DROP POLICY IF EXISTS "Staff can view all addresses" ON public.addresses;
CREATE POLICY "Staff can view all addresses" ON public.addresses
  FOR SELECT
  USING (public.is_active_staff_with_token());

-- 7. Actualizar políticas RLS de CUSTOMERS (si hay queries directas)
-- Verificar si existe política de staff para customers y actualizarla
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'customers' 
      AND policyname LIKE '%staff%'
  ) THEN
    DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;
    CREATE POLICY "Staff can view all customers" ON public.customers
      FOR SELECT
      USING (public.is_active_staff_with_token());
  END IF;
END $$;