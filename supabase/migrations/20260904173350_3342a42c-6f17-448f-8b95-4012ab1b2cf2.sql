DROP POLICY IF EXISTS "Admins manage marketing alliances" ON public.marketing_alliances;

CREATE POLICY "Admins manage marketing alliances"
ON public.marketing_alliances
FOR ALL
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());