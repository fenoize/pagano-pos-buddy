-- Agregar columna product_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'marketing_app_promotions' 
    AND column_name = 'product_id'
  ) THEN
    ALTER TABLE public.marketing_app_promotions 
    ADD COLUMN product_id UUID REFERENCES public.products(id);
  END IF;
END $$;

-- Eliminar constraint anterior
ALTER TABLE public.marketing_app_promotions 
DROP CONSTRAINT IF EXISTS valid_cta_type;

-- Crear constraint actualizado con 'open_product'
ALTER TABLE public.marketing_app_promotions 
ADD CONSTRAINT valid_cta_type CHECK (
  cta_type IN ('open_menu', 'open_cart', 'open_orders', 'open_benefits', 'open_product', 'open_custom_url', 'none')
);