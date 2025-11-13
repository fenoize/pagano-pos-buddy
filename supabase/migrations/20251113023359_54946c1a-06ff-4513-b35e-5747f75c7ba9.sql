-- Cambiar portal_icon a portal_icon_url para almacenar URL de imagen
ALTER TABLE pwa_config 
RENAME COLUMN portal_icon TO portal_icon_url;

-- Actualizar comentario
COMMENT ON COLUMN pwa_config.portal_icon_url IS 'URL de la imagen/logo para el portal de login del cliente';

-- Limpiar valores por defecto antiguos (ya no son nombres de íconos sino URLs)
UPDATE pwa_config 
SET portal_icon_url = NULL 
WHERE app_type = 'customer' AND portal_icon_url = 'Flame';