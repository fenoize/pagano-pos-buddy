-- Fase 3: Sistema de niveles - Tabla de definiciones

CREATE TABLE IF NOT EXISTS public.customer_level_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_code TEXT NOT NULL UNIQUE,
  level_name TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER, -- NULL para nivel máximo
  icon TEXT DEFAULT 'Star',
  color TEXT DEFAULT 'text-primary',
  description TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar niveles por defecto
INSERT INTO public.customer_level_definitions (level_code, level_name, level_order, min_points, max_points, icon, color, description, benefits) VALUES
  ('iniciado', 'Iniciado', 1, 0, 199, 'Flame', 'text-gray-500', 'Bienvenido a Paganos', '["Acumular runas en compras"]'::jsonb),
  ('devoto', 'Devoto', 2, 200, 599, 'Award', 'text-blue-500', 'Cliente frecuente', '["5% descuento en productos seleccionados", "Prioridad en eventos"]'::jsonb),
  ('fanatico', 'Fanático', 3, 600, NULL, 'Crown', 'text-amber-500', 'Máximo nivel alcanzado', '["10% descuento permanente", "Acceso a productos exclusivos", "Invitaciones VIP"]'::jsonb)
ON CONFLICT (level_code) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_level_definitions_order ON customer_level_definitions(level_order);
CREATE INDEX IF NOT EXISTS idx_level_definitions_active ON customer_level_definitions(is_active);

-- Actualizar vista customer_levels para usar la nueva tabla
CREATE OR REPLACE VIEW public.customer_levels AS
SELECT 
  c.id AS customer_id,
  c.cantidad_runas,
  cld.level_code,
  cld.level_name,
  cld.min_points AS min_points,
  next_level.min_points AS next_level_points,
  next_level.level_name AS next_level_name,
  cld.icon,
  cld.color,
  cld.benefits
FROM public.customers c
CROSS JOIN LATERAL (
  -- Obtener nivel actual del cliente
  SELECT * FROM public.customer_level_definitions
  WHERE c.cantidad_runas >= min_points 
    AND (max_points IS NULL OR c.cantidad_runas <= max_points)
    AND is_active = true
  ORDER BY level_order DESC
  LIMIT 1
) cld
LEFT JOIN LATERAL (
  -- Obtener siguiente nivel
  SELECT * FROM public.customer_level_definitions
  WHERE min_points > c.cantidad_runas
    AND is_active = true
  ORDER BY level_order ASC
  LIMIT 1
) next_level ON true;

-- Permitir acceso público a la tabla de niveles (solo lectura)
ALTER TABLE public.customer_level_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active level definitions"
  ON public.customer_level_definitions
  FOR SELECT
  USING (is_active = true);