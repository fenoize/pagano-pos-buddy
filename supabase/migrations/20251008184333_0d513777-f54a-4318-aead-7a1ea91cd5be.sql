-- Fix search_path for functions using gen_random_bytes
-- This ensures they can access the pgcrypto extension

-- Update register_customer function
CREATE OR REPLACE FUNCTION public.register_customer(p_email text, p_password text, p_nombres text, p_apellidos text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_marketing_opt_in boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
DECLARE
  v_account_id UUID;
  v_customer_id UUID;
  v_hash TEXT;
  v_verification_token TEXT;
  v_token_hash TEXT;
BEGIN
  -- Normalizar email
  p_email := LOWER(TRIM(p_email));
  
  -- Verificar si ya existe
  IF EXISTS (SELECT 1 FROM customer_accounts WHERE email = p_email) THEN
    RETURN jsonb_build_object('error', 'EMAIL_EXISTS', 'message', 'Este email ya está registrado');
  END IF;
  
  -- Hash de password
  v_hash := public.generate_simple_hash(p_password);
  
  -- Crear account
  INSERT INTO customer_accounts (email, pass_hash, email_verified)
  VALUES (p_email, v_hash, FALSE)
  RETURNING id INTO v_account_id;
  
  -- Crear perfil de customer
  INSERT INTO customers (account_id, name, nombres, apellidos, email, phone, marketing_opt_in, estado_cliente)
  VALUES (
    v_account_id, 
    TRIM(p_nombres || ' ' || COALESCE(p_apellidos, '')), 
    p_nombres, 
    p_apellidos, 
    p_email, 
    p_phone, 
    p_marketing_opt_in, 
    'Activo'
  )
  RETURNING id INTO v_customer_id;
  
  -- Generar token de verificación
  v_verification_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_verification_token, 'sha256'), 'hex');
  
  INSERT INTO customer_email_verifications (customer_account_id, token_hash, expires_at)
  VALUES (v_account_id, v_token_hash, now() + interval '24 hours');
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'account_id', v_account_id,
    'customer_id', v_customer_id,
    'verification_token', v_verification_token
  );
END;
$function$;

-- Update generate_simple_hash to use extensions schema for potential future use
CREATE OR REPLACE FUNCTION public.generate_simple_hash(password text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions
AS $function$
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
$function$;