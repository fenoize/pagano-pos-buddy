-- Add RLS policy to allow users to view their own roles
-- This prevents circular dependency where users need admin to check if they're admin
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
TO authenticated
USING (user_id = get_current_staff_user_id());