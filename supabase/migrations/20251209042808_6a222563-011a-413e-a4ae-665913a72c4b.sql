-- Add category column to raw_materials for filtering
ALTER TABLE public.raw_materials 
ADD COLUMN IF NOT EXISTS category text;

-- Add some common category values as a comment reference
COMMENT ON COLUMN public.raw_materials.category IS 'Category for grouping: Bebidas, Carnes, Packaging, Insumos, Vegetales, Salsas, Pan, etc.';