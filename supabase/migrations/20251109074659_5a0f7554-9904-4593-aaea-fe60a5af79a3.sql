-- Crear tabla de promociones de marketing
CREATE TABLE IF NOT EXISTS public.marketing_app_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cta_label TEXT,
  cta_type TEXT NOT NULL DEFAULT 'open_menu',
  cta_url TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_cta_type CHECK (
    cta_type IN ('open_menu', 'open_cart', 'open_orders', 'open_benefits', 'open_custom_url', 'none')
  ),
  CONSTRAINT valid_priority CHECK (priority > 0)
);

-- Habilitar RLS
ALTER TABLE public.marketing_app_promotions ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para promos activas y vigentes
CREATE POLICY "Anyone can view active marketing promotions"
ON public.marketing_app_promotions
FOR SELECT
USING (
  is_active = true
  AND (start_date IS NULL OR start_date <= CURRENT_DATE)
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
);

-- Política de gestión para staff
CREATE POLICY "Staff can manage marketing promotions"
ON public.marketing_app_promotions
FOR ALL
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Índices para optimizar consultas
CREATE INDEX idx_marketing_promotions_active ON public.marketing_app_promotions(is_active, priority, created_at);
CREATE INDEX idx_marketing_promotions_dates ON public.marketing_app_promotions(start_date, end_date);

-- Comentarios para documentación
COMMENT ON TABLE public.marketing_app_promotions IS 'Promociones que se muestran en la app de cliente';
COMMENT ON COLUMN public.marketing_app_promotions.cta_type IS 'Tipo de acción: open_menu, open_cart, open_orders, open_benefits, open_custom_url, none';
COMMENT ON COLUMN public.marketing_app_promotions.priority IS 'Menor número = mayor prioridad. La promo con menor prioridad activa se muestra en Home';