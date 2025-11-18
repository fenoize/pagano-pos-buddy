-- Corregir warnings de seguridad de la migración anterior

-- 1. Eliminar la vista problemática y no usar security_invoker
DROP VIEW IF EXISTS delivery_orders;

-- 2. Recrear vista sin security_invoker (usaremos RLS en la tabla base)
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