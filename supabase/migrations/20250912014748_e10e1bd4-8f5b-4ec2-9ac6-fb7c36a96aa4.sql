-- Crear tabla de categorías dinámicas
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar categorías predefinidas
INSERT INTO public.categories (name, description) VALUES 
  ('Hamburguesas', 'Hamburguesas tradicionales'),
  ('Smash&Fries', 'Combos de smash burgers con papas'),
  ('Papas Fritas', 'Papas fritas y acompañamientos'),
  ('Sides', 'Acompañamientos y extras'),
  ('Otros', 'Productos varios');

-- Crear tabla de relación muchos-a-muchos entre productos y categorías
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Modificar product_extras para hacerlos globales por categoría
ALTER TABLE public.product_extras 
DROP COLUMN IF EXISTS product_id,
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- Agregar precio a modificadores
ALTER TABLE public.product_modifiers 
ADD COLUMN price INTEGER DEFAULT 0;

-- Crear bucket para imágenes de productos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);

-- Crear políticas para el bucket de imágenes
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Allow public upload of product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow public update of product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images');

CREATE POLICY "Allow public delete of product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images');

-- Habilitar RLS en categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Crear políticas para categories
CREATE POLICY "Allow public read access to categories" 
ON public.categories 
FOR SELECT 
USING (active = true);

CREATE POLICY "Allow public access for POS operations to categories" 
ON public.categories 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Habilitar RLS en product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Crear políticas para product_categories
CREATE POLICY "Allow public access for POS operations to product_categories" 
ON public.product_categories 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Crear trigger para updated_at en categories
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Actualizar políticas de product_extras para funcionar con categorías
DROP POLICY IF EXISTS "Allow public read access to product extras" ON public.product_extras;
CREATE POLICY "Allow public read access to product extras" 
ON public.product_extras 
FOR SELECT 
USING (active = true);

CREATE POLICY "Allow public access for POS operations to product extras" 
ON public.product_extras 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Actualizar políticas de product_modifiers
DROP POLICY IF EXISTS "Allow public read access to product modifiers" ON public.product_modifiers;
CREATE POLICY "Allow public read access to product modifiers" 
ON public.product_modifiers 
FOR SELECT 
USING (active = true);

CREATE POLICY "Allow public access for POS operations to product modifiers" 
ON public.product_modifiers 
FOR ALL 
USING (true)
WITH CHECK (true);