-- ============================================
-- PORTAL CLIENTE - MIGRACIÓN COMPLETA
-- Seguridad mejorada con RLS, triggers y auth
-- ============================================

BEGIN;

-- ============================================
-- 1. EXTENSIONES Y TIPOS
-- ============================================

-- Email case-insensitive
CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================
-- 2. TABLAS DE AUTENTICACIÓN CLIENTE
-- ============================================

-- Cuenta de cliente (auth separada del POS)
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_email_lower 
ON public.customer_accounts (LOWER(email));

-- Tabla de tokens de verificación de email
CREATE TABLE IF NOT EXISTS public.customer_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token 
ON public.customer_email_verifications(token_hash) WHERE NOT used;

CREATE INDEX IF NOT EXISTS idx_email_verifications_expires 
ON public.customer_email_verifications(expires_at) WHERE NOT used;

-- Tabla de reset de password
CREATE TABLE IF NOT EXISTS public.customer_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_account_id UUID NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_hash 
ON public.customer_password_resets(code_hash) WHERE NOT used;

CREATE INDEX IF NOT EXISTS idx_password_resets_expires 
ON public.customer_password_resets(expires_at) WHERE NOT used;

CREATE INDEX IF NOT EXISTS idx_password_resets_ip 
ON public.customer_password_resets(ip_address, created_at);

-- ============================================
-- 3. AMPLIAR TABLA CUSTOMERS
-- ============================================

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.customer_accounts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS marketing_consent_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marketing_consent_source TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_account_id ON public.customers(account_id);

-- ============================================
-- 4. MEJORAR TABLA ADDRESSES
-- ============================================

-- Constraint única: solo una default por customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_customer_default 
ON public.addresses(customer_id) 
WHERE is_default = TRUE;

-- ============================================
-- 5. BADGES Y NIVELES
-- ============================================

-- Tabla de medallas
CREATE TABLE IF NOT EXISTS public.customer_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seeds de medallas (usando íconos Lucide)
INSERT INTO public.customer_badges (code, name, description, icon, category, sort_order) VALUES
  ('first_order', 'Primera Orden', 'Tu primer pedido en Paganos', 'Flame', 'inicio', 10),
  ('ten_orders', '10 Órdenes', 'Has realizado 10 pedidos', 'Award', 'frecuencia', 20),
  ('big_spender', 'Gran Gastador', 'Has gastado más de $100.000', 'TrendingUp', 'valor', 30),
  ('birthday_order', 'Cumpleañero Pagano', 'Pediste en tu cumpleaños', 'Cake', 'especial', 40),
  ('weekly_loyal', 'Devoto Semanal', 'Pedidos durante 4 semanas seguidas', 'Zap', 'lealtad', 50)
ON CONFLICT (code) DO NOTHING;

-- Relación de medallas otorgadas
CREATE TABLE IF NOT EXISTS public.customer_badges_awarded (
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.customer_badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, badge_id)
);

-- Vista de niveles (calculada por runas)
CREATE OR REPLACE VIEW public.customer_levels AS
SELECT 
  c.id AS customer_id,
  c.cantidad_runas,
  CASE 
    WHEN c.cantidad_runas >= 1200 THEN 'sabio'
    WHEN c.cantidad_runas >= 600 THEN 'guerrero'
    WHEN c.cantidad_runas >= 200 THEN 'devoto'
    ELSE 'iniciado'
  END AS level_code,
  CASE 
    WHEN c.cantidad_runas >= 1200 THEN 'Sabio'
    WHEN c.cantidad_runas >= 600 THEN 'Guerrero'
    WHEN c.cantidad_runas >= 200 THEN 'Devoto'
    ELSE 'Iniciado'
  END AS level_name,
  CASE 
    WHEN c.cantidad_runas >= 1200 THEN 1200
    WHEN c.cantidad_runas >= 600 THEN 600
    WHEN c.cantidad_runas >= 200 THEN 200
    ELSE 0
  END AS min_points,
  CASE 
    WHEN c.cantidad_runas >= 1200 THEN NULL
    WHEN c.cantidad_runas >= 600 THEN 1200
    WHEN c.cantidad_runas >= 200 THEN 600
    ELSE 200
  END AS next_level_points
FROM public.customers c;

