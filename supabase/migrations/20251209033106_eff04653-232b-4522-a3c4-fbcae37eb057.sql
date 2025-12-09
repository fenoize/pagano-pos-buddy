-- Add raw_material_id to product_variant_options for direct variant-to-raw-material linking
ALTER TABLE public.product_variant_options 
ADD COLUMN raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE SET NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.product_variant_options.raw_material_id IS 'Direct link to raw material for simple products (e.g., drink variants). When set, selling this variant deducts 1 unit from inventory.';

-- Create index for performance
CREATE INDEX idx_product_variant_options_raw_material ON public.product_variant_options(raw_material_id) WHERE raw_material_id IS NOT NULL;