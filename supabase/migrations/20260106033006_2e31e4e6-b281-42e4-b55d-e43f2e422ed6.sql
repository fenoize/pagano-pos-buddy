-- Crear registros de pago pendiente para órdenes delivery entregadas que no tienen registro
INSERT INTO public.delivery_payments (order_id, delivery_person_id, base_amount, gross_amount, net_amount, status)
SELECT 
  o.id, 
  o.delivery_person_id, 
  COALESCE(o.delivery_payment_amount, o.delivery_fee, 0), 
  COALESCE(o.delivery_payment_amount, o.delivery_fee, 0), 
  COALESCE(o.delivery_payment_amount, o.delivery_fee, 0), 
  'pending'
FROM public.orders o
WHERE o.fulfillment = 'delivery'
  AND o.status = 'Entregado'
  AND o.delivery_person_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.delivery_payments dp WHERE dp.order_id = o.id)
ON CONFLICT DO NOTHING;