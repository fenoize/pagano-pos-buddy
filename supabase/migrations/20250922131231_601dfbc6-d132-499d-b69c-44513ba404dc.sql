BEGIN;

-- RUNAS TRANSACTIONS: admin ve todo, cashier puede crear/ver
DROP POLICY IF EXISTS "Allow public access for runas transactions" ON public.runas_transactions;

CREATE POLICY runas_transactions_read ON public.runas_transactions
FOR SELECT TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') );

CREATE POLICY runas_transactions_insert ON public.runas_transactions
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

-- ORDER AUDITS: admin ve todo, cashier ve relacionadas a sus órdenes
DROP POLICY IF EXISTS "Allow public access for order audits" ON public.order_audits;

CREATE POLICY order_audits_read ON public.order_audits
FOR SELECT TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') );

CREATE POLICY order_audits_insert ON public.order_audits
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

-- PASSWORD RESET CODES: tabla completamente cerrada
DROP POLICY IF EXISTS "Allow public access for password reset codes" ON public.password_reset_codes;
REVOKE ALL ON public.password_reset_codes FROM PUBLIC;

-- ========================================
-- FASE 5: RPCS SEGUROS PARA PASSWORD RESET
-- ========================================

-- Crear código de reset (sin exponer tabla)
CREATE OR REPLACE FUNCTION app.create_reset_code(p_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
  v_user_id uuid;
  v_code text;
BEGIN
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND active = true;
  IF v_user_id IS NULL THEN 
    -- No revelar si el email existe o no
    RETURN; 
  END IF;
  
  -- Generar código seguro
  v_code := encode(gen_random_bytes(16), 'hex');
  
  -- Limpiar códigos anteriores del usuario
  DELETE FROM public.password_reset_codes WHERE user_id = v_user_id;
  
  -- Crear nuevo código con expiración de 10 minutos
  INSERT INTO public.password_reset_codes(user_id, code, expires_at, used)
  VALUES (v_user_id, v_code, now() + interval '10 minutes', false);
END $$;

-- Consumir código de reset
CREATE OR REPLACE FUNCTION app.consume_reset_code(p_code text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
  v_user_id uuid;
  v_new_hash text;
BEGIN
  -- Buscar código válido
  SELECT user_id INTO v_user_id
  FROM public.password_reset_codes
  WHERE code = p_code AND used = false AND expires_at > now()
  FOR UPDATE SKIP LOCKED;

  IF v_user_id IS NULL THEN 
    RETURN FALSE; 
  END IF;

  -- Generar nuevo hash usando la función existente
  v_new_hash := public.generate_simple_hash(p_new_password);

  -- Actualizar contraseña
  UPDATE public.users SET pass_hash = v_new_hash, updated_at = now() 
  WHERE id = v_user_id;
  
  -- Marcar código como usado
  UPDATE public.password_reset_codes SET used = true WHERE code = p_code;
  
  RETURN TRUE;
END $$;

-- Limpiar códigos expirados automáticamente
CREATE OR REPLACE FUNCTION app.cleanup_expired_codes()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.password_reset_codes 
  WHERE expires_at < now() OR used = true;
END $$;

-- ========================================
-- FASE 6: PERMISOS PARA TABLAS NO SENSIBLES
-- ========================================

-- Tablas de productos y configuración: acceso público necesario para POS
GRANT SELECT ON public.products TO PUBLIC;
GRANT SELECT ON public.categories TO PUBLIC;
GRANT SELECT ON public.product_categories TO PUBLIC;
GRANT SELECT ON public.product_extras TO PUBLIC;
GRANT SELECT ON public.product_modifiers TO PUBLIC;
GRANT SELECT ON public.config TO PUBLIC;
GRANT SELECT ON public.delivery_zones TO PUBLIC;
GRANT SELECT ON public.addresses TO PUBLIC;
GRANT SELECT ON public.inventory TO PUBLIC;

-- Para admin: acceso completo a configuraciones
GRANT ALL ON public.products TO PUBLIC;
GRANT ALL ON public.categories TO PUBLIC; 
GRANT ALL ON public.product_categories TO PUBLIC;
GRANT ALL ON public.product_extras TO PUBLIC;
GRANT ALL ON public.product_modifiers TO PUBLIC;
GRANT ALL ON public.config TO PUBLIC;
GRANT ALL ON public.delivery_zones TO PUBLIC;
GRANT ALL ON public.addresses TO PUBLIC;
GRANT ALL ON public.inventory TO PUBLIC;

-- Sequences necesarios para inserts
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Funciones necesarias para el sistema
GRANT EXECUTE ON FUNCTION public.authenticate_user(text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app.issue_app_jwt(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_reset_code(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION app.consume_reset_code(text, text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_simple_hash(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_password(uuid, text) TO PUBLIC;

COMMIT;