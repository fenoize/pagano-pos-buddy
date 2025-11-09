-- Agregar columnas de visibilidad para POS y App Cliente

-- Agregar show_in_app a categories (para controlar visibilidad en app cliente)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS show_in_app boolean DEFAULT true;

-- Agregar show_in_pos a categories (para controlar visibilidad en POS)
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS show_in_pos boolean DEFAULT true;

-- Agregar show_in_pos a products (para controlar visibilidad en POS)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS show_in_pos boolean DEFAULT true;

-- Comentarios para documentar
COMMENT ON COLUMN public.categories.show_in_app IS 'Controla si la categoría se muestra en la aplicación de cliente';
COMMENT ON COLUMN public.categories.show_in_pos IS 'Controla si la categoría se muestra en el POS';
COMMENT ON COLUMN public.products.show_in_app IS 'Controla si el producto se muestra en la aplicación de cliente';
COMMENT ON COLUMN public.products.show_in_pos IS 'Controla si el producto se muestra en el POS';