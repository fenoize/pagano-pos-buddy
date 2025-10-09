-- ============================================
-- FASE 1: FIX URGENTE - Corrección de Políticas RLS
-- Objetivo: Desbloquear operaciones críticas con seguridad adecuada
-- Tablas: runas_transactions, orders, customers
-- ============================================

-- ============================================
-- 1. RUNAS_TRANSACTIONS - Ajustes Manuales Solo Admin
-- ============================================

-- Eliminar política permisiva actual
DROP POLICY IF EXISTS "Allow public access to runas_transactions" ON public.runas_transactions;
DROP POLICY IF EXISTS "Customers can view own runas" ON public.runas_transactions;

-- SELECT: Staff puede ver todas las transacciones + Clientes ven solo las suyas
CREATE POLICY "Staff can view runas transactions"
ON public.runas_transactions FOR SELECT
USING (
  public.get_current_staff_user_id() IS NOT NULL
  OR customer_id IN (
    SELECT id FROM public.customers 
    WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Staff activo puede crear acumulación y canje
CREATE POLICY "Staff can create accumulation and redemption"
ON public.runas_transactions FOR INSERT
WITH CHECK (
  public.get_current_staff_user_id() IS NOT NULL
  AND type IN ('acumulacion', 'canje')
);

-- INSERT: Solo Admin puede crear ajustes manuales
CREATE POLICY "Only admins can create manual adjustments"
ON public.runas_transactions FOR INSERT
WITH CHECK (
  public.is_staff_admin()
  AND type = 'ajuste'
  AND responsable_id = public.get_current_staff_user_id()
);

-- UPDATE: Solo Admin puede modificar transacciones
CREATE POLICY "Only admins can update runas transactions"
ON public.runas_transactions FOR UPDATE
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

-- DELETE: Solo Admin puede eliminar transacciones
CREATE POLICY "Only admins can delete runas transactions"
ON public.runas_transactions FOR DELETE
USING (public.is_staff_admin());

-- ============================================
-- 2. ORDERS - Cajeros y Admins pueden operar
-- ============================================

-- Eliminar políticas permisivas actuales
DROP POLICY IF EXISTS "Allow public insert access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update access to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public delete access to orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;

-- SELECT: Staff ve todas + Clientes ven solo las suyas
CREATE POLICY "Staff can view all orders"
ON public.orders FOR SELECT
USING (
  public.get_current_staff_user_id() IS NOT NULL
  OR customer_id IN (
    SELECT id FROM public.customers 
    WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Cajero y Admin pueden crear órdenes
CREATE POLICY "Cajero and Admin can create orders"
ON public.orders FOR INSERT
WITH CHECK (
  public.has_role(public.get_current_staff_user_id(), 'Cajero')
  OR public.is_staff_admin()
);

-- UPDATE: Staff puede actualizar órdenes
CREATE POLICY "Staff can update orders"
ON public.orders FOR UPDATE
USING (public.get_current_staff_user_id() IS NOT NULL)
WITH CHECK (public.get_current_staff_user_id() IS NOT NULL);

-- DELETE: Solo Admin puede eliminar órdenes
CREATE POLICY "Only admins can delete orders"
ON public.orders FOR DELETE
USING (public.is_staff_admin());

-- ============================================
-- 3. CUSTOMERS - Gestión de Clientes
-- ============================================

-- Eliminar políticas permisivas actuales
DROP POLICY IF EXISTS "Allow public insert access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public read access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public update access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public delete access to customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customers;

-- SELECT: Staff ve todos + Clientes ven solo su perfil
CREATE POLICY "Staff can view all customers"
ON public.customers FOR SELECT
USING (
  public.get_current_staff_user_id() IS NOT NULL
  OR auth.uid() = auth_user_id
);

-- INSERT: Cajero y Admin pueden crear clientes
CREATE POLICY "Cajero and Admin can create customers"
ON public.customers FOR INSERT
WITH CHECK (
  public.has_role(public.get_current_staff_user_id(), 'Cajero')
  OR public.is_staff_admin()
);

-- UPDATE: Staff puede actualizar + Clientes su propio perfil
CREATE POLICY "Staff can update customers"
ON public.customers FOR UPDATE
USING (
  public.get_current_staff_user_id() IS NOT NULL
  OR auth.uid() = auth_user_id
)
WITH CHECK (
  public.get_current_staff_user_id() IS NOT NULL
  OR auth.uid() = auth_user_id
);

-- DELETE: Solo Admin puede eliminar clientes
CREATE POLICY "Only admins can delete customers"
ON public.customers FOR DELETE
USING (public.is_staff_admin());

-- ============================================
-- RESULTADO ESPERADO:
-- ✅ Admin puede ajustar runas manualmente
-- ✅ Cajero puede crear clientes y órdenes
-- ✅ Staff activo puede crear acumulación/canje de runas
-- ❌ Cocina NO puede ajustar runas ni crear órdenes
-- ✅ Cliente portal ve solo sus datos
-- ✅ Staff sin contexto no puede operar
-- ============================================