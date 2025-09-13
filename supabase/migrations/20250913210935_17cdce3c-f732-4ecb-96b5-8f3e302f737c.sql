-- Insert admin user
INSERT INTO public.users (username, email, full_name, role, active)
VALUES (
  'admin',
  'contacto@paganosburger.cl',
  'Administrador Principal',
  'Administrador'::app_role,
  true
);

-- Get the user ID and set the password
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id 
  FROM public.users 
  WHERE username = 'admin';
  
  -- Set the password using our secure function
  PERFORM public.set_user_password(admin_user_id, 'somospaganos!');
END $$;