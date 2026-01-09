-- Relax policy to match tv_screen_configs behavior (uses is_active_staff fallback)
DROP POLICY IF EXISTS "Staff can manage TV screen content" ON public.tv_screen_content;

CREATE POLICY "Staff can manage TV screen content"
ON public.tv_screen_content
FOR ALL
USING (public.is_active_staff_with_token() OR public.is_active_staff())
WITH CHECK (public.is_active_staff_with_token() OR public.is_active_staff());
