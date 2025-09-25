-- Add display_order column to product_extras table for drag and drop ordering
ALTER TABLE public.product_extras 
ADD COLUMN display_order integer NOT NULL DEFAULT 0;

-- Update existing records to have incremental order based on creation date
UPDATE public.product_extras 
SET display_order = (
  SELECT ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) - 1
  FROM public.product_extras pe2 
  WHERE pe2.id = product_extras.id
);

-- Create index for better performance when ordering
CREATE INDEX idx_product_extras_display_order ON public.product_extras(category_id, display_order);