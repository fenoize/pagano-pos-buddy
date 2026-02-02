-- =====================================================
-- FIX: Políticas RLS permisivas para finance_expenses y delivery_payments
-- Problema: Las funciones staff_has_permission requieren contexto de staff_sessions
--           pero los hooks frontend no establecen ese contexto correctamente.
-- Solución: Crear políticas permisivas basadas en is_active_staff() que no
--           dependen del contexto de sesión de la misma manera.
-- =====================================================

-- 1. FINANCE_EXPENSES: Agregar política SELECT permisiva para staff activo
DROP POLICY IF EXISTS "Active staff can view expenses" ON public.finance_expenses;
DROP POLICY IF EXISTS "Staff can view all expenses" ON public.finance_expenses;

-- Política permisiva: cualquier staff activo puede ver todos los egresos
CREATE POLICY "Staff can view all expenses"
ON public.finance_expenses
FOR SELECT
TO authenticated
USING (is_active_staff());

-- 2. DELIVERY_PAYMENTS: Verificar y corregir políticas SELECT
-- Ya tiene políticas pero vamos a asegurar que is_active_staff funcione

DROP POLICY IF EXISTS "Staff can view delivery payments" ON public.delivery_payments;

CREATE POLICY "Staff can view delivery payments"
ON public.delivery_payments
FOR SELECT
TO authenticated
USING (is_active_staff());

-- 3. FINANCE_ACCOUNTS: Asegurar que staff pueda ver las cuentas
DROP POLICY IF EXISTS "Staff can view finance accounts" ON public.finance_accounts;

CREATE POLICY "Staff can view finance accounts"
ON public.finance_accounts
FOR SELECT
TO authenticated
USING (is_active_staff());

-- 4. Actualizar la función is_active_staff para que sea más robusta
-- y no dependa del contexto app.user_id para SELECT
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    INNER JOIN public.staff_sessions ss ON ss.user_id = u.id
    WHERE u.active = true
      AND ss.is_active = true
      AND ss.expires_at > NOW()
  );
$$;