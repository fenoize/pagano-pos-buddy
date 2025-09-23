-- Script de compatibilidad mejorado para crear las variantes reales basadas en los datos existentes

-- Crear variantes específicas para Hamburguesas (Smash&Fries)
WITH smash_category AS (
  SELECT id FROM categories WHERE name = 'Smash&Fries' AND active = true LIMIT 1
)
INSERT INTO public.category_variants (category_id, name, display_order, active)
SELECT smash_category.id, variant_name, display_order, true
FROM smash_category
CROSS JOIN (VALUES 
  ('Simple', 1),
  ('Doble', 2), 
  ('Triple', 3)
) AS variants(variant_name, display_order)
ON CONFLICT (category_id, name) DO NOTHING;

-- Crear variantes para otras categorías (Default por ahora)
INSERT INTO public.category_variants (category_id, name, display_order, active)
SELECT c.id, 'Default', 0, true
FROM categories c
WHERE c.active = true 
AND c.name != 'Smash&Fries'
ON CONFLICT (category_id, name) DO NOTHING;

-- Poblar product_variant_options con los precios existentes para Hamburguesas
WITH smash_products AS (
  SELECT p.id as product_id, p.prices, cv.id as category_variant_id, cv.name as variant_name
  FROM products p
  JOIN product_categories pc ON p.id = pc.product_id
  JOIN categories c ON pc.category_id = c.id
  JOIN category_variants cv ON c.id = cv.category_id
  WHERE c.name = 'Smash&Fries' AND p.active = true AND cv.name IN ('Simple', 'Doble', 'Triple')
)
INSERT INTO public.product_variant_options (
  product_id, 
  category_variant_id, 
  price, 
  is_default, 
  active
)
SELECT 
  sp.product_id,
  sp.category_variant_id,
  CASE 
    WHEN sp.variant_name = 'Simple' THEN 
      COALESCE((sp.prices->'combo'->>'simple')::integer, (sp.prices->'only'->>'simple')::integer, 0)
    WHEN sp.variant_name = 'Doble' THEN 
      COALESCE((sp.prices->'combo'->>'doble')::integer, (sp.prices->'only'->>'doble')::integer, 0)
    WHEN sp.variant_name = 'Triple' THEN 
      COALESCE((sp.prices->'combo'->>'triple')::integer, (sp.prices->'only'->>'triple')::integer, 0)
    ELSE 0
  END as price,
  CASE WHEN sp.variant_name = 'Simple' THEN true ELSE false END as is_default,
  true as active
FROM smash_products sp
WHERE CASE 
  WHEN sp.variant_name = 'Simple' THEN 
    COALESCE((sp.prices->'combo'->>'simple')::integer, (sp.prices->'only'->>'simple')::integer, 0) > 0
  WHEN sp.variant_name = 'Doble' THEN 
    COALESCE((sp.prices->'combo'->>'doble')::integer, (sp.prices->'only'->>'doble')::integer, 0) > 0
  WHEN sp.variant_name = 'Triple' THEN 
    COALESCE((sp.prices->'combo'->>'triple')::integer, (sp.prices->'only'->>'triple')::integer, 0) > 0
  ELSE false
END
ON CONFLICT (product_id, category_variant_id) DO NOTHING;

-- Poblar product_variant_options para otras categorías con variante Default
WITH other_products AS (
  SELECT p.id as product_id, p.prices, cv.id as category_variant_id
  FROM products p
  JOIN product_categories pc ON p.id = pc.product_id
  JOIN categories c ON pc.category_id = c.id
  JOIN category_variants cv ON c.id = cv.category_id
  WHERE c.name != 'Smash&Fries' AND p.active = true AND cv.name = 'Default'
)
INSERT INTO public.product_variant_options (
  product_id, 
  category_variant_id, 
  price, 
  is_default, 
  active
)
SELECT 
  op.product_id,
  op.category_variant_id,
  -- Obtener el primer precio válido encontrado
  COALESCE(
    (op.prices->'combo'->>'simple')::integer,
    (op.prices->'only'->>'simple')::integer,
    (SELECT (value->>'simple')::integer FROM json_each(op.prices::json) WHERE value::json ? 'simple' AND (value->>'simple')::integer > 0 LIMIT 1),
    0
  ) as price,
  true as is_default,
  true as active
FROM other_products op
ON CONFLICT (product_id, category_variant_id) DO NOTHING;