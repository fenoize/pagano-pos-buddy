-- Eliminar políticas actuales de purchase_requests
DROP POLICY IF EXISTS "Allow authenticated users to view purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated users to insert purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated users to update purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated users to delete purchase_requests" ON public.purchase_requests;

-- Crear nuevas políticas públicas (igual que otras tablas del sistema)
CREATE POLICY "Allow all users to view purchase_requests"
  ON public.purchase_requests FOR SELECT
  USING (true);

CREATE POLICY "Allow all users to insert purchase_requests"
  ON public.purchase_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all users to update purchase_requests"
  ON public.purchase_requests FOR UPDATE
  USING (true);

CREATE POLICY "Allow all users to delete draft purchase_requests"
  ON public.purchase_requests FOR DELETE
  USING (status = 'draft');

-- Eliminar políticas actuales de purchase_request_items
DROP POLICY IF EXISTS "Allow authenticated users to view purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Allow authenticated users to insert purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Allow authenticated users to update purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete purchase_request_items" ON public.purchase_request_items;

-- Crear nuevas políticas públicas para items
CREATE POLICY "Allow all users to view purchase_request_items"
  ON public.purchase_request_items FOR SELECT
  USING (true);

CREATE POLICY "Allow all users to insert purchase_request_items"
  ON public.purchase_request_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all users to update purchase_request_items"
  ON public.purchase_request_items FOR UPDATE
  USING (true);

CREATE POLICY "Allow all users to delete purchase_request_items"
  ON public.purchase_request_items FOR DELETE
  USING (true);