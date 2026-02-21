
CREATE OR REPLACE FUNCTION public.sync_user_roles(
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_roles text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_admin_user_id AND active = true AND role = 'Administrador'
  ) THEN
    RAISE EXCEPTION 'No tienes permisos de administrador';
  END IF;

  -- Delete existing roles
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;

  -- Insert new roles (deduplicated)
  INSERT INTO public.user_roles (user_id, role)
  SELECT p_target_user_id, unnest(p_roles)::public.app_role
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update primary role on users table
  UPDATE public.users
  SET role = p_roles[1]::public.app_role
  WHERE id = p_target_user_id;
END;
$$;
