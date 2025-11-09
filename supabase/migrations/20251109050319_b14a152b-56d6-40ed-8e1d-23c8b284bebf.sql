-- ============================================
-- FASE 1: BASE DE DATOS - PEDIDOS DESDE APP
-- ============================================

-- 1. AGREGAR CAMPOS A TABLAS EXISTENTES
-- --------------------------------------------

-- Productos: marcar cuáles se muestran en la app cliente
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS show_in_app BOOLEAN DEFAULT false;

-- Turnos/Cajas: switch para aceptar pedidos desde app
ALTER TABLE cash_sessions 
ADD COLUMN IF NOT EXISTS accept_app_orders BOOLEAN DEFAULT false;

-- Órdenes: identificar el origen (POS vs App Cliente)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'pos' CHECK (source IN ('pos', 'customer_app'));

-- 2. CREAR TABLA DE CONFIGURACIÓN ONLINE
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS online_order_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_orders_enabled BOOLEAN NOT NULL DEFAULT false,
  app_pickup_enabled BOOLEAN NOT NULL DEFAULT true,
  app_delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  mp_enabled BOOLEAN NOT NULL DEFAULT false,
  mp_mode TEXT NOT NULL DEFAULT 'sandbox' CHECK (mp_mode IN ('sandbox', 'production')),
  mp_public_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para online_order_settings
ALTER TABLE online_order_settings ENABLE ROW LEVEL SECURITY;

-- Staff puede ver y modificar configuración
CREATE POLICY "Staff can view online settings"
  ON online_order_settings FOR SELECT
  TO public
  USING (is_active_staff_with_token());

CREATE POLICY "Staff can update online settings"
  ON online_order_settings FOR UPDATE
  TO public
  USING (is_active_staff_with_token())
  WITH CHECK (is_active_staff_with_token());

CREATE POLICY "Staff can insert online settings"
  ON online_order_settings FOR INSERT
  TO public
  WITH CHECK (is_active_staff_with_token());

-- Clientes autenticados pueden leer configuración (para saber si pueden ordenar)
CREATE POLICY "Customers can view online settings"
  ON online_order_settings FOR SELECT
  TO public
  USING (auth.uid() IS NOT NULL);

-- Insertar configuración inicial
INSERT INTO online_order_settings (
  app_orders_enabled,
  app_pickup_enabled,
  app_delivery_enabled,
  mp_enabled,
  mp_mode
) VALUES (
  false, -- Desactivado por defecto
  true,  -- Retiro habilitado
  false, -- Delivery deshabilitado por ahora
  false, -- MercadoPago desactivado hasta configurar
  'sandbox'
) ON CONFLICT DO NOTHING;

-- 3. CREAR TABLA DE PROMOCIONES
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  button_text TEXT DEFAULT 'Ver más',
  button_link TEXT DEFAULT '/menu',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para promotions
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver promociones activas
CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  TO public
  USING (is_active = true);

-- Staff puede administrar promociones
CREATE POLICY "Staff can manage promotions"
  ON promotions FOR ALL
  TO public
  USING (is_active_staff_with_token())
  WITH CHECK (is_active_staff_with_token());

-- Insertar promoción inicial de ejemplo
INSERT INTO promotions (
  title,
  subtitle,
  image_url,
  button_text,
  button_link,
  is_active,
  display_order
) VALUES (
  '¡Bienvenido a Paganos Burger!',
  'Descubre nuestras hamburguesas artesanales y pide online',
  null,
  'Ver Menú',
  '/menu',
  true,
  0
) ON CONFLICT DO NOTHING;

-- 4. CREAR RPC FUNCTION: get_store_status
-- --------------------------------------------
CREATE OR REPLACE FUNCTION get_store_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_active_session RECORD;
  v_is_open BOOLEAN := false;
  v_accept_app_orders BOOLEAN := false;
BEGIN
  -- Obtener configuración global
  SELECT * INTO v_config 
  FROM online_order_settings 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Si no existe configuración, retornar todo cerrado
  IF v_config IS NULL THEN
    RETURN jsonb_build_object(
      'is_open', false,
      'app_orders_enabled', false,
      'app_pickup_enabled', false,
      'app_delivery_enabled', false,
      'accept_app_orders', false,
      'message', 'Sistema no configurado'
    );
  END IF;
  
  -- Buscar turno activo que acepte pedidos de app
  SELECT * INTO v_active_session 
  FROM cash_sessions
  WHERE closed_at IS NULL 
  ORDER BY opened_at DESC
  LIMIT 1;
  
  -- Determinar si está abierto
  IF v_active_session.id IS NOT NULL THEN
    v_is_open := true;
    v_accept_app_orders := COALESCE(v_active_session.accept_app_orders, false);
  END IF;
  
  -- Construir respuesta
  RETURN jsonb_build_object(
    'is_open', v_is_open,
    'app_orders_enabled', COALESCE(v_config.app_orders_enabled, false),
    'app_pickup_enabled', COALESCE(v_config.app_pickup_enabled, false),
    'app_delivery_enabled', COALESCE(v_config.app_delivery_enabled, false),
    'accept_app_orders', v_accept_app_orders,
    'mp_enabled', COALESCE(v_config.mp_enabled, false),
    'mp_mode', COALESCE(v_config.mp_mode, 'sandbox'),
    'mp_public_key', v_config.mp_public_key,
    'message', CASE
      WHEN NOT COALESCE(v_config.app_orders_enabled, false) THEN 'Pedidos desde app desactivados'
      WHEN NOT v_is_open THEN 'No hay turno activo'
      WHEN NOT v_accept_app_orders THEN 'El local no está recibiendo pedidos desde la app'
      ELSE 'Abierto y recibiendo pedidos'
    END
  );
END;
$$;

-- Permitir que cualquier usuario autenticado consulte el estado
GRANT EXECUTE ON FUNCTION get_store_status() TO authenticated, anon;

-- 5. TRIGGER PARA ACTUALIZAR updated_at
-- --------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a online_order_settings
DROP TRIGGER IF EXISTS update_online_order_settings_updated_at ON online_order_settings;
CREATE TRIGGER update_online_order_settings_updated_at
  BEFORE UPDATE ON online_order_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a promotions
DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. ÍNDICES PARA PERFORMANCE
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_show_in_app ON products(show_in_app) WHERE show_in_app = true;
CREATE INDEX IF NOT EXISTS idx_cash_sessions_accept_app_orders ON cash_sessions(accept_app_orders, closed_at);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active, display_order) WHERE is_active = true;

-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- --------------------------------------------
COMMENT ON COLUMN products.show_in_app IS 'Indica si el producto debe mostrarse en la app cliente';
COMMENT ON COLUMN cash_sessions.accept_app_orders IS 'Switch para activar/desactivar pedidos desde la app durante el turno';
COMMENT ON COLUMN orders.source IS 'Origen de la orden: pos (POS local) o customer_app (App cliente)';
COMMENT ON TABLE online_order_settings IS 'Configuración global para pedidos desde la app cliente';
COMMENT ON TABLE promotions IS 'Promociones destacadas para mostrar en el home de la app cliente';
COMMENT ON FUNCTION get_store_status() IS 'Devuelve el estado actual del local para pedidos desde app (abierto, config, etc)';