BEGIN;

-- ========================================
-- FASE 1: HELPER FUNCTIONS Y JWT SYSTEM
-- ========================================

-- Helpers para leer claims del JWT
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT nullif(auth.jwt()->>'sub','')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_role() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT nullif(auth.jwt()->>'app_role','')::text
$$;

CREATE OR REPLACE FUNCTION app.current_branch_id() RETURNS bigint
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(auth.jwt()->>'branch_id','')::bigint
$$;

-- Instalar extensión pgjwt para firmar JWT desde BD
CREATE EXTENSION IF NOT EXISTS pgjwt;

-- Schema app si no existe
CREATE SCHEMA IF NOT EXISTS app;

-- Función que emite JWT con claims y expiración configurable
CREATE OR REPLACE FUNCTION app.issue_app_jwt(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role text;
  v_branch bigint := NULL; -- Preparado para futuro
  v_secret text := current_setting('app.jwt_secret', true);
  v_mapped_role text;
BEGIN
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'APP_JWT_SECRET not set (app.jwt_secret)';
  END IF;

  -- Obtener role del usuario
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id AND active = true;
  
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'User not found or inactive';
  END IF;

  -- Mapear roles existentes a roles de app
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

-- ========================================
-- FASE 2: REVOCAR PERMISOS Y ACTIVAR RLS
-- ========================================

-- Revocar todos los permisos públicos
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Habilitar RLS en tablas sensibles
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runas_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_audits         ENABLE ROW LEVEL SECURITY;

-- ========================================
-- FASE 3: VISTAS SEGURAS
-- ========================================

-- Vista de usuarios sin password hash
CREATE OR REPLACE VIEW public.app_public_users AS
SELECT id, username, full_name, email, role, active, created_at, updated_at
FROM public.users;

-- Vista de órdenes para cocina (sin PII de cliente)
CREATE OR REPLACE VIEW public.app_orders_kitchen AS
SELECT o.id, o.order_number, o.status, o.created_at, o.updated_at,
       o.fulfillment, o.items, o.total, o.notes, o.nombre_resumen
FROM public.orders o
WHERE app.current_role() = 'kitchen';

-- Vista de órdenes para delivery (PII mínimo necesario)
CREATE OR REPLACE VIEW public.app_orders_delivery AS
SELECT o.id, o.order_number, o.status, o.created_at, o.updated_at,
       o.fulfillment, o.total, o.delivery_address, o.delivery_comuna, o.delivery_number,
       c.name as customer_name, c.phone as customer_phone
FROM public.orders o
LEFT JOIN public.customers c ON c.id = o.customer_id
WHERE app.current_role() = 'delivery' AND o.fulfillment = 'delivery';

-- ========================================
-- FASE 4: POLÍTICAS RLS POR ROL
-- ========================================

-- USERS: Cerrar tabla, acceso controlado por funciones
DROP POLICY IF EXISTS "Allow public access for POS operations" ON public.users;
DROP POLICY IF EXISTS "Allow creating users" ON public.users;
DROP POLICY IF EXISTS "Allow reading users for authentication" ON public.users;
DROP POLICY IF EXISTS "Allow updating users" ON public.users;
DROP POLICY IF EXISTS "Allow deleting users" ON public.users;

-- Solo permitir actualización de propio perfil
CREATE POLICY users_update_self ON public.users
FOR UPDATE TO PUBLIC
USING (id = app.current_user_id())
WITH CHECK (id = app.current_user_id() AND app.current_role() IN ('admin', 'cashier', 'kitchen', 'delivery', 'viewer'));

-- Vista pública autenticada (no contiene hashes)
GRANT SELECT ON public.app_public_users TO PUBLIC;

-- CUSTOMERS: admin/cashier leer/escribir; otros roles sin acceso
DROP POLICY IF EXISTS "Allow public access for customers" ON public.customers;

CREATE POLICY customers_read ON public.customers
FOR SELECT TO PUBLIC
USING (
  app.current_role() IN ('admin','cashier')
  AND (
    -- Si existe branch_id, filtra; si no, ignora
    NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='customers' AND column_name='branch_id'
    )
    OR branch_id IS NULL
    OR branch_id = app.current_branch_id()
  )
);

CREATE POLICY customers_insert ON public.customers
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

CREATE POLICY customers_update ON public.customers
FOR UPDATE TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') )
WITH CHECK ( app.current_role() IN ('admin','cashier') );

-- ORDERS: admin/cashier acceso completo; kitchen/delivery vía vistas
DROP POLICY IF EXISTS "Allow public access for orders" ON public.orders;

CREATE POLICY orders_read ON public.orders
FOR SELECT TO PUBLIC
USING (
  app.current_role() IN ('admin','cashier')
  AND (
    NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name='orders' AND column_name='branch_id'
    )
    OR branch_id IS NULL
    OR branch_id = app.current_branch_id()
  )
);

CREATE POLICY orders_insert ON public.orders
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

CREATE POLICY orders_update ON public.orders
FOR UPDATE TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') )
WITH CHECK ( app.current_role() IN ('admin','cashier') );

-- Permisos sobre vistas para roles específicos
GRANT SELECT ON public.app_orders_kitchen TO PUBLIC;
GRANT SELECT ON public.app_orders_delivery TO PUBLIC;

-- CASH SESSIONS: admin ve todo, cashier solo sus propias sesiones
DROP POLICY IF EXISTS "Allow public access for POS operations" ON public.cash_sessions;

CREATE POLICY cash_sessions_read ON public.cash_sessions
FOR SELECT TO PUBLIC
USING (
  app.current_role() = 'admin'
  OR (app.current_role() = 'cashier' AND user_id = app.current_user_id())
);

CREATE POLICY cash_sessions_insert ON public.cash_sessions
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

CREATE POLICY cash_sessions_update ON public.cash_sessions
FOR UPDATE TO PUBLIC
USING ( 
  app.current_role() = 'admin' 
  OR (app.current_role() = 'cashier' AND user_id = app.current_user_id())
)
WITH CHECK ( 
  app.current_role() = 'admin' 
  OR (app.current_role() = 'cashier' AND user_id = app.current_user_id())
);

-- CASH MOVEMENTS: admin ve todo, cashier solo sus propias sesiones
DROP POLICY IF EXISTS "Allow public access for POS operations" ON public.cash_movements;

CREATE POLICY cash_movements_read ON public.cash_movements
FOR SELECT TO PUBLIC
USING (
  app.current_role() = 'admin'
  OR session_id IN (
    SELECT id FROM public.cash_sessions 
    WHERE user_id = app.current_user_id()
  )
);

CREATE POLICY cash_movements_insert ON public.cash_movements
FOR INSERT TO PUBLIC
WITH CHECK (
  app.current_role() IN ('admin','cashier')
  AND session_id IN (
    SELECT id FROM public.cash_sessions 
    WHERE user_id = app.current_user_id()
  )
);

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