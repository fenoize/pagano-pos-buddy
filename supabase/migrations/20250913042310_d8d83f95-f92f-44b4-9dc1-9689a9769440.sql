-- Install pgcrypto extension for bcrypt support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to generate bcrypt hash
CREATE OR REPLACE FUNCTION public.generate_bcrypt_hash(password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT crypt(password, gen_salt('bf', 10));
$$;

-- Create function to set user password with bcrypt
CREATE OR REPLACE FUNCTION public.set_user_password(user_uuid uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bcrypt_hash text;
BEGIN
  -- Generate bcrypt hash
  bcrypt_hash := public.generate_bcrypt_hash(new_password);
  
  -- Update user password
  UPDATE users 
  SET pass_hash = bcrypt_hash, updated_at = now()
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$;

-- Update authenticate_user function to support both hash types and migrate to bcrypt
CREATE OR REPLACE FUNCTION public.authenticate_user(_username text, _password text)
RETURNS TABLE(user_id uuid, username text, full_name text, email text, role app_role, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record users%ROWTYPE;
  is_valid_password boolean := false;
  password_hash text;
  expected_sha256_hash text;
  new_bcrypt_hash text;
BEGIN
  -- Get user record
  SELECT * INTO user_record 
  FROM users 
  WHERE users.username = _username AND users.active = true;
  
  -- If user not found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check password (support plain text, bcrypt hash, and SHA-256 hash)
  IF user_record.pass_hash = _password THEN
    -- Plain text password (legacy)
    is_valid_password := true;
    -- Migrate to bcrypt
    new_bcrypt_hash := public.generate_bcrypt_hash(_password);
    UPDATE users SET pass_hash = new_bcrypt_hash, updated_at = now() WHERE id = user_record.id;
  ELSIF user_record.pass_hash LIKE '$2b$%' OR user_record.pass_hash LIKE '$2a$%' THEN
    -- Proper bcrypt hash
    BEGIN
      SELECT crypt(_password, user_record.pass_hash) = user_record.pass_hash INTO is_valid_password;
    EXCEPTION WHEN OTHERS THEN
      is_valid_password := false;
    END;
  ELSE
    -- Check SHA-256 hash format (from our edge function)
    BEGIN
      -- Generate SHA-256 hash of the password
      SELECT encode(digest(_password, 'sha256'), 'hex') INTO password_hash;
      -- Create expected hash format similar to our edge function
      expected_sha256_hash := '$2b$10$' || substring(password_hash from 1 for 22) || substring(password_hash from 23);
      
      IF user_record.pass_hash = expected_sha256_hash THEN
        is_valid_password := true;
        -- Migrate to proper bcrypt
        new_bcrypt_hash := public.generate_bcrypt_hash(_password);
        UPDATE users SET pass_hash = new_bcrypt_hash, updated_at = now() WHERE id = user_record.id;
      END IF;
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

-- Insert default administrator user if it doesn't exist
DO $$
DECLARE
  admin_exists boolean;
  admin_hash text;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE username = 'administrador') INTO admin_exists;
  
  -- If admin doesn't exist, create it
  IF NOT admin_exists THEN
    -- Generate bcrypt hash for default password '12345678'
    admin_hash := public.generate_bcrypt_hash('12345678');
    
    INSERT INTO users (username, full_name, email, role, pass_hash, active)
    VALUES (
      'administrador',
      'Administrador del Sistema',
      'admin@paganos.cl',
      'Administrador'::app_role,
      admin_hash,
      true
    );
    
    RAISE NOTICE 'Usuario administrador creado con contraseña: 12345678';
  END IF;
END;
$$;