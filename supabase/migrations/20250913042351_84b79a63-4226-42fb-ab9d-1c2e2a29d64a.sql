-- Create a simple bcrypt-compatible hash function using SHA-256
CREATE OR REPLACE FUNCTION public.generate_bcrypt_hash(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  salt text;
  password_hash text;
BEGIN
  -- Generate a simple salt
  salt := encode(gen_random_bytes(16), 'hex');
  
  -- Create hash using SHA-256 with salt
  password_hash := encode(digest(salt || password, 'sha256'), 'hex');
  
  -- Return in bcrypt-like format
  RETURN '$2b$10$' || substring(salt from 1 for 22) || substring(password_hash from 1 for 31);
END;
$$;

-- Create function to set user password
CREATE OR REPLACE FUNCTION public.set_user_password(user_uuid uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_hash text;
BEGIN
  -- Generate hash
  new_hash := public.generate_bcrypt_hash(new_password);
  
  -- Update user password
  UPDATE users 
  SET pass_hash = new_hash, updated_at = now()
  WHERE id = user_uuid;
  
  RETURN FOUND;
END;
$$;

-- Create function to verify password
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  salt text;
  stored_hash text;
  computed_hash text;
BEGIN
  -- Handle bcrypt-like format from our generate_bcrypt_hash function
  IF hash LIKE '$2b$10$%' THEN
    -- Extract salt (first 22 chars after $2b$10$)
    salt := substring(hash from 8 for 22);
    -- Extract stored hash (remaining chars)
    stored_hash := substring(hash from 31);
    
    -- Compute hash with extracted salt
    computed_hash := substring(encode(digest(salt || password, 'sha256'), 'hex') from 1 for 31);
    
    RETURN stored_hash = computed_hash;
  END IF;
  
  -- Fallback: direct comparison (for legacy passwords)
  RETURN hash = password;
END;
$$;

-- Update authenticate_user function to use new verification
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
  new_hash text;
BEGIN
  -- Get user record
  SELECT * INTO user_record 
  FROM users 
  WHERE users.username = _username AND users.active = true;
  
  -- If user not found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Use our verify_password function
  is_valid_password := public.verify_password(_password, user_record.pass_hash);
  
  -- If password verification failed, try legacy SHA-256 format
  IF NOT is_valid_password THEN
    BEGIN
      -- Generate SHA-256 hash of the password (legacy format)
      SELECT encode(digest(_password, 'sha256'), 'hex') INTO password_hash;
      -- Create expected hash format similar to our old edge function
      expected_sha256_hash := '$2b$10$' || substring(password_hash from 1 for 22) || substring(password_hash from 23);
      
      IF user_record.pass_hash = expected_sha256_hash THEN
        is_valid_password := true;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      is_valid_password := false;
    END;
  END IF;
  
  -- If password is valid, migrate to new hash format if needed
  IF is_valid_password AND NOT user_record.pass_hash LIKE '$2b$10$%' THEN
    new_hash := public.generate_bcrypt_hash(_password);
    UPDATE users SET pass_hash = new_hash, updated_at = now() WHERE id = user_record.id;
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
    -- Generate hash for default password '12345678'
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