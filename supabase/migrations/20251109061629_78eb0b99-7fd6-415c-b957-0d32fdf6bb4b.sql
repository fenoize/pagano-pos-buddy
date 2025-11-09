-- Actualizar todas las categorías y productos existentes para que se muestren por defecto

-- Actualizar categorías existentes
UPDATE public.categories 
SET 
  show_in_app = COALESCE(show_in_app, true),
  show_in_pos = COALESCE(show_in_pos, true)
WHERE show_in_app IS NULL OR show_in_pos IS NULL;

-- Actualizar productos existentes
UPDATE public.products 
SET 
  show_in_app = COALESCE(show_in_app, true),
  show_in_pos = COALESCE(show_in_pos, true)
WHERE show_in_app IS NULL OR show_in_pos IS NULL;