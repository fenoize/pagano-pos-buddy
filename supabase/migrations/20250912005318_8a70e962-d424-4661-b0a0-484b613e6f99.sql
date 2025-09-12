-- Add image_url and category to products table
ALTER TABLE public.products 
ADD COLUMN image_url TEXT,
ADD COLUMN category TEXT DEFAULT 'hamburguesas';

-- Create product_extras table
CREATE TABLE public.product_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_modifiers table  
CREATE TABLE public.product_modifiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create runas_transactions table for loyalty system
CREATE TABLE public.runas_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
  amount INTEGER NOT NULL,
  runas INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE public.product_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.runas_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to product extras" 
ON public.product_extras FOR SELECT USING (active = true);

CREATE POLICY "Allow public read access to product modifiers" 
ON public.product_modifiers FOR SELECT USING (active = true);

CREATE POLICY "Allow authenticated all access to runas transactions" 
ON public.runas_transactions FOR ALL USING (true);

-- Add triggers for timestamps
CREATE TRIGGER update_product_extras_updated_at
BEFORE UPDATE ON public.product_extras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_modifiers_updated_at
BEFORE UPDATE ON public.product_modifiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert configuration data for loyalty system and delivery
INSERT INTO public.config (key, value) VALUES 
('runa_value', '1000'::jsonb),
('delivery_zones', '[
  {"name": "Zona 1", "price": 2000},
  {"name": "Zona 2", "price": 3000}, 
  {"name": "Zona 3", "price": 4000}
]'::jsonb),
('payment_methods', '["Efectivo", "POS", "Transferencia", "Runas"]'::jsonb),
('loyalty_enabled', 'true'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update existing products with sample data
UPDATE public.products 
SET 
  category = CASE 
    WHEN name ILIKE '%hamburguesa%' OR name ILIKE '%burger%' THEN 'hamburguesas'
    WHEN name ILIKE '%papa%' OR name ILIKE '%fries%' THEN 'papas'
    WHEN name ILIKE '%gaseosa%' OR name ILIKE '%bebida%' THEN 'bebidas'
    ELSE 'otros'
  END,
  image_url = '/placeholder.svg'
WHERE image_url IS NULL;