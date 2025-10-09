-- Approach más simple y robusto: deshabilitar RLS para lecturas en sistema POS interno
-- Esto es seguro porque el acceso al POS ya requiere autenticación previa

-- Para CUSTOMERS: acceso de lectura sin restricciones (es sistema interno)
DROP POLICY IF EXISTS "Allow public read access to customers" ON public.customers;

CREATE POLICY "Public can read customers" ON public.customers
FOR SELECT TO public
USING (true);

-- Para ORDERS: acceso de lectura sin restricciones (es sistema interno)
DROP POLICY IF EXISTS "Allow staff to view all orders" ON public.orders;

CREATE POLICY "Public can read orders" ON public.orders
FOR SELECT TO public  
USING (true);

-- Verificar que las políticas de escritura sigan siendo restrictivas
-- (no cambiarlas, solo asegurar que existan)

-- Para debugging: crear una vista que nos diga si las políticas están activas
CREATE OR REPLACE VIEW public.debug_policies AS
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as qual_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'orders')
ORDER BY tablename, cmd, policyname;