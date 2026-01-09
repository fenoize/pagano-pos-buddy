-- Eliminar el constraint existente y crear uno nuevo que incluya 'promo_only'
ALTER TABLE public.tv_screen_configs 
DROP CONSTRAINT IF EXISTS tv_screen_configs_template_check;

ALTER TABLE public.tv_screen_configs 
ADD CONSTRAINT tv_screen_configs_template_check 
CHECK (template IN ('full', 'split_horizontal', 'split_vertical', 'promo_only'));