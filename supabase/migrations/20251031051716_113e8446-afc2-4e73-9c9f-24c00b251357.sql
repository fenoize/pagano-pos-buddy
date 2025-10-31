-- =====================================================
-- CORRECCIÓN CRÍTICA: Eliminar políticas RLS públicas
-- Fecha: 2025-01-31
-- Descripción: Reemplazar políticas públicas inseguras por políticas restrictivas
-- =====================================================

-- 1. TABLA: orders
-- Eliminar política peligrosa que permite lectura pública
DROP POLICY IF EXISTS "Public can read orders" ON public.orders;

-- Crear política segura para staff
CREATE POLICY "Staff can read all orders" ON public.orders
  FOR SELECT
  USING (public.is_active_staff());

-- Crear política para que clientes vean sus propias órdenes
CREATE POLICY "Customers can view own orders" ON public.orders
  FOR SELECT
  USING (
    customer_id IS NOT NULL AND 
    customer_id = public.get_current_customer_id()
  );

-- 2. TABLA: users
-- Eliminar política peligrosa que permite lectura pública
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

-- Crear política segura para staff
CREATE POLICY "Staff can view all users" ON public.users
  FOR SELECT
  USING (public.is_active_staff());

-- 3. TABLA: user_roles
-- Eliminar política peligrosa que permite lectura pública
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;

-- Crear política segura para staff
CREATE POLICY "Staff can view all user roles" ON public.user_roles
  FOR SELECT
  USING (public.is_active_staff());

-- 4. TABLA: addresses
-- Eliminar política peligrosa que permite acceso público total
DROP POLICY IF EXISTS "Allow public access for addresses" ON public.addresses;

-- Las políticas específicas para customers ya existen y son seguras:
-- - "Customers can view own addresses"
-- - "Customers can insert own addresses"
-- - "Customers can update own addresses"
-- - "Customers can delete own addresses"

-- Crear política adicional para que staff pueda ver direcciones (para delivery/POS)
CREATE POLICY "Staff can view all addresses" ON public.addresses
  FOR SELECT
  USING (public.is_active_staff());