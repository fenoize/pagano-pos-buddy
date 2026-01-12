-- =====================================================
-- SECURITY FIX: Part 3 - Fix remaining permissive policies
-- =====================================================

-- ========== DELIVERY_PAYMENTS ==========
-- Fix the remaining permissive policy
DROP POLICY IF EXISTS "Admins can manage all delivery payments" ON public.delivery_payments;
DROP POLICY IF EXISTS "Staff can view delivery payments" ON public.delivery_payments;
DROP POLICY IF EXISTS "Staff can manage delivery payments" ON public.delivery_payments;

CREATE POLICY "Staff can view delivery payments"
ON public.delivery_payments FOR SELECT
USING (is_active_staff());

CREATE POLICY "Admins can manage delivery payments"
ON public.delivery_payments FOR INSERT
WITH CHECK (is_active_admin());

CREATE POLICY "Admins can update delivery payments"
ON public.delivery_payments FOR UPDATE
USING (is_active_admin())
WITH CHECK (is_active_admin());

CREATE POLICY "Admins can delete delivery payments"
ON public.delivery_payments FOR DELETE
USING (is_active_admin());

-- ========== ORDER_DELIVERY_AUDIT ==========
DROP POLICY IF EXISTS "Allow public access to delivery audit" ON public.order_delivery_audit;
DROP POLICY IF EXISTS "Staff can view delivery audit" ON public.order_delivery_audit;
DROP POLICY IF EXISTS "Staff can insert delivery audit" ON public.order_delivery_audit;

CREATE POLICY "Staff can view delivery audit"
ON public.order_delivery_audit FOR SELECT
USING (is_active_staff());

CREATE POLICY "Staff can insert delivery audit"
ON public.order_delivery_audit FOR INSERT
WITH CHECK (is_active_staff());

-- ========== PURCHASE_REQUEST_ITEMS ==========
DROP POLICY IF EXISTS "Allow all users to view purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Allow all users to insert purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Allow all users to update purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Allow all users to delete purchase_request_items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Staff can view purchase request items" ON public.purchase_request_items;
DROP POLICY IF EXISTS "Staff can manage purchase request items" ON public.purchase_request_items;

CREATE POLICY "Staff can view purchase request items"
ON public.purchase_request_items FOR SELECT
USING (is_active_staff());

CREATE POLICY "Staff can insert purchase request items"
ON public.purchase_request_items FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update purchase request items"
ON public.purchase_request_items FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can delete purchase request items"
ON public.purchase_request_items FOR DELETE
USING (is_active_staff());

-- ========== PURCHASE_REQUESTS ==========
DROP POLICY IF EXISTS "Allow all users to view purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Allow all users to insert purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Allow all users to update purchase_requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Staff can view purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Staff can create purchase requests" ON public.purchase_requests;
DROP POLICY IF EXISTS "Staff can update purchase requests" ON public.purchase_requests;

CREATE POLICY "Staff can view purchase requests"
ON public.purchase_requests FOR SELECT
USING (is_active_staff());

CREATE POLICY "Staff can create purchase requests"
ON public.purchase_requests FOR INSERT
WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update purchase requests"
ON public.purchase_requests FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());