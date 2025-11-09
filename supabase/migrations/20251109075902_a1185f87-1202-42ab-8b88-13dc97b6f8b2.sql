-- Agregar columna para ID de producto en promociones
ALTER TABLE public.marketing_app_promotions
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;