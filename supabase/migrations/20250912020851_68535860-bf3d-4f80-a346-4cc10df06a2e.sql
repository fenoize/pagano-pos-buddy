-- Allow public access for all POS operations on products table
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;

CREATE POLICY "Allow public access for POS operations on products" 
ON public.products 
FOR ALL 
USING (true) 
WITH CHECK (true);