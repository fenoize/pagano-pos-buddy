
-- Asignar pedidos 1428-1437 al turno activo de Diego
UPDATE orders 
SET cash_session_id = '429806fe-d87d-4239-b210-c9dc5e86f02c'
WHERE order_number BETWEEN 1428 AND 1437
  AND cash_session_id IS NULL;
