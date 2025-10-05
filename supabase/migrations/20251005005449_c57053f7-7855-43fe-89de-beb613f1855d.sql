-- Corregir órdenes con datos de delivery pero marcadas como 'retiro'
UPDATE orders 
SET fulfillment = 'delivery' 
WHERE fulfillment = 'retiro' 
  AND delivery_address IS NOT NULL 
  AND delivery_address != '' 
  AND delivery_fee > 0;

-- Verificar cuántas órdenes se corrigieron
-- SELECT order_number, fulfillment, delivery_fee, delivery_address 
-- FROM orders 
-- WHERE delivery_address IS NOT NULL AND delivery_address != ''
-- ORDER BY order_number DESC;