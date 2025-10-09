-- ============================================
-- CORRECCIÓN: Permitir lectura de roles y permisos
-- Problema: get_current_staff_user_id() no persiste entre peticiones HTTP
-- Solución: Permitir SELECT público en user_roles y role_permissions
-- ============================================

-- 1. user_roles: Permitir lectura a todos (sin autenticación)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can read all user roles" ON public.user_roles;

CREATE POLICY "Anyone can view user roles"
ON public.user_roles FOR SELECT
USING (true);

-- Mantener políticas de modificación solo para admins
-- (ya existen desde migraciones anteriores)

-- 2. role_permissions: Permitir lectura a todos
DROP POLICY IF EXISTS "Staff can read permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Anyone can read permissions" ON public.role_permissions;

CREATE POLICY "Anyone can read permissions"
ON public.role_permissions FOR SELECT
USING (true);

-- Mantener política: "Admins can manage permissions" (ya existe)

-- ============================================
-- JUSTIFICACIÓN DE SEGURIDAD
-- ============================================
-- ¿Por qué es seguro permitir SELECT público?
-- 
-- 1. user_roles: Solo contiene user_id + role (no hay datos sensibles)
--    - No expone contraseñas, emails, teléfonos, etc.
--    - Solo dice qué rol tiene cada usuario (Admin, Cajero, etc.)
--    - Modificación sigue restringida a admins
--
-- 2. role_permissions: Solo contiene role + permission (configuración)
--    - Define qué permisos tiene cada rol (ej: "Cajero puede crear órdenes")
--    - Es información de configuración del sistema, no datos de usuarios
--    - Modificación sigue restringida a admins
--
-- 3. Alternativa rechazada: usar Supabase Auth para staff
--    - Cliente usa autenticación custom sin Supabase Auth
--    - get_current_staff_user_id() no persiste entre HTTP requests
--
-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Test: Verificar políticas en user_roles
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Test: Verificar políticas en role_permissions  
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'role_permissions'
ORDER BY policyname;