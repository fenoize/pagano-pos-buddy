-- Políticas RLS para el bucket pwa-icons

-- Permitir a administradores ver archivos en pwa-icons
CREATE POLICY "Admins can view pwa-icons"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pwa-icons' 
  AND public.is_active_admin()
);

-- Permitir a administradores subir archivos a pwa-icons
CREATE POLICY "Admins can upload to pwa-icons"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pwa-icons' 
  AND public.is_active_admin()
);

-- Permitir a administradores actualizar archivos en pwa-icons
CREATE POLICY "Admins can update pwa-icons"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'pwa-icons' 
  AND public.is_active_admin()
);

-- Permitir a administradores eliminar archivos en pwa-icons
CREATE POLICY "Admins can delete from pwa-icons"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'pwa-icons' 
  AND public.is_active_admin()
);

-- Permitir acceso público de lectura a las imágenes
CREATE POLICY "Public can view pwa-icons"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pwa-icons');