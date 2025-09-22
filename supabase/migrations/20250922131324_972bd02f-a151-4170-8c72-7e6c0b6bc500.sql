BEGIN;

-- ========================================
-- CORRECCIONES DE SEGURIDAD 
-- ========================================

-- 1. Recrear funciones con search_path fijo para evitar warnings de seguridad
CREATE OR REPLACE FUNCTION public.auth_jwt() RETURNS jsonb
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = public, app
AS $$
  SELECT nullif(public.auth_jwt()->>'sub','')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_role() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = public, app
AS $$
  SELECT nullif(public.auth_jwt()->>'app_role','')::text
$$;

CREATE OR REPLACE FUNCTION app.current_branch_id() RETURNS bigint
LANGUAGE sql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = public, app
AS $$
  SELECT NULLIF(public.auth_jwt()->>'branch_id','')::bigint
$$;

-- 2. Recrear función JWT con search_path fijo
CREATE OR REPLACE FUNCTION app.issue_app_jwt(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public, app, extensions
AS $$
DECLARE
  v_role text;
  v_branch bigint := NULL;
  v_secret text := current_setting('app.jwt_secret', true);
  v_mapped_role text;
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

  RETURN sign(
    json_build_object(
      'sub', p_user_id::text,
      'app_role', v_mapped_role,
      'branch_id', v_branch,
      'iat', extract(epoch from now())::int,
      'exp', extract(epoch from now() + interval '24 hours')::int
    )::json, v_secret
  );
END $$;

-- 3. Recrear funciones de password reset con search_path fijo
CREATE OR REPLACE FUNCTION app.create_reset_code(p_email text)
RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public, app
AS $$
DECLARE 
  v_user_id uuid;
  v_code text;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND active = true;
  IF v_user_id IS NULL THEN 
    RETURN; 
  END IF;
  
  v_code := encode(gen_random_bytes(16), 'hex');
  DELETE FROM public.password_reset_codes WHERE user_id = v_user_id;
  INSERT INTO public.password_reset_codes(user_id, code, expires_at, used)
  VALUES (v_user_id, v_code, now() + interval '10 minutes', false);
END $$;

CREATE OR REPLACE FUNCTION app.consume_reset_code(p_code text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public, app
AS $$
DECLARE 
  v_user_id uuid;
  v_new_hash text;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.password_reset_codes
  WHERE code = p_code AND used = false AND expires_at > now()
  FOR UPDATE SKIP LOCKED;

  IF v_user_id IS NULL THEN 
    RETURN FALSE; 
  END IF;

  v_new_hash := public.generate_simple_hash(p_new_password);
  UPDATE public.users SET pass_hash = v_new_hash, updated_at = now() 
  WHERE id = v_user_id;
  UPDATE public.password_reset_codes SET used = true WHERE code = p_code;
  
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION app.cleanup_expired_codes()
RETURNS void
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public, app
AS $$
BEGIN
  DELETE FROM public.password_reset_codes 
  WHERE expires_at < now() OR used = true;
END $$;

-- 4. Recrear vistas sin SECURITY DEFINER para evitar warnings
DROP VIEW IF EXISTS public.app_public_users;
DROP VIEW IF EXISTS public.app_orders_kitchen;
DROP VIEW IF EXISTS public.app_orders_delivery;

-- Vista simple de usuarios (sin SECURITY DEFINER)
CREATE VIEW public.app_public_users AS
SELECT id, username, full_name, email, role, active, created_at, updated_at
FROM public.users;

-- Vista simple para cocina (sin SECURITY DEFINER)  
CREATE VIEW public.app_orders_kitchen AS
SELECT o.id, o.order_number, o.status, o.created_at, o.updated_at,
       o.fulfillment, o.items, o.total, o.notes, o.nombre_resumen
FROM public.orders o;

-- Vista simple para delivery (sin SECURITY DEFINER)
CREATE VIEW public.app_orders_delivery AS
SELECT o.id, o.order_number, o.status, o.created_at, o.updated_at,
       o.fulfillment, o.total, o.delivery_address, o.delivery_comuna, o.delivery_number,
       c.name as customer_name, c.phone as customer_phone
FROM public.orders o
LEFT JOIN public.customers c ON c.id = o.customer_id
WHERE o.fulfillment = 'delivery';

-- 5. Mover extensión pgjwt a schema extensions si existe
DROP EXTENSION IF EXISTS pgjwt;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;

COMMIT;