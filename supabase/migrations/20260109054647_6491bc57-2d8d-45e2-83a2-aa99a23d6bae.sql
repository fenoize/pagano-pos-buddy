-- Agregar columna para estados visibles en la pantalla TV
-- Por defecto muestra: En preparación, Listo, Entregado
ALTER TABLE public.tv_screen_configs 
ADD COLUMN IF NOT EXISTS visible_statuses text[] DEFAULT ARRAY['En preparación', 'Listo', 'Entregado']::text[];

-- Agregar comentario explicativo
COMMENT ON COLUMN public.tv_screen_configs.visible_statuses IS 'Estados de pedidos que se muestran en la pantalla TV';