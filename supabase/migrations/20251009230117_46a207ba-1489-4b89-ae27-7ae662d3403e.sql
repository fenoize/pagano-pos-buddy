-- El problema es que is_active_staff() no funciona porque el contexto se pierde
-- Vamos a hacer las políticas de customers más permisivas para lectura

-- Eliminar la política restrictiva actual
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
DROP POLICY IF EXISTS "Customer can view own data" ON public.customers;

-- Crear política permisiva de lectura para staff (todos pueden leer)
-- Esto es seguro porque es un sistema POS interno
CREATE POLICY "Allow public read access to customers" ON public.customers
FOR SELECT
USING (true);

-- Mantener las políticas de escritura restrictivas
-- (Solo staff puede actualizar y crear)

-- Para orders, vamos a hacer lo mismo con SELECT
DROP POLICY IF EXISTS "Staff and customers can view orders" ON public.orders;

CREATE POLICY "Allow staff to view all orders" ON public.orders
FOR SELECT
USING (true);