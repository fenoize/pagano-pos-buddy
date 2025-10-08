-- Eliminar políticas RLS actuales restrictivas de pwa_config
DROP POLICY IF EXISTS "Solo administradores pueden actualizar configuración PWA" ON pwa_config;
DROP POLICY IF EXISTS "Solo administradores pueden insertar configuración PWA" ON pwa_config;
DROP POLICY IF EXISTS "Solo administradores pueden ver configuración PWA" ON pwa_config;

-- Crear función helper para verificar admin usando JWT
CREATE OR REPLACE FUNCTION public.is_admin_from_jwt()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_payload jsonb;
  user_id_from_jwt uuid;
  user_record users%ROWTYPE;
BEGIN
  -- Obtener el payload del JWT desde la sesión actual
  jwt_payload := current_setting('request.jwt.claims', true)::jsonb;
  
  -- Si no hay JWT, retornar false
  IF jwt_payload IS NULL THEN
    RETURN false;
  END IF;
  
  -- Extraer user_id del JWT payload (campo 'sub')
  user_id_from_jwt := (jwt_payload->>'sub')::uuid;
  
  -- Si no se puede extraer user_id, retornar false
  IF user_id_from_jwt IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar si el usuario existe, está activo y es Administrador
  SELECT * INTO user_record FROM users WHERE id = user_id_from_jwt;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN (user_record.role = 'Administrador' AND user_record.active = true);
END;
$$;

-- Crear nuevas políticas usando la función helper
CREATE POLICY "Administradores pueden insertar configuración PWA"
ON pwa_config
FOR INSERT
WITH CHECK (public.is_admin_from_jwt());

CREATE POLICY "Administradores pueden actualizar configuración PWA"
ON pwa_config
FOR UPDATE
USING (public.is_admin_from_jwt())
WITH CHECK (public.is_admin_from_jwt());

CREATE POLICY "Administradores pueden ver configuración PWA"
ON pwa_config
FOR SELECT
USING (public.is_admin_from_jwt());

-- Política adicional para permitir lectura pública (opcional)
-- Descomentar si quieres que todos puedan leer la config PWA
-- CREATE POLICY "Cualquiera puede ver configuración PWA"
-- ON pwa_config
-- FOR SELECT
-- USING (true);