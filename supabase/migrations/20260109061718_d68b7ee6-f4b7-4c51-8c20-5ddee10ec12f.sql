-- Tabla de relación entre configuración de TV y contenido a mostrar
CREATE TABLE public.tv_screen_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tv_screen_config_id UUID NOT NULL REFERENCES public.tv_screen_configs(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.marketing_app_promotions(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tv_screen_config_id, promotion_id)
);

-- Agregar campo para pantalla de espera (cuando no hay pedidos)
ALTER TABLE public.tv_screen_configs
  ADD COLUMN idle_screen_config_id UUID REFERENCES public.tv_screen_configs(id) ON DELETE SET NULL;

-- Comentarios
COMMENT ON TABLE public.tv_screen_content IS 'Relación entre pantallas TV y contenido promocional a mostrar';
COMMENT ON COLUMN public.tv_screen_configs.idle_screen_config_id IS 'Configuración de pantalla a usar cuando no hay pedidos (modo espera)';

-- Habilitar RLS
ALTER TABLE public.tv_screen_content ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Lectura pública
CREATE POLICY "tv_screen_content_select" ON public.tv_screen_content
  FOR SELECT USING (true);

-- Políticas RLS - Staff puede gestionar
CREATE POLICY "tv_screen_content_insert" ON public.tv_screen_content
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = current_setting('app.current_user_id', true)::uuid)
  );

CREATE POLICY "tv_screen_content_update" ON public.tv_screen_content
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = current_setting('app.current_user_id', true)::uuid)
  );

CREATE POLICY "tv_screen_content_delete" ON public.tv_screen_content
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = current_setting('app.current_user_id', true)::uuid)
  );