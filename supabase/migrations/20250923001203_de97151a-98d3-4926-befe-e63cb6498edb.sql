-- Script de compatibilidad hacia atrás

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
-- usando un enfoque más simple para extraer precios
WITH default_variants AS (
  SELECT cv.id as category_variant_id, cv.category_id
  FROM public.category_variants cv
  WHERE cv.name = 'Default'
),
product_categories AS (
  SELECT DISTINCT p.id as product_id, pc.category_id, p.prices
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
  -- Usar el primer valor numérico encontrado en el JSON o 0
  COALESCE(
    (SELECT value::text::integer 
     FROM json_each_text(pc.prices::json) 
     WHERE value ~ '^[0-9]+$' 
     LIMIT 1), 
    0
  ) as price,
  true as is_default,
  true as active
FROM product_categories pc
JOIN default_variants dv ON pc.category_id = dv.category_id
ON CONFLICT (product_id, category_variant_id) DO NOTHING;