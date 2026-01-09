-- Fix RLS policies for tv_screen_content to use staff token header validation
DROP POLICY IF EXISTS tv_screen_content_insert ON public.tv_screen_content;
DROP POLICY IF EXISTS tv_screen_content_update ON public.tv_screen_content;
DROP POLICY IF EXISTS tv_screen_content_delete ON public.tv_screen_content;

CREATE POLICY "Staff can manage TV screen content"
ON public.tv_screen_content
FOR ALL
USING (public.is_active_staff_with_token())
WITH CHECK (public.is_active_staff_with_token());
