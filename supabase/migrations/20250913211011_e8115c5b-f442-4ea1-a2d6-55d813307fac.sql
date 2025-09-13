-- Insert admin user with temporary password hash
INSERT INTO public.users (username, email, full_name, role, active, pass_hash)
VALUES (
  'admin',
  'contacto@paganosburger.cl',
  'Administrador Principal',
  'Administrador'::app_role,
  true,
  'temp_hash'
);

-- Get the user ID and set the correct password
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id 
  FROM public.users 
  WHERE username = 'admin' AND email = 'contacto@paganosburger.cl';
  
  -- Set the password using our secure function
  PERFORM public.set_user_password(admin_user_id, 'somospaganos!');
END $$;