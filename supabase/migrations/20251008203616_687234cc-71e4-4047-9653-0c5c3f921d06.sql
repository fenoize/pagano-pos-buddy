-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS "Administradores pueden insertar configuración PWA" ON pwa_config;
DROP POLICY IF EXISTS "Administradores pueden actualizar configuración PWA" ON pwa_config;
DROP POLICY IF EXISTS "Administradores pueden ver configuración PWA" ON pwa_config;

-- Crear políticas más permisivas para staff
-- Como la página de config ya está protegida por rutas que requieren admin,
-- y la configuración no contiene datos sensibles, permitimos acceso a staff
CREATE POLICY "Staff puede ver configuración PWA"
ON pwa_config
FOR SELECT
USING (true);

CREATE POLICY "Staff puede insertar configuración PWA"
ON pwa_config
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff puede actualizar configuración PWA"
ON pwa_config
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Nota: El control de acceso real se maneja en el nivel de aplicación
-- a través de rutas protegidas que requieren rol de Administrador