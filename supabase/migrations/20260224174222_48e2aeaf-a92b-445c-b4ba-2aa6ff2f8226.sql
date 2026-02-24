
-- RPC para listar proveedores activos (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_active_suppliers(p_user_id uuid)
RETURNS SETOF suppliers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_user_active_session(p_user_id) THEN
    RAISE EXCEPTION 'No tienes una sesión activa';
  END IF;

  RETURN QUERY
    SELECT * FROM suppliers WHERE is_active = true ORDER BY name;
END;
$$;
