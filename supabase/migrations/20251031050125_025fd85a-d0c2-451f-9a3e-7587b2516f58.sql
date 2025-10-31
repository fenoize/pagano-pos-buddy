-- Arreglar vistas con SECURITY DEFINER
-- Convertir a SECURITY INVOKER para respetar RLS del usuario consultante

-- 1. app_orders_delivery - Vista de órdenes de delivery
DROP VIEW IF EXISTS app_orders_delivery CASCADE;

CREATE VIEW app_orders_delivery 
WITH (security_invoker=true) AS
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.created_at,
  o.updated_at,
  o.fulfillment,
  o.total,
  o.delivery_address,
  o.delivery_comuna,
  o.delivery_number,
  c.name AS customer_name,
  c.phone AS customer_phone
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE o.fulfillment = 'delivery';

-- 2. app_orders_kitchen - Vista de órdenes para cocina
DROP VIEW IF EXISTS app_orders_kitchen CASCADE;

CREATE VIEW app_orders_kitchen 
WITH (security_invoker=true) AS
SELECT 
  id,
  order_number,
  status,
  created_at,
  updated_at,
  fulfillment,
  items,
  total,
  notes,
  nombre_resumen
FROM orders o;

-- 3. customer_levels - Vista de niveles de clientes
DROP VIEW IF EXISTS customer_levels CASCADE;

CREATE VIEW customer_levels 
WITH (security_invoker=true) AS
SELECT 
  c.id AS customer_id,
  c.cantidad_runas,
  cld.level_code,
  cld.level_name,
  cld.min_points,
  next_level.min_points AS next_level_points,
  next_level.level_name AS next_level_name,
  cld.icon,
  cld.color,
  cld.benefits
FROM customers c
CROSS JOIN LATERAL (
  SELECT *
  FROM customer_level_definitions
  WHERE c.cantidad_runas >= min_points 
    AND (max_points IS NULL OR c.cantidad_runas <= max_points)
    AND is_active = true
  ORDER BY level_order DESC
  LIMIT 1
) cld
LEFT JOIN LATERAL (
  SELECT *
  FROM customer_level_definitions
  WHERE min_points > c.cantidad_runas
    AND is_active = true
  ORDER BY level_order
  LIMIT 1
) next_level ON true;

-- 4. debug_policies - Vista de depuración de políticas
DROP VIEW IF EXISTS debug_policies CASCADE;

CREATE VIEW debug_policies 
WITH (security_invoker=true) AS
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual AS qual_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('customers', 'orders')
ORDER BY tablename, cmd, policyname;

-- 5. delivery_export_v - Vista de exportación de deliveries
DROP VIEW IF EXISTS delivery_export_v CASCADE;

CREATE VIEW delivery_export_v 
WITH (security_invoker=true) AS
SELECT 
  id AS order_id,
  order_number::text AS order_number,
  (created_at AT TIME ZONE 'America/Santiago') AS created_at_cl,
  TRIM(BOTH FROM CONCAT(
    COALESCE(delivery_address, ''), 
    ' ', 
    COALESCE(delivery_number, ''), 
    ', ', 
    COALESCE(delivery_comuna, '')
  )) AS direccion_completa,
  COALESCE(delivery_fee, 0) AS monto_delivery
FROM orders o
WHERE fulfillment = 'delivery' 
  AND status != 'Cancelado';