-- ============================================
-- 6. ÍNDICES DE PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON public.orders(customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Trigger para asegurar una sola dirección default
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.addresses 
    SET is_default = FALSE 
    WHERE customer_id = NEW.customer_id 
      AND id != NEW.id 
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_ensure_single_default_address ON public.addresses;
CREATE TRIGGER trg_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_default_address();

-- Trigger para snapshot de comuna_name
CREATE OR REPLACE FUNCTION public.snapshot_comuna_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.comuna_id IS NOT NULL THEN
    SELECT name INTO NEW.comuna 
    FROM public.comunas 
    WHERE id = NEW.comuna_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_snapshot_comuna_name ON public.addresses;
CREATE TRIGGER trg_snapshot_comuna_name
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_comuna_name();

-- Trigger para logging de marketing consent
CREATE OR REPLACE FUNCTION public.log_marketing_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.marketing_opt_in = TRUE AND (OLD.marketing_opt_in IS NULL OR OLD.marketing_opt_in = FALSE) THEN
    NEW.marketing_consent_date := now();
    NEW.marketing_consent_source := 'portal_cliente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_marketing_consent ON public.customers;
CREATE TRIGGER trg_log_marketing_consent
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_marketing_consent_change();

-- Trigger para updated_at en customer_accounts
DROP TRIGGER IF EXISTS trg_customer_accounts_updated_at ON public.customer_accounts;
CREATE TRIGGER trg_customer_accounts_updated_at
  BEFORE UPDATE ON public.customer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_badges_awarded ENABLE ROW LEVEL SECURITY;

-- CUSTOMER ACCOUNTS
CREATE POLICY "Customers can view own account"
  ON public.customer_accounts FOR SELECT
  USING (id = current_setting('app.customer_account_id', true)::uuid);

CREATE POLICY "Customers can update own account"
  ON public.customer_accounts FOR UPDATE
  USING (id = current_setting('app.customer_account_id', true)::uuid)
  WITH CHECK (id = current_setting('app.customer_account_id', true)::uuid);

-- CUSTOMERS (perfil)
CREATE POLICY "Customers can view own profile"
  ON public.customers FOR SELECT
  USING (account_id = current_setting('app.customer_account_id', true)::uuid);

CREATE POLICY "Customers can update own profile"
  ON public.customers FOR UPDATE
  USING (account_id = current_setting('app.customer_account_id', true)::uuid)
  WITH CHECK (account_id = current_setting('app.customer_account_id', true)::uuid);

-- ADDRESSES
CREATE POLICY "Customers can view own addresses"
  ON public.addresses FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE account_id = current_setting('app.customer_account_id', true)::uuid
    )
  );

CREATE POLICY "Customers can insert own addresses"
  ON public.addresses FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE account_id = current_setting('app.customer_account_id', true)::uuid
    )
  );

CREATE POLICY "Customers can update own addresses"
  ON public.addresses FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE account_id = current_setting('app.customer_account_id', true)::uuid
    )
  );

CREATE POLICY "Customers can delete own addresses"
  ON public.addresses FOR DELETE
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE account_id = current_setting('app.customer_account_id', true)::uuid
    )
  );

-- ORDERS
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE account_id = current_setting('app.customer_account_id', true)::uuid
    )
  );

-- RUNAS TRANSACTIONS
CREATE POLICY "Customers can view own runas"
  ON public.runas_transactions FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE account_id = current_setting('app.customer_account_id', true)::uuid
    )
  );

-- BADGES
CREATE POLICY "Anyone can view active badges"
  ON public.customer_badges FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Customers can view own awarded badges"
  ON public.customer_badges_awarded FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM public.customers 
      WHERE account_id = current_setting('app.customer_account_id', true)::uuid
    )
  );

-- ============================================
-- 9. FUNCIONES DE AUTENTICACIÓN
-- ============================================

