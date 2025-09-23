-- Crear tablas para sistema de variantes por categoría y combos

-- 1. Variantes por categoría (ej: Hamburguesas → Simple, Doble, Triple)
CREATE TABLE public.category_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- 2. Opciones de variantes por producto (precio, SKU, stock específico)
CREATE TABLE public.product_variant_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_variant_id UUID NOT NULL REFERENCES public.category_variants(id) ON DELETE CASCADE,
  price INTEGER NOT NULL DEFAULT 0,
  sku TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, category_variant_id)
);

-- 3. Productos como combos
CREATE TABLE public.combo_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  pricing_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_mode IN ('fixed', 'dynamic')),
  base_price INTEGER NOT NULL DEFAULT 0,
  combo_discount INTEGER NOT NULL DEFAULT 0,
  included_variants BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- 4. Items/slots de un combo
CREATE TABLE public.combo_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_product_id UUID NOT NULL REFERENCES public.combo_products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  default_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  default_variant_id UUID REFERENCES public.category_variants(id) ON DELETE SET NULL,
  allow_customization BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Añadir campos a orders para variantes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS combo_data JSONB;

-- 6. Crear índices para performance
CREATE INDEX idx_category_variants_category_id ON public.category_variants(category_id);
CREATE INDEX idx_category_variants_active ON public.category_variants(active);
CREATE INDEX idx_product_variant_options_product_id ON public.product_variant_options(product_id);
CREATE INDEX idx_product_variant_options_category_variant_id ON public.product_variant_options(category_variant_id);
CREATE INDEX idx_product_variant_options_active ON public.product_variant_options(active);
CREATE INDEX idx_product_variant_options_is_default ON public.product_variant_options(is_default);
CREATE INDEX idx_combo_products_product_id ON public.combo_products(product_id);
CREATE INDEX idx_combo_items_combo_product_id ON public.combo_items(combo_product_id);
CREATE INDEX idx_combo_items_category_id ON public.combo_items(category_id);

-- 7. Triggers para updated_at
CREATE TRIGGER update_category_variants_updated_at
  BEFORE UPDATE ON public.category_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variant_options_updated_at
  BEFORE UPDATE ON public.product_variant_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_combo_products_updated_at
  BEFORE UPDATE ON public.combo_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_combo_items_updated_at
  BEFORE UPDATE ON public.combo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. RLS Policies
ALTER TABLE public.category_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

-- Políticas para acceso público (POS operations)
CREATE POLICY "Allow public access for category variants" ON public.category_variants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for product variant options" ON public.product_variant_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for combo products" ON public.combo_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access for combo items" ON public.combo_items FOR ALL USING (true) WITH CHECK (true);

-- 9. Script de compatibilidad hacia atrás
-- Crear variante "Default" para todas las categorías existentes
INSERT INTO public.category_variants (category_id, name, display_order, active)
SELECT 
  id as category_id,
  'Default' as name,
  0 as display_order,
  true as active
FROM public.categories
WHERE active = true
ON CONFLICT (category_id, name) DO NOTHING;

-- Crear opciones de variante por defecto para todos los productos existentes
WITH default_variants AS (
  SELECT cv.id as category_variant_id, cv.category_id
  FROM public.category_variants cv
  WHERE cv.name = 'Default'
),
product_categories AS (
  SELECT DISTINCT p.id as product_id, pc.category_id
  FROM public.products p
  JOIN public.product_categories pc ON p.id = pc.product_id
  WHERE p.active = true
)
INSERT INTO public.product_variant_options (
  product_id, 
  category_variant_id, 
  price, 
  is_default, 
  active
)
SELECT 
  pc.product_id,
  dv.category_variant_id,
  -- Extraer precio del JSON de manera segura
  CASE 
    WHEN p.prices ? 'combo' THEN (p.prices->>'combo')::integer
    WHEN p.prices ? 'solo' THEN (p.prices->>'solo')::integer
    WHEN p.prices ? 'simple' THEN (p.prices->>'simple')::integer
    ELSE 0
  END as price,
  true as is_default,
  true as active
FROM product_categories pc
JOIN default_variants dv ON pc.category_id = dv.category_id
JOIN public.products p ON pc.product_id = p.id
ON CONFLICT (product_id, category_variant_id) DO NOTHING;