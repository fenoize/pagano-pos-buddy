
-- Fix RLS for customer_tags & customer_tag_assignments to use staff context
DROP POLICY IF EXISTS "Staff can view customer_tags" ON public.customer_tags;
DROP POLICY IF EXISTS "Staff can insert customer_tags" ON public.customer_tags;
DROP POLICY IF EXISTS "Staff can update customer_tags" ON public.customer_tags;
DROP POLICY IF EXISTS "Staff can delete customer_tags" ON public.customer_tags;

CREATE POLICY "Staff can view customer_tags" ON public.customer_tags
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);
CREATE POLICY "Staff can insert customer_tags" ON public.customer_tags
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);
CREATE POLICY "Staff can update customer_tags" ON public.customer_tags
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);
CREATE POLICY "Staff can delete customer_tags" ON public.customer_tags
FOR DELETE USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);

DROP POLICY IF EXISTS "Staff can view customer_tag_assignments" ON public.customer_tag_assignments;
DROP POLICY IF EXISTS "Staff can insert customer_tag_assignments" ON public.customer_tag_assignments;
DROP POLICY IF EXISTS "Staff can update customer_tag_assignments" ON public.customer_tag_assignments;
DROP POLICY IF EXISTS "Staff can delete customer_tag_assignments" ON public.customer_tag_assignments;

CREATE POLICY "Staff can view customer_tag_assignments" ON public.customer_tag_assignments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);
CREATE POLICY "Staff can insert customer_tag_assignments" ON public.customer_tag_assignments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);
CREATE POLICY "Staff can update customer_tag_assignments" ON public.customer_tag_assignments
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);
CREATE POLICY "Staff can delete customer_tag_assignments" ON public.customer_tag_assignments
FOR DELETE USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = get_current_staff_user_id() AND u.active = true)
);
