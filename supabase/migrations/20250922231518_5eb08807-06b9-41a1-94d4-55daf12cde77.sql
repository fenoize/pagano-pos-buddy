-- Crear políticas RLS para la tabla orders
CREATE POLICY "Allow public read access to orders" ON public.orders
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to orders" ON public.orders
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to orders" ON public.orders
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access to orders" ON public.orders
FOR DELETE 
USING (true);