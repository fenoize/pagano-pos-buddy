-- Tabla para configuraciones de pantallas TV
CREATE TABLE public.tv_screen_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'full' CHECK (template IN ('full', 'split_horizontal', 'split_vertical')),
  slider_interval_seconds INTEGER NOT NULL DEFAULT 8,
  show_logo BOOLEAN NOT NULL DEFAULT true,
  show_clock BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para buscar por nombre
CREATE INDEX idx_tv_screen_configs_name ON public.tv_screen_configs(name);

-- RLS
ALTER TABLE public.tv_screen_configs ENABLE ROW LEVEL SECURITY;

-- Políticas: lectura pública (para TVs sin login), escritura solo staff
CREATE POLICY "TV configs are publicly readable" 
ON public.tv_screen_configs FOR SELECT USING (true);

CREATE POLICY "Staff can manage TV configs" 
ON public.tv_screen_configs FOR ALL 
USING (public.is_active_staff());

-- Trigger para updated_at
CREATE TRIGGER update_tv_screen_configs_updated_at
BEFORE UPDATE ON public.tv_screen_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Agregar video_url a marketing_app_promotions
ALTER TABLE public.marketing_app_promotions 
ADD COLUMN IF NOT EXISTS video_url TEXT;