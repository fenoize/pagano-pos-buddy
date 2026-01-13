-- Add policy to allow staff to insert feedback on behalf of customers
CREATE POLICY "Staff can insert feedback"
ON public.order_feedback
FOR INSERT
WITH CHECK (is_active_staff());