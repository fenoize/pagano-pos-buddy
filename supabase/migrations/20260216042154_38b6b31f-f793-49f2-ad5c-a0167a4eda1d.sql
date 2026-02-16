-- Add image_url column to category_variants
ALTER TABLE public.category_variants
ADD COLUMN image_url TEXT DEFAULT NULL;