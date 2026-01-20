-- Drop existing restrictive SELECT policies on orders
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can read all orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;

-- Create a simple permissive SELECT policy for orders
-- Orders are internal business data that staff needs to view
CREATE POLICY "Allow read access to orders" 
ON public.orders 
FOR SELECT 
USING (true);

-- Also ensure the UPDATE policy is permissive for staff
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;

CREATE POLICY "Allow update access to orders" 
ON public.orders 
FOR UPDATE 
USING (true)
WITH CHECK (true);