-- Función para setear contexto de cliente (middleware)
CREATE OR REPLACE FUNCTION public.set_customer_context(
  p_account_id UUID,
  p_customer_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.customer_account_id', p_account_id::text, false);
  PERFORM set_config('app.customer_id', p_customer_id::text, false);
END;
$$;

-- REGISTER CUSTOMER
CREATE OR REPLACE FUNCTION public.register_customer(
  p_email TEXT,
  p_password TEXT,
  p_nombres TEXT,
  p_apellidos TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_marketing_opt_in BOOLEAN DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- AUTHENTICATE CUSTOMER
CREATE OR REPLACE FUNCTION public.authenticate_customer(
  p_email TEXT,
  p_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account customer_accounts%ROWTYPE;
  v_customer customers%ROWTYPE;
  v_is_valid BOOLEAN;
BEGIN
  p_email := LOWER(TRIM(p_email));
  
  SELECT * INTO v_account FROM customer_accounts WHERE email = p_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'INVALID_CREDENTIALS');
  END IF;
  
  v_is_valid := public.verify_password(p_password, v_account.pass_hash);
  
  IF NOT v_is_valid THEN
    RETURN jsonb_build_object('error', 'INVALID_CREDENTIALS');
  END IF;
  
  SELECT * INTO v_customer FROM customers WHERE account_id = v_account.id;
  
  IF v_customer.estado_cliente != 'Activo' THEN
    RETURN jsonb_build_object('error', 'ACCOUNT_INACTIVE');
  END IF;
  
  UPDATE customer_accounts SET last_login = now() WHERE id = v_account.id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'account_id', v_account.id,
    'customer_id', v_customer.id,
    'email', v_account.email,
    'email_verified', v_account.email_verified,
    'name', v_customer.name,
    'phone', v_customer.phone
  );
END;
$$;

-- REQUEST PASSWORD RESET
CREATE OR REPLACE FUNCTION public.request_customer_password_reset(
  p_email TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_reset_code TEXT;
  v_code_hash TEXT;
  v_recent_attempts INT;
BEGIN
  p_email := LOWER(TRIM(p_email));
  
  -- Rate limiting: máximo 3 intentos en 15 minutos por IP
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_attempts
    FROM customer_password_resets
    WHERE ip_address = p_ip_address 
      AND created_at > now() - interval '15 minutes';
    
    IF v_recent_attempts >= 3 THEN
      RETURN jsonb_build_object('error', 'RATE_LIMIT_EXCEEDED');
    END IF;
  END IF;
  
  SELECT id INTO v_account_id FROM customer_accounts WHERE email = p_email;
  
  IF NOT FOUND THEN
    -- No revelar si el email existe
    RETURN jsonb_build_object('success', TRUE, 'message', 'Si el email existe, recibirás un código');
  END IF;
  
  -- Limpiar códigos viejos
  DELETE FROM customer_password_resets 
  WHERE customer_account_id = v_account_id 
    AND (used = TRUE OR expires_at < now());
  
  -- Generar código de 6 dígitos
  v_reset_code := LPAD(floor(random() * 1000000)::TEXT, 6, '0');
  v_code_hash := encode(digest(v_reset_code, 'sha256'), 'hex');
  
  INSERT INTO customer_password_resets (customer_account_id, code_hash, expires_at, ip_address)
  VALUES (v_account_id, v_code_hash, now() + interval '15 minutes', p_ip_address);
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'account_id', v_account_id,
    'code', v_reset_code
  );
END;
$$;

-- RESET PASSWORD
CREATE OR REPLACE FUNCTION public.reset_customer_password(
  p_email TEXT,
  p_code TEXT,
  p_new_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID;
  v_code_hash TEXT;
  v_new_hash TEXT;
BEGIN
  p_email := LOWER(TRIM(p_email));
  v_code_hash := encode(digest(p_code, 'sha256'), 'hex');
  
  SELECT ca.id INTO v_account_id
  FROM customer_accounts ca
  JOIN customer_password_resets cpr ON cpr.customer_account_id = ca.id
  WHERE ca.email = p_email
    AND cpr.code_hash = v_code_hash
    AND cpr.used = FALSE
    AND cpr.expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'INVALID_CODE');
  END IF;
  
  v_new_hash := public.generate_simple_hash(p_new_password);
  
  UPDATE customer_accounts SET pass_hash = v_new_hash, updated_at = now()
  WHERE id = v_account_id;
  
  UPDATE customer_password_resets SET used = TRUE
  WHERE customer_account_id = v_account_id AND code_hash = v_code_hash;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- VERIFY EMAIL
CREATE OR REPLACE FUNCTION public.verify_customer_email(
  p_token TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
  v_account_id UUID;
BEGIN
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
  
  SELECT customer_account_id INTO v_account_id
  FROM customer_email_verifications
  WHERE token_hash = v_token_hash
    AND used = FALSE
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'INVALID_TOKEN');
  END IF;
  
  UPDATE customer_accounts SET email_verified = TRUE WHERE id = v_account_id;
  UPDATE customer_email_verifications SET used = TRUE WHERE token_hash = v_token_hash;
  
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

COMMIT;