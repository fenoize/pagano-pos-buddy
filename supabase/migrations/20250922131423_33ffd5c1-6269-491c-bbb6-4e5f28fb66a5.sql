BEGIN;

-- Crear política para addresses que parece faltar
CREATE POLICY addresses_access ON public.addresses
FOR ALL TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') )
WITH CHECK ( app.current_role() IN ('admin','cashier') );

COMMIT;