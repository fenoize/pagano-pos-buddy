-- Insertar registros de delivery_payments para órdenes de delivery que no tienen registro
-- Esto asegura que todos los deliverys aparezcan en Finanzas > Delivery

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
  o.id as order_id,
  o.delivery_person_id,
  o.delivery_fee as base_amount,
  o.delivery_fee as gross_amount,
  o.delivery_fee as net_amount,
  'pending' as status,
  o.created_at
FROM orders o
WHERE o.delivery_fee > 0
  AND o.delivery_person_id IS NOT NULL
  AND o.status IN ('Entregado', 'Listo')
  AND NOT EXISTS (
    SELECT 1 FROM delivery_payments dp WHERE dp.order_id = o.id
  );