-- Create simple hash function using MD5 (available by default)
CREATE OR REPLACE FUNCTION public.generate_simple_hash(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  salt text;
  password_hash text;
BEGIN
  -- Generate a simple salt using current timestamp and password
  salt := substr(md5(extract(epoch from now())::text || password), 1, 22);
  
  -- Create hash using MD5 with salt (simple but functional)
  password_hash := md5(salt || password);
  
  -- Return in custom format
  RETURN '$2b$10$' || salt || password_hash;
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
  new_hash := public.generate_simple_hash(new_password);
  
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
  -- Handle our custom format $2b$10$[22-char-salt][32-char-hash]
  IF hash LIKE '$2b$10$%' AND length(hash) >= 54 THEN
    -- Extract salt (chars 8-29)
    salt := substring(hash from 8 for 22);
    -- Extract stored hash (chars 30 onwards)
    stored_hash := substring(hash from 30);
    
    -- Compute hash with extracted salt
    computed_hash := md5(salt || password);
    
    RETURN stored_hash = computed_hash;
  END IF;
  
  -- Fallback: direct comparison (for legacy passwords)
  RETURN hash = password;
END;
$$;

-- Update authenticate_user function
CREATE OR REPLACE FUNCTION public.authenticate_user(_username text, _password text)
RETURNS TABLE(user_id uuid, username text, full_name text, email text, role app_role, active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record users%ROWTYPE;
  is_valid_password boolean := false;
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
  
  -- If password verification failed, try direct comparison (legacy)
  IF NOT is_valid_password THEN
    is_valid_password := (user_record.pass_hash = _password);
  END IF;
  
  -- If password is valid, migrate to new hash format if needed
  IF is_valid_password AND NOT (user_record.pass_hash LIKE '$2b$10$%' AND length(user_record.pass_hash) >= 54) THEN
    new_hash := public.generate_simple_hash(_password);
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
    admin_hash := public.generate_simple_hash('12345678');
    
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