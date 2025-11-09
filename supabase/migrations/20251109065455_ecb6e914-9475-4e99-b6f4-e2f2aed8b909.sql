-- Agregar campos de splash screen a pwa_config
ALTER TABLE pwa_config
ADD COLUMN IF NOT EXISTS splash_logo_url TEXT,
ADD COLUMN IF NOT EXISTS splash_text TEXT,
ADD COLUMN IF NOT EXISTS splash_background_color TEXT DEFAULT '#1c1e21';

-- Actualizar registros existentes con valores por defecto
UPDATE pwa_config 
SET splash_text = 'Cargando tu experiencia pagana…'
WHERE app_type = 'customer' AND splash_text IS NULL;

UPDATE pwa_config 
SET splash_text = 'Cargando sistema POS…'
WHERE app_type = 'pos' AND splash_text IS NULL;

COMMENT ON COLUMN pwa_config.splash_logo_url IS 'URL del logo para splash screen (puede ser diferente al ícono de la app)';
COMMENT ON COLUMN pwa_config.splash_text IS 'Texto que se muestra en la splash screen durante la carga';
COMMENT ON COLUMN pwa_config.splash_background_color IS 'Color de fondo de la splash screen en formato hex';