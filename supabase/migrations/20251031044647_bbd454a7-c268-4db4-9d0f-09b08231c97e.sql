-- Fix CRITICAL security issues

-- 1. Fix customers table - Remove public access to customer PII
DROP POLICY IF EXISTS "Public can read customers" ON customers;

-- Create restricted policies for customers table
CREATE POLICY "Staff can view all customers" ON customers
FOR SELECT USING (
  public.get_current_staff_user_id() IS NOT NULL
);

CREATE POLICY "Customers can view own data" ON customers
FOR SELECT USING (
  auth.uid() = auth_user_id
);

-- 2. Fix app_public_users view - Convert to SECURITY INVOKER
DROP VIEW IF EXISTS app_public_users;

CREATE VIEW app_public_users 
WITH (security_invoker=true) AS
SELECT 
  id, username, full_name, email, role, 
  active, created_at, updated_at
FROM users;

-- 3. Fix user_roles table - Add missing RLS policies
-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Allow authenticated users to read their own roles
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT USING (
  user_id = public.get_current_staff_user_id() OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = user_roles.user_id 
    AND users.id = auth.uid()
  )
);

-- Allow admins to manage all roles
CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());