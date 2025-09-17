-- Add RLS policies to allow INSERT and UPDATE operations on config table
CREATE POLICY "Allow public insert access to config" ON public.config
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to config" ON public.config
FOR UPDATE 
USING (true) 
WITH CHECK (true);