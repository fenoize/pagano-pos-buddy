-- Corregir pedidos existentes con payment_method = 'pendiente' que incorrectamente tienen payment_status = 'paid'
UPDATE orders 
SET payment_status = 'unpaid' 
WHERE payment_method = 'pendiente' 
  AND payment_status = 'paid'
  AND status NOT IN ('Cancelado', 'Entregado');