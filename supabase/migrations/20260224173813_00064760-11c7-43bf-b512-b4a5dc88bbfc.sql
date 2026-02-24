
-- RPC para crear material rápido (bypass RLS)
CREATE OR REPLACE FUNCTION public.quick_create_raw_material(
  p_user_id uuid,
  p_name text,
  p_code text DEFAULT NULL,
  p_base_uom_id uuid DEFAULT NULL,
  p_last_cost numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validar que el usuario tiene sesión activa
  IF NOT has_user_active_session(p_user_id) THEN
    RAISE EXCEPTION 'No tienes una sesión activa';
  END IF;

  INSERT INTO raw_materials (name, code, base_uom_id, last_cost, is_active)
  VALUES (p_name, p_code, p_base_uom_id, p_last_cost, true)
  RETURNING json_build_object(
    'id', id,
    'name', name,
    'base_uom_id', base_uom_id,
    'last_cost', last_cost
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC para crear proveedor rápido (bypass RLS)
CREATE OR REPLACE FUNCTION public.quick_create_supplier(
  p_user_id uuid,
  p_name text,
  p_rut text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validar que el usuario tiene sesión activa
  IF NOT has_user_active_session(p_user_id) THEN
    RAISE EXCEPTION 'No tienes una sesión activa';
  END IF;

  INSERT INTO suppliers (name, rut, phone, email, is_active)
  VALUES (p_name, p_rut, p_phone, p_email, true)
  RETURNING json_build_object('id', id, 'name', name) INTO v_result;

  RETURN v_result;
END;
$$;
