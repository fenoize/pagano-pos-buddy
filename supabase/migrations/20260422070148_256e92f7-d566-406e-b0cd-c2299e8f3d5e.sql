-- Reset tabla de auditoría
DROP TABLE IF EXISTS public.migration_warnings_variantes CASCADE;
CREATE TABLE public.migration_warnings_variantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_type TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.migration_warnings_variantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read warnings" ON public.migration_warnings_variantes
  FOR SELECT USING (public.has_role(auth.uid(), 'Administrador'::app_role));

-- 1. Schema additivo
ALTER TABLE public.variant_group_options
  ADD COLUMN IF NOT EXISTS price_delta INT NOT NULL DEFAULT 0;

ALTER TABLE public.variant_groups
  ADD COLUMN IF NOT EXISTS min_select INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_select INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT true;

-- 2. Limpiar duplicados de combo_items
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY combo_product_id, category_id, COALESCE(default_product_id::text,''), display_order
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM public.combo_items
),
to_delete AS (SELECT id FROM ranked WHERE rn > 1),
logged AS (
  INSERT INTO public.migration_warnings_variantes (warning_type, detail)
  SELECT 'combo_item_duplicate_deleted', jsonb_build_object('combo_item_id', id)
  FROM to_delete
  RETURNING 1
)
DELETE FROM public.combo_items WHERE id IN (SELECT id FROM to_delete);

-- 3. Política B: deltas = 0
UPDATE public.variant_group_options SET price_delta = 0;

-- 4. Promover fila base donde no exista (precio Carne = MIN de combinadas)
WITH needs_base AS (
  SELECT pvo.product_id, pvo.category_variant_id
  FROM public.product_variant_options pvo
  WHERE pvo.variant_group_option_id IS NOT NULL
  GROUP BY pvo.product_id, pvo.category_variant_id
  HAVING NOT EXISTS (
    SELECT 1 FROM public.product_variant_options p2
    WHERE p2.product_id = pvo.product_id
      AND p2.category_variant_id = pvo.category_variant_id
      AND p2.variant_group_option_id IS NULL
  )
),
base_data AS (
  SELECT pvo.product_id, pvo.category_variant_id,
         MIN(pvo.price) AS base_price,
         BOOL_OR(pvo.is_default) AS is_default,
         BOOL_OR(pvo.is_enabled) AS is_enabled,
         BOOL_OR(pvo.active) AS active
  FROM public.product_variant_options pvo
  JOIN needs_base nb USING (product_id, category_variant_id)
  WHERE pvo.variant_group_option_id IS NOT NULL
  GROUP BY pvo.product_id, pvo.category_variant_id
)
INSERT INTO public.product_variant_options
  (product_id, category_variant_id, price, is_default, is_enabled, active, variant_group_option_id)
SELECT product_id, category_variant_id, base_price,
       COALESCE(is_default,false), COALESCE(is_enabled,true), COALESCE(active,true), NULL
FROM base_data;

-- 5. Igualar precio base al precio Carne
WITH carne_price AS (
  SELECT product_id, category_variant_id, MIN(price) AS p
  FROM public.product_variant_options
  WHERE variant_group_option_id IS NOT NULL
  GROUP BY product_id, category_variant_id
)
UPDATE public.product_variant_options pvo
SET price = cp.p
FROM carne_price cp
WHERE pvo.product_id = cp.product_id
  AND pvo.category_variant_id = cp.category_variant_id
  AND pvo.variant_group_option_id IS NULL
  AND pvo.price <> cp.p;

-- 6. Eliminar duplicados de filas base
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY product_id, category_variant_id
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM public.product_variant_options
  WHERE variant_group_option_id IS NULL
)
DELETE FROM public.product_variant_options
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 7. Loguear y eliminar filas combinadas
INSERT INTO public.migration_warnings_variantes (warning_type, detail)
SELECT 'combined_row_deleted', jsonb_build_object(
  'id', id, 'product_id', product_id,
  'category_variant_id', category_variant_id,
  'variant_group_option_id', variant_group_option_id,
  'price', price
)
FROM public.product_variant_options
WHERE variant_group_option_id IS NOT NULL;

DELETE FROM public.product_variant_options WHERE variant_group_option_id IS NOT NULL;

-- 8. Drop columna ambigua
ALTER TABLE public.product_variant_options DROP COLUMN variant_group_option_id;

-- 9. Constraints finales
ALTER TABLE public.product_variant_options
  DROP CONSTRAINT IF EXISTS product_variant_options_unique_size,
  ADD CONSTRAINT product_variant_options_unique_size UNIQUE (product_id, category_variant_id);

ALTER TABLE public.product_variant_options
  DROP CONSTRAINT IF EXISTS product_variant_options_price_nonneg,
  ADD CONSTRAINT product_variant_options_price_nonneg CHECK (price >= 0);

ALTER TABLE public.variant_group_options
  DROP CONSTRAINT IF EXISTS variant_group_options_delta_nonneg,
  ADD CONSTRAINT variant_group_options_delta_nonneg CHECK (price_delta >= 0);

ALTER TABLE public.combo_items
  DROP CONSTRAINT IF EXISTS combo_items_unique_slot,
  ADD CONSTRAINT combo_items_unique_slot UNIQUE (combo_product_id, category_id, default_product_id, display_order);
