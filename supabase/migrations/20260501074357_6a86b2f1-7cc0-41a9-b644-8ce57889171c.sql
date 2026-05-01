DROP POLICY IF EXISTS "Admins can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can update branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can delete branches" ON public.branches;

CREATE POLICY "Admins can insert branches" ON public.branches
  FOR INSERT WITH CHECK (public.is_staff_admin());

CREATE POLICY "Admins can update branches" ON public.branches
  FOR UPDATE USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

CREATE POLICY "Admins can delete branches" ON public.branches
  FOR DELETE USING (public.is_staff_admin());