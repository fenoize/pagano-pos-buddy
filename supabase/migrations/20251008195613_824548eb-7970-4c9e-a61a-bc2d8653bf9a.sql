-- Crear tabla para configuración de PWA
CREATE TABLE IF NOT EXISTS public.pwa_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'Paganos Burger',
  app_short_name TEXT NOT NULL DEFAULT 'Paganos',
  app_description TEXT NOT NULL DEFAULT 'Portal de clientes y sistema POS de Paganos Burger',
  theme_color TEXT NOT NULL DEFAULT '#cc0000',
  background_color TEXT NOT NULL DEFAULT '#0a0a0a',
  icon_192_url TEXT,
  icon_512_url TEXT,
  icon_maskable_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pwa_config ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo administradores pueden ver y modificar
CREATE POLICY "Solo administradores pueden ver configuración PWA"
  ON public.pwa_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Administrador'
    )
  );

CREATE POLICY "Solo administradores pueden actualizar configuración PWA"
  ON public.pwa_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Administrador'
    )
  );

CREATE POLICY "Solo administradores pueden insertar configuración PWA"
  ON public.pwa_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Administrador'
    )
  );

-- Insertar configuración por defecto
INSERT INTO public.pwa_config (app_name, app_short_name, app_description, theme_color, background_color)
VALUES ('Paganos Burger', 'Paganos', 'Portal de clientes y sistema POS de Paganos Burger', '#cc0000', '#0a0a0a')
ON CONFLICT DO NOTHING;

-- Crear bucket para íconos de PWA si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('pwa-icons', 'pwa-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para íconos de PWA
CREATE POLICY "Los íconos de PWA son públicamente accesibles"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pwa-icons');

CREATE POLICY "Solo administradores pueden subir íconos de PWA"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pwa-icons' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Administrador'
    )
  );

CREATE POLICY "Solo administradores pueden actualizar íconos de PWA"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pwa-icons' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Administrador'
    )
  );

CREATE POLICY "Solo administradores pueden eliminar íconos de PWA"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pwa-icons' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'Administrador'
    )
  );