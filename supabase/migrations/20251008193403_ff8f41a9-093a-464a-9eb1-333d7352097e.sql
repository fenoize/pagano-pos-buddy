-- =====================================================
-- FASE 6: RLS y Database Context
-- Funciones para setear contexto de sesión DB
-- =====================================================

-- Función para establecer contexto de staff/usuarios del POS
-- Establece app.user_id para que las RLS policies puedan identificar al usuario del staff
CREATE OR REPLACE FUNCTION public.set_staff_context(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, false);
  -- Limpiar cualquier contexto de customer que pueda existir
  PERFORM set_config('app.customer_id', '', false);
  PERFORM set_config('app.customer_account_id', '', false);
END;
$$;

COMMENT ON FUNCTION public.set_staff_context IS 
'Establece el contexto de sesión para usuarios del staff/POS. 
Setea app.user_id y limpia cualquier contexto de customer.';

-- Actualizar la función set_customer_context para también limpiar contexto de staff
CREATE OR REPLACE FUNCTION public.set_customer_context(p_account_id uuid, p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.customer_account_id', p_account_id::text, false);
  PERFORM set_config('app.customer_id', p_customer_id::text, false);
  -- Limpiar cualquier contexto de staff que pueda existir
  PERFORM set_config('app.user_id', '', false);
END;
$$;

COMMENT ON FUNCTION public.set_customer_context IS 
'Establece el contexto de sesión para clientes del portal. 
Setea app.customer_account_id y app.customer_id, y limpia cualquier contexto de staff.';

-- Función helper para obtener el user_id actual del contexto
CREATE OR REPLACE FUNCTION public.get_current_staff_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

COMMENT ON FUNCTION public.get_current_staff_user_id IS 
'Retorna el user_id del staff actual desde el contexto de sesión, o NULL si no está seteado.';

-- Función helper para obtener el customer_id actual del contexto
CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NULLIF(current_setting('app.customer_id', true), '')::uuid;
$$;

COMMENT ON FUNCTION public.get_current_customer_id IS 
'Retorna el customer_id actual desde el contexto de sesión, o NULL si no está seteado.';