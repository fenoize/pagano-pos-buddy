
-- Backfill: Crear delivery_payments para órdenes de delivery que faltan
-- Solo para órdenes con delivery_fee > 0, delivery_person_id asignado y status = 'Entregado'
INSERT INTO delivery_payments (
  order_id,
  delivery_person_id,
  base_amount,
  gross_amount,
  net_amount,
  status,
  created_at
)
SELECT 
  o.id AS order_id,
  o.delivery_person_id,
  o.delivery_fee AS base_amount,
  o.delivery_fee AS gross_amount,
  o.delivery_fee AS net_amount,
  'pending' AS status,
  COALESCE(o.delivery_delivered_at, o.created_at) AS created_at
FROM orders o
WHERE o.fulfillment = 'delivery'
  AND o.delivery_fee > 0
  AND o.delivery_person_id IS NOT NULL
  AND o.status = 'Entregado'
  AND NOT EXISTS (
    SELECT 1 FROM delivery_payments dp WHERE dp.order_id = o.id
  );
