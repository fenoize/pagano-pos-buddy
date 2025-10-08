-- Eliminar políticas que dependen de is_admin_from_jwt
DROP POLICY IF EXISTS "Administradores pueden insertar configuración PWA" ON pwa_config;
DROP POLICY IF EXISTS "Administradores pueden actualizar configuración PWA" ON pwa_config;
DROP POLICY IF EXISTS "Administradores pueden ver configuración PWA" ON pwa_config;

-- Ahora sí eliminar la función
DROP FUNCTION IF EXISTS public.is_admin_from_jwt();

-- Crear nueva función que usa el contexto de staff
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_staff_id uuid;
  user_record users%ROWTYPE;
BEGIN
  -- Obtener el ID del staff actual desde el contexto de sesión
  current_staff_id := public.get_current_staff_user_id();
  
  -- Si no hay staff_id en el contexto, retornar false
  IF current_staff_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar si el usuario existe, está activo y es Administrador
  SELECT * INTO user_record FROM users WHERE id = current_staff_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN (user_record.role = 'Administrador' AND user_record.active = true);
END;
$$;

-- Crear nuevas políticas usando is_staff_admin
CREATE POLICY "Administradores pueden insertar configuración PWA"
ON pwa_config
FOR INSERT
WITH CHECK (public.is_staff_admin());

CREATE POLICY "Administradores pueden actualizar configuración PWA"
ON pwa_config
FOR UPDATE
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

CREATE POLICY "Administradores pueden ver configuración PWA"
ON pwa_config
FOR SELECT
USING (public.is_staff_admin());