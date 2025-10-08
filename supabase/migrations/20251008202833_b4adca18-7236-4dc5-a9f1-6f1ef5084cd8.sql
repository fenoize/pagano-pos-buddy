-- Agregar columna app_type a pwa_config para diferenciar customer/pos
ALTER TABLE pwa_config 
ADD COLUMN app_type TEXT NOT NULL DEFAULT 'customer' 
CHECK (app_type IN ('customer', 'pos'));

-- Crear índice único para evitar duplicados por app_type
CREATE UNIQUE INDEX idx_pwa_config_app_type ON pwa_config(app_type);

-- Insertar configuración por defecto para POS
INSERT INTO pwa_config (
  app_type,
  app_name,
  app_short_name,
  app_description,
  theme_color,
  background_color,
  icon_192_url
) VALUES (
  'pos',
  'Paganos — Punto de Venta',
  'Paganos POS',
  'Sistema de punto de venta para Paganos Burger (solo navegador)',
  '#cc0000',
  '#0a0a0a',
  '/icons/paganos-192.png'
) ON CONFLICT DO NOTHING;

-- Actualizar configuración existente como 'customer' si no tiene app_type
UPDATE pwa_config SET app_type = 'customer' WHERE app_type IS NULL;