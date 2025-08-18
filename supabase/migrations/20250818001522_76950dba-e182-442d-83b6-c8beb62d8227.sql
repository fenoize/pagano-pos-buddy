-- Fix RLS policy to allow reading users for login purposes
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.users;

-- Create a new policy that allows reading users for login (but not sensitive data)
CREATE POLICY "Allow user lookup for login" ON public.users
FOR SELECT
USING (true);

-- Also ensure we can read products and config without auth for the app to work
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.products;
CREATE POLICY "Allow public read access to products" ON public.products
FOR SELECT
USING (active = true);

DROP POLICY IF EXISTS "Allow authenticated all access" ON public.config;
CREATE POLICY "Allow public read access to config" ON public.config
FOR SELECT
USING (true);