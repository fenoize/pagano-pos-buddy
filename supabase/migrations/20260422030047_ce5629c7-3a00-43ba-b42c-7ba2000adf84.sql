
-- 0) Tabla de auditoría
CREATE TABLE IF NOT EXISTS public.migration_warnings_variantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_type text NOT NULL,
  message text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.migration_warnings_variantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_warnings" ON public.migration_warnings_variantes;
CREATE POLICY "admins_read_warnings" ON public.migration_warnings_variantes
  FOR SELECT USING (public.has_role(auth.uid(), 'Administrador'::app_role));

-- 1) Schema additivo
ALTER TABLE public.variant_group_options
  ADD COLUMN IF NOT EXISTS price_delta integer NOT NULL DEFAULT 0;

ALTER TABLE public.variant_groups
  ADD COLUMN IF NOT EXISTS min_select integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_select integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true;

-- 2) Limpieza de duplicados en combo_items (loguear antes de borrar)
WITH dups AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY combo_product_id, category_id, COALESCE(default_product_id::text,''), display_order
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM public.combo_items
)
INSERT INTO public.migration_warnings_variantes (warning_type, message, payload)
SELECT 'combo_item_duplicate', 'Eliminado combo_item duplicado', to_jsonb(ci.*)
FROM public.combo_items ci
JOIN dups ON dups.id=ci.id
WHERE dups.rn > 1;

WITH dups AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY combo_product_id, category_id, COALESCE(default_product_id::text,''), display_order
    ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM public.combo_items
)
DELETE FROM public.combo_items WHERE id IN (SELECT id FROM dups WHERE rn > 1);

-- 3) Backfill: detectar deltas inconsistentes y loguear
WITH base AS (
  SELECT product_id, category_variant_id, price AS base_price
  FROM public.product_variant_options WHERE variant_group_option_id IS NULL
),
con_grupo AS (
  SELECT pvo.product_id, pvo.category_variant_id, pvo.variant_group_option_id, pvo.price
  FROM public.product_variant_options pvo
  WHERE pvo.variant_group_option_id IS NOT NULL
),
deltas AS (
  SELECT cg.product_id, cg.variant_group_option_id, cg.category_variant_id,
         (cg.price - b.base_price) AS delta
  FROM con_grupo cg
  JOIN base b ON b.product_id=cg.product_id AND b.category_variant_id=cg.category_variant_id
),
agg AS (
  SELECT product_id, variant_group_option_id,
         COUNT(DISTINCT delta) AS distintos,
         MIN(delta) AS min_d, MAX(delta) AS max_d,
         array_agg(jsonb_build_object('cv', category_variant_id, 'delta', delta) ORDER BY category_variant_id) AS detail
  FROM deltas
  GROUP BY 1,2
)
INSERT INTO public.migration_warnings_variantes (warning_type, message, payload)
SELECT 'delta_inconsistente',
       'Producto con delta no uniforme entre tamaños — requiere revisión manual',
       jsonb_build_object('product_id', product_id, 'option_id', variant_group_option_id,
                          'min_delta', min_d, 'max_delta', max_d, 'detail', detail)
FROM agg WHERE distintos > 1;

-- 4) Eliminación de filas combinadas SOLO para productos sin warnings de delta
DELETE FROM public.product_variant_options pvo
WHERE pvo.variant_group_option_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.migration_warnings_variantes w
    WHERE w.warning_type='delta_inconsistente'
      AND (w.payload->>'product_id')::uuid = pvo.product_id
  );

-- 5) Constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='combo_items_unique_slot') THEN
    ALTER TABLE public.combo_items
      ADD CONSTRAINT combo_items_unique_slot
      UNIQUE (combo_product_id, category_id, default_product_id, display_order);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='vgo_delta_nonneg') THEN
    ALTER TABLE public.variant_group_options
      ADD CONSTRAINT vgo_delta_nonneg CHECK (price_delta >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='pvo_price_nonneg') THEN
    ALTER TABLE public.product_variant_options
      ADD CONSTRAINT pvo_price_nonneg CHECK (price >= 0);
  END IF;
END $$;

-- 6) Índice único parcial para precio base por tamaño
CREATE UNIQUE INDEX IF NOT EXISTS pvo_unique_base_per_size
  ON public.product_variant_options (product_id, category_variant_id)
  WHERE variant_group_option_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_pvo_product ON public.product_variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_vgo_group ON public.variant_group_options(group_id);

-- 7) Resumen final
INSERT INTO public.migration_warnings_variantes (warning_type, message, payload)
SELECT 'migration_summary', 'Resumen de migración variantes',
       jsonb_build_object(
         'pvo_total', (SELECT COUNT(*) FROM public.product_variant_options),
         'pvo_legacy_null', (SELECT COUNT(*) FROM public.product_variant_options WHERE variant_group_option_id IS NULL),
         'pvo_con_grupo_pendiente', (SELECT COUNT(*) FROM public.product_variant_options WHERE variant_group_option_id IS NOT NULL),
         'productos_en_revision', (SELECT COUNT(DISTINCT (payload->>'product_id')) FROM public.migration_warnings_variantes WHERE warning_type='delta_inconsistente'),
         'duplicados_combo_items_borrados', (SELECT COUNT(*) FROM public.migration_warnings_variantes WHERE warning_type='combo_item_duplicate')
       );
