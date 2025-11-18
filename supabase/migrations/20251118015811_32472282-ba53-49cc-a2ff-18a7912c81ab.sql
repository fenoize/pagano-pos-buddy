-- ========================================
-- MIGRACIÓN: Módulo de Delivery para Repartidores
-- ========================================

-- 1. Extender enum order_status con "En camino"
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'En camino';

-- 2. Agregar campos de tracking de delivery a la tabla orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS delivery_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_delivered_at timestamptz;

-- 3. Crear tabla de configuración de delivery
CREATE TABLE IF NOT EXISTS delivery_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_mode text NOT NULL DEFAULT 'assigned' CHECK (assignment_mode IN ('assigned', 'pool')),
  map_provider text NOT NULL DEFAULT 'google_maps' CHECK (map_provider IN ('google_maps', 'waze')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto si no existe
INSERT INTO delivery_settings (assignment_mode, map_provider)
SELECT 'assigned', 'google_maps'
WHERE NOT EXISTS (SELECT 1 FROM delivery_settings LIMIT 1);

-- 4. Trigger para actualizar updated_at en delivery_settings
CREATE OR REPLACE FUNCTION update_delivery_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_delivery_settings_timestamp ON delivery_settings;
CREATE TRIGGER trigger_update_delivery_settings_timestamp
  BEFORE UPDATE ON delivery_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_settings_timestamp();

-- 5. RLS Policies para delivery_settings

ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

-- Los administradores pueden ver y editar la configuración
CREATE POLICY "Admins can manage delivery settings"
  ON delivery_settings
  FOR ALL
  USING (is_staff_admin())
  WITH CHECK (is_staff_admin());

-- Repartidores y staff pueden ver la configuración (lectura solamente)
CREATE POLICY "Staff can view delivery settings"
  ON delivery_settings
  FOR SELECT
  USING (is_active_staff());

-- 6. Función auxiliar para verificar si un usuario es repartidor
CREATE OR REPLACE FUNCTION is_delivery_courier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = get_user_id_from_current_session()
      AND ur.role IN ('Reparto', 'Administrador')
  );
$$;

-- 7. Vista auxiliar para pedidos de delivery (para repartidores)
CREATE OR REPLACE VIEW delivery_orders AS
SELECT 
  o.id,
  o.order_number,
  o.customer_id,
  o.fulfillment,
  o.items,
  o.subtotal,
  o.delivery_fee,
  o.discount,
  o.total,
  o.payment_method,
  o.status,
  o.created_at,
  o.updated_at,
  o.delivery_zone_id,
  o.delivery_zone_name,
  o.delivery_address,
  o.delivery_number,
  o.delivery_comuna_id,
  o.delivery_comuna,
  o.delivery_reference,
  o.delivery_person_id,
  o.delivery_person_name,
  o.delivery_distance,
  o.delivery_assigned_at,
  o.delivery_delivered_at,
  o.notes,
  o.nombre_resumen,
  c.name as customer_name,
  c.phone as customer_phone,
  EXTRACT(EPOCH FROM (NOW() - o.created_at))/60 as minutes_since_created
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE o.fulfillment = 'delivery'
  AND o.status NOT IN ('Cancelado', 'Entregado');

-- 8. RLS Policies para la vista delivery_orders
ALTER VIEW delivery_orders SET (security_invoker = on);

-- 9. Índices para mejorar performance en queries de delivery
CREATE INDEX IF NOT EXISTS idx_orders_delivery_person_status 
  ON orders(delivery_person_id, status) 
  WHERE fulfillment = 'delivery';

CREATE INDEX IF NOT EXISTS idx_orders_delivery_dates 
  ON orders(delivery_assigned_at, delivery_delivered_at) 
  WHERE fulfillment = 'delivery';

-- 10. Comentarios para documentación
COMMENT ON COLUMN orders.delivery_assigned_at IS 'Timestamp cuando se asignó el pedido al repartidor o este lo tomó';
COMMENT ON COLUMN orders.delivery_delivered_at IS 'Timestamp cuando el repartidor marcó el pedido como entregado';
COMMENT ON TABLE delivery_settings IS 'Configuración del módulo de delivery para repartidores';
COMMENT ON COLUMN delivery_settings.assignment_mode IS 'Modo de asignación: assigned (asignados) o pool (disponibles para todos)';
COMMENT ON COLUMN delivery_settings.map_provider IS 'Proveedor de mapas: google_maps o waze';