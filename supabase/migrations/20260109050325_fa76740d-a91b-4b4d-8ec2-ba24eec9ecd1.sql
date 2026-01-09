-- Agregar nuevos campos de configuración a tv_screen_configs
ALTER TABLE public.tv_screen_configs
ADD COLUMN IF NOT EXISTS columns integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light',
ADD COLUMN IF NOT EXISTS hide_header_fullscreen boolean DEFAULT false;

-- Agregar comentarios
COMMENT ON COLUMN public.tv_screen_configs.columns IS 'Cantidad de columnas para tarjetas (2-5)';
COMMENT ON COLUMN public.tv_screen_configs.font_size IS 'Tamaño de fuente: small, medium, large';
COMMENT ON COLUMN public.tv_screen_configs.theme IS 'Tema: light, dark';
COMMENT ON COLUMN public.tv_screen_configs.hide_header_fullscreen IS 'Ocultar header en pantalla completa';