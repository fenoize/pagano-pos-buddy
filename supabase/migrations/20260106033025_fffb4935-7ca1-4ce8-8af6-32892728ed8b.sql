-- Actualizar montos de pagos pendientes donde base_amount es 0 pero la orden tiene delivery_fee
UPDATE public.delivery_payments dp
SET 
  base_amount = o.delivery_fee,
  gross_amount = o.delivery_fee,
  net_amount = o.delivery_fee
FROM public.orders o
WHERE dp.order_id = o.id
  AND dp.base_amount = 0
  AND o.delivery_fee > 0
  AND dp.status = 'pending';