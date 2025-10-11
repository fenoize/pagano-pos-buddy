-- Agregar campos de orden y categoría por defecto
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Crear índice para mejorar rendimiento en ordenamiento
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);

-- Actualizar categorías existentes con orden basado en nombre alfabético
UPDATE public.categories 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 as row_num
  FROM public.categories
) as subquery
WHERE public.categories.id = subquery.id;

-- Agregar configuración de columnas POS en la tabla config
INSERT INTO public.config (key, value)
VALUES ('pos_grid_columns', '4'::jsonb)
ON CONFLICT (key) DO NOTHING;