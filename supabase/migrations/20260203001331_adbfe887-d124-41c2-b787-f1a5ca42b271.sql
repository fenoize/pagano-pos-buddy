
-- Recrear is_active_staff como SECURITY DEFINER para bypassear RLS de staff_sessions
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Verificar usando has_any_active_staff_session (ya es SECURITY DEFINER)
    public.has_any_active_staff_session(),
    false
  );
$$;

-- También actualizar las políticas de productos para usar la función simplificada
DROP POLICY IF EXISTS "Staff can insert products" ON public.products;
DROP POLICY IF EXISTS "Staff can update products" ON public.products;
DROP POLICY IF EXISTS "Staff can delete products" ON public.products;

-- Recrear políticas usando has_any_active_staff_session directamente
CREATE POLICY "Staff can insert products"
ON public.products
FOR INSERT TO anon, authenticated
WITH CHECK (public.has_any_active_staff_session());

CREATE POLICY "Staff can update products"
ON public.products
FOR UPDATE TO anon, authenticated
USING (public.has_any_active_staff_session())
WITH CHECK (public.has_any_active_staff_session());

CREATE POLICY "Staff can delete products"
ON public.products
FOR DELETE TO anon, authenticated
USING (public.has_any_active_staff_session());
