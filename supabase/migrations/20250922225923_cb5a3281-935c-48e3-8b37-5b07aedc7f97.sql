-- Crear políticas RLS para la tabla customers (acceso público)
CREATE POLICY "Allow public read access to customers" ON public.customers
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to customers" ON public.customers
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to customers" ON public.customers
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access to customers" ON public.customers
FOR DELETE 
USING (true);

-- Verificar y crear políticas para runas_transactions si no existen
CREATE POLICY "Allow public access to runas_transactions" ON public.runas_transactions
FOR ALL
USING (true)
WITH CHECK (true);