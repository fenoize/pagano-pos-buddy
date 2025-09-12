-- Fix critical security vulnerability in users table
-- Remove the overly permissive public access policies
DROP POLICY IF EXISTS "Allow public access for POS operations to users" ON users;
DROP POLICY IF EXISTS "Allow user lookup for login" ON users;

-- Create a secure login function that can verify credentials without exposing user data
CREATE OR REPLACE FUNCTION public.authenticate_user(
  _username text,
  _password text
) RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  email text,
  role app_role,
  active boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record users%ROWTYPE;
  is_valid_password boolean := false;
BEGIN
  -- Get user record
  SELECT * INTO user_record 
  FROM users 
  WHERE users.username = _username AND users.active = true;
  
  -- If user not found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check password (both plain text and bcrypt hash support)
  IF user_record.pass_hash = _password THEN
    is_valid_password := true;
  ELSE
    -- Try bcrypt verification (requires pgcrypto extension)
    BEGIN
      SELECT crypt(_password, user_record.pass_hash) = user_record.pass_hash INTO is_valid_password;
    EXCEPTION WHEN OTHERS THEN
      is_valid_password := false;
    END;
  END IF;
  
  -- If password is valid, return user data
  IF is_valid_password THEN
    RETURN QUERY SELECT 
      user_record.id,
      user_record.username,
      user_record.full_name,
      user_record.email,
      user_record.role,
      user_record.active;
  END IF;
  
  RETURN;
END;
$$;

-- Create secure policies for authenticated users only
-- Only administrators can view all users
CREATE POLICY "Administrators can view all users"
ON users 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'Administrador' 
    AND u.active = true
  )
);

-- Only administrators can create new users
CREATE POLICY "Administrators can create users"
ON users 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'Administrador' 
    AND u.active = true
  )
);

-- Only administrators can update users
CREATE POLICY "Administrators can update users"
ON users 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'Administrador' 
    AND u.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'Administrador' 
    AND u.active = true
  )
);

-- Only administrators can delete users
CREATE POLICY "Administrators can delete users"
ON users 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'Administrador' 
    AND u.active = true
  )
);

-- Grant execute permission on the authentication function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.authenticate_user(text, text) TO anon, authenticated;