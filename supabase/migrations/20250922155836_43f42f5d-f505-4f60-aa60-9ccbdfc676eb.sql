-- Remove pgjwt extension and replace JWT functions with native Supabase implementation

-- First, replace the issue_app_jwt function to use native Supabase JWT functions
CREATE OR REPLACE FUNCTION app.issue_app_jwt(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'app'
AS $$
DECLARE
  v_role text;
  v_branch bigint := NULL;
  v_secret text := current_setting('app.jwt_secret', true);
  v_mapped_role text;
  v_payload jsonb;
BEGIN
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'APP_JWT_SECRET not set (app.jwt_secret)';
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = p_user_id AND active = true;
  
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User not found or inactive';
  END IF;

  v_mapped_role := CASE v_role::text
    WHEN 'Administrador' THEN 'admin'
    WHEN 'Cajero' THEN 'cashier'
    WHEN 'Cocinero' THEN 'kitchen'
    WHEN 'Preparador' THEN 'kitchen'  
    WHEN 'Repartidor' THEN 'delivery'
    WHEN 'Viewer' THEN 'viewer'
    ELSE 'viewer'
  END;

  -- Build the payload
  v_payload := jsonb_build_object(
    'sub', p_user_id::text,
    'app_role', v_mapped_role,
    'branch_id', v_branch,
    'iat', extract(epoch from now())::int,
    'exp', extract(epoch from now() + interval '24 hours')::int
  );

  -- Use Supabase's native JWT signing with extensions.jwt_generate
  RETURN extensions.jwt_generate(v_payload, v_secret);
END;
$$;

-- Drop the old pgjwt extension functions (these will be removed when extension is dropped)
-- But first, let's check if we can drop them safely

-- Drop the pgjwt extension completely
-- This will remove all the pgjwt functions including sign() and verify()
DROP EXTENSION IF EXISTS pgjwt CASCADE;