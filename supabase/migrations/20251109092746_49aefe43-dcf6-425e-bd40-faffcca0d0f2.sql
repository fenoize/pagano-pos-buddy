-- Eliminar políticas RLS anteriores que no funcionan con Storage
DROP POLICY IF EXISTS "Admins can view pwa-icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload to pwa-icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update pwa-icons" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from pwa-icons" ON storage.objects;
DROP POLICY IF EXISTS "Public can view pwa-icons" ON storage.objects;

-- Políticas RLS mejoradas para pwa-icons
-- Estas políticas verifican directamente en user_roles sin depender del contexto

-- Permitir lectura pública para todos
CREATE POLICY "Anyone can view pwa-icons"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pwa-icons');

-- Permitir a administradores subir archivos
CREATE POLICY "Admins can insert to pwa-icons"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pwa-icons' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id::text = NULLIF(current_setting('app.user_id', true), '')
      AND ur.role = 'Administrador'
      AND u.active = true
  )
);

-- Permitir a administradores actualizar archivos
CREATE POLICY "Admins can update pwa-icons"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'pwa-icons' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id::text = NULLIF(current_setting('app.user_id', true), '')
      AND ur.role = 'Administrador'
      AND u.active = true
  )
);

-- Permitir a administradores eliminar archivos
CREATE POLICY "Admins can delete pwa-icons"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'pwa-icons' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    INNER JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id::text = NULLIF(current_setting('app.user_id', true), '')
      AND ur.role = 'Administrador'
      AND u.active = true
  )
);