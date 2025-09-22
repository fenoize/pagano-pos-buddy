BEGIN;

-- ========================================
-- FASE 1: HELPER FUNCTIONS Y JWT SYSTEM
-- ========================================

-- Schema app si no existe
CREATE SCHEMA IF NOT EXISTS app;

-- Helper para leer claims del JWT (en schema public)
CREATE OR REPLACE FUNCTION public.auth_jwt() RETURNS jsonb
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT nullif(public.auth_jwt()->>'sub','')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_role() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT nullif(public.auth_jwt()->>'app_role','')::text
$$;

CREATE OR REPLACE FUNCTION app.current_branch_id() RETURNS bigint
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(public.auth_jwt()->>'branch_id','')::bigint
$$;

-- Instalar extensión pgjwt para firmar JWT desde BD
CREATE EXTENSION IF NOT EXISTS pgjwt;

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

COMMIT;