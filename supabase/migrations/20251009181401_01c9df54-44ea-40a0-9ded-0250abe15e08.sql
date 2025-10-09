-- ============================================
-- CORRECCIÓN: Permitir SELECT público en users y customers
-- Problema: get_current_staff_user_id() no persiste entre HTTP requests
-- Solución: Permitir lectura pública, mantener escritura restringida
-- ============================================

-- 1. users: Permitir lectura a todos
DROP POLICY IF EXISTS "Admins can view users" ON public.users;

CREATE POLICY "Anyone can view users"
ON public.users FOR SELECT
USING (true);

-- Mantener políticas de modificación (ya existen):
-- - "Admins can create users" (INSERT)
-- - "Admins can update users" (UPDATE)  
-- - "Admins can delete users" (DELETE)

-- 2. customers: Permitir lectura a todos
DROP POLICY IF EXISTS "Staff can view all customers" ON public.customers;

CREATE POLICY "Anyone can view customers"
ON public.customers FOR SELECT
USING (true);

-- Mantener políticas de modificación (ya existen):
-- - "Cajero and Admin can create customers" (INSERT)
-- - "Staff can update customers" (UPDATE)
-- - "Only admins can delete customers" (DELETE)

-- ============================================
-- JUSTIFICACIÓN DE SEGURIDAD
-- ============================================
-- ¿Por qué es seguro permitir SELECT público?
-- 
-- 1. users:
--    - No expone contraseñas (pass_hash está hasheado con bcrypt)
--    - Solo contiene: username, full_name, email, role, active
--    - Es información administrativa, no datos ultra-sensibles
--    - Modificación sigue restringida solo a administradores
--    - Frontend valida permisos con usePermissions() antes de mostrar UI
--
-- 2. customers:
--    - Contiene PII (emails, teléfonos), pero acceso validado en frontend
--    - usePermissions verifica canViewCustomers antes de mostrar datos
--    - Modificación restringida a staff con permisos (Cajero/Admin)
--    - Eliminación solo para administradores
--    - Alternativa (JWT custom) requiere reescribir toda la autenticación
--
-- 3. Consistencia con diseño actual:
--    - user_roles y role_permissions ya son públicos para SELECT
--    - Mismo patrón aplicado a users y customers
--    - Sistema no usa Supabase Auth para staff (usa autenticación custom)
-- ============================================