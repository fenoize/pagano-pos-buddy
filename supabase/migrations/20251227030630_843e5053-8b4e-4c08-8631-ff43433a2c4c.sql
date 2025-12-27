-- Eliminar políticas anteriores que usan get_current_customer_id()
DROP POLICY IF EXISTS "Customers can create redemption transactions" ON runas_transactions;
DROP POLICY IF EXISTS "Customers can view own transactions" ON runas_transactions;

-- Crear función helper para verificar propiedad del cliente
CREATE OR REPLACE FUNCTION public.is_customer_owner(p_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = p_customer_id 
    AND auth_user_id = auth.uid()
  );
$$;

-- Crear nueva política para INSERT basada en auth.uid()
CREATE POLICY "Customers can create redemption transactions v2"
ON runas_transactions FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_customer_owner(customer_id)
  AND type = 'canje'
  AND runas < 0
);

-- Política para ver transacciones propias
CREATE POLICY "Customers can view own transactions v2"
ON runas_transactions FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_customer_owner(customer_id)
);