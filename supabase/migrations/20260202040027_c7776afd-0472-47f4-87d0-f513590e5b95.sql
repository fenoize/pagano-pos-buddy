-- =====================================================
-- FIX: La subconsulta en las políticas RLS de finance_expenses falla
-- porque staff_sessions tiene RLS con USING(false).
-- Solución: Crear una función SECURITY DEFINER que verifique las sesiones
-- =====================================================

-- 1. Crear función SECURITY DEFINER para verificar si hay sesión de staff activa
CREATE OR REPLACE FUNCTION public.has_any_active_staff_session()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM staff_sessions
    WHERE is_active = true
      AND expires_at > NOW()
  );
$$;

-- 2. Actualizar las políticas para usar la función en lugar de subconsulta directa

-- Para finance_expenses
DROP POLICY IF EXISTS "Anyone with active staff session can view expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can view all expenses" ON public.finance_expenses;

CREATE POLICY "Staff with active session can view expenses"
ON public.finance_expenses
FOR SELECT
TO anon, authenticated
USING (has_any_active_staff_session());

-- Para delivery_payments
DROP POLICY IF EXISTS "Anyone with active staff session can view delivery payments" ON public.delivery_payments;
DROP POLICY IF EXISTS "Staff can view delivery payments" ON public.delivery_payments;
DROP POLICY IF EXISTS "Delivery persons can view their own payments" ON public.delivery_payments;

CREATE POLICY "Staff with active session can view delivery payments"
ON public.delivery_payments
FOR SELECT
TO anon, authenticated
USING (has_any_active_staff_session());

-- Para finance_accounts
DROP POLICY IF EXISTS "Anyone with active staff session can view accounts" ON public.finance_accounts;
DROP POLICY IF EXISTS "Staff can view finance accounts" ON public.finance_accounts;

CREATE POLICY "Staff with active session can view accounts"
ON public.finance_accounts
FOR SELECT
TO anon, authenticated
USING (has_any_active_staff_session());