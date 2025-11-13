-- Agregar campos para configurar el portal de login de clientes
ALTER TABLE pwa_config 
ADD COLUMN IF NOT EXISTS portal_icon TEXT DEFAULT 'Flame',
ADD COLUMN IF NOT EXISTS portal_subtitle TEXT DEFAULT 'Gestiona tus pedidos y runas';

-- Comentarios para documentación
COMMENT ON COLUMN pwa_config.portal_icon IS 'Nombre del ícono de Lucide React para el portal de login (ej: Flame, Sparkles, Crown, etc)';
COMMENT ON COLUMN pwa_config.portal_subtitle IS 'Texto descriptivo que aparece bajo el título del portal';

-- Actualizar configuración existente de customer con valores por defecto
UPDATE pwa_config 
SET 
  portal_icon = 'Flame',
  portal_subtitle = 'Gestiona tus pedidos y runas'
WHERE app_type = 'customer' AND portal_icon IS NULL;