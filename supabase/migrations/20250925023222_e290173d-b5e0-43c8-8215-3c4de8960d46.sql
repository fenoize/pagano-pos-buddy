-- Add allow_variant_change column to combo_items table
ALTER TABLE public.combo_items 
ADD COLUMN allow_variant_change boolean NOT NULL DEFAULT true;