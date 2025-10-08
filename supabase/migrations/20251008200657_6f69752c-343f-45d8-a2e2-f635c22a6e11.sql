-- Migración: Corregir políticas RLS para PWA Config
-- Problema: Las políticas usan auth.uid() en lugar de get_current_staff_user_id()

-- ==========================================
-- PARTE 1: Corregir políticas de pwa_config
-- ==========================================

-- Eliminar políticas antiguas que usan auth.uid()
DROP POLICY IF EXISTS "Solo administradores pueden ver configuración PWA" ON public.pwa_config;
DROP POLICY IF EXISTS "Solo administradores pueden insertar configuración PWA" ON public.pwa_config;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar configuración PWA" ON public.pwa_config;

-- Crear nuevas políticas usando get_current_staff_user_id()
CREATE POLICY "Solo administradores pueden ver configuración PWA"
ON public.pwa_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = public.get_current_staff_user_id()
    AND users.role = 'Administrador'::app_role
    AND users.active = true
  )
);

CREATE POLICY "Solo administradores pueden insertar configuración PWA"
ON public.pwa_config FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = public.get_current_staff_user_id()
    AND users.role = 'Administrador'::app_role
    AND users.active = true
  )
);

CREATE POLICY "Solo administradores pueden actualizar configuración PWA"
ON public.pwa_config FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = public.get_current_staff_user_id()
    AND users.role = 'Administrador'::app_role
    AND users.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = public.get_current_staff_user_id()
    AND users.role = 'Administrador'::app_role
    AND users.active = true
  )
);

-- ==========================================
-- PARTE 2: Corregir políticas del bucket pwa-icons
-- ==========================================

-- Eliminar políticas antiguas de storage.objects para el bucket pwa-icons
DROP POLICY IF EXISTS "Admins can upload PWA icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update PWA icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete PWA icons" ON storage.objects;

-- Crear nuevas políticas para el bucket pwa-icons usando get_current_staff_user_id()
CREATE POLICY "Solo administradores pueden subir iconos PWA"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pwa-icons'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = public.get_current_staff_user_id()
    AND users.role = 'Administrador'::app_role
    AND users.active = true
  )
);

CREATE POLICY "Solo administradores pueden actualizar iconos PWA"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pwa-icons'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = public.get_current_staff_user_id()
    AND users.role = 'Administrador'::app_role
    AND users.active = true
  )
);

CREATE POLICY "Solo administradores pueden eliminar iconos PWA"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pwa-icons'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = public.get_current_staff_user_id()
    AND users.role = 'Administrador'::app_role
    AND users.active = true
  )
);

-- La política de SELECT pública ya existe y no la tocamos
-- para que los íconos sean accesibles públicamente