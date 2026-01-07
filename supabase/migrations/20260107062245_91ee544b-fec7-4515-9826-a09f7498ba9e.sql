-- Fix: Configuration Table Allows Public Write Access
-- Drop overly permissive policies on config table

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public insert access to config" ON public.config;
DROP POLICY IF EXISTS "Allow public update access to config" ON public.config;

-- Revoke broad public grants (keep only necessary SELECT for app functionality)
REVOKE INSERT, UPDATE, DELETE ON public.config FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.config FROM PUBLIC;

-- Keep existing select policy for reading config (needed for app to load settings)
-- Add secure admin-only write policies

-- Only admins can INSERT new configuration
CREATE POLICY "Admins can insert config"
ON public.config FOR INSERT
WITH CHECK (is_staff_admin());

-- Only admins can UPDATE configuration
CREATE POLICY "Admins can update config"
ON public.config FOR UPDATE
USING (is_staff_admin())
WITH CHECK (is_staff_admin());

-- Only admins can DELETE configuration
CREATE POLICY "Admins can delete config"
ON public.config FOR DELETE
USING (is_staff_admin());