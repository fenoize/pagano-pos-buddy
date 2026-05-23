UPDATE public.orders
SET payment_efectivo = total
WHERE order_number = 2933
  AND payment_method = 'efectivo'
  AND payment_efectivo > total;