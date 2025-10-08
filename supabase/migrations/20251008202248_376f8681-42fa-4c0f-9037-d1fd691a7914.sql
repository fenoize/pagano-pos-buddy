-- Eliminar políticas RLS duplicadas antiguas del bucket pwa-icons
-- Estas políticas usan auth.uid() y tienen nombres con tilde en "íconos" y "de"

DROP POLICY IF EXISTS "Solo administradores pueden subir íconos de PWA" ON storage.objects;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar íconos de PWA" ON storage.objects;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar íconos de PWA" ON storage.objects;

-- Las políticas correctas permanecerán activas:
-- "Solo administradores pueden subir iconos PWA" (INSERT)
-- "Solo administradores pueden actualizar iconos PWA" (UPDATE)
-- "Solo administradores pueden eliminar iconos PWA" (DELETE)
-- "Los íconos de PWA son públicamente accesibles" (SELECT)