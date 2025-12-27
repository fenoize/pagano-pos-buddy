-- Corrección de datos para cliente nveravalverde@gmail.com
-- Customer ID: d5c09283-bc67-4e16-a699-fc9eece6c286
-- Order ID: 0da2ba75-8591-4abe-92a6-8b293cdb292c (Pedido #1017)

-- 1. Insertar la transacción de canje faltante (40 runas = $24,000 en descuento)
-- El subtotal era $23,580 por lo que debían ser 40 runas (23580/600 = 39.3 → 40)
INSERT INTO runas_transactions (
  customer_id, 
  type, 
  runas, 
  amount, 
  origen, 
  order_id, 
  motivo
)
VALUES (
  'd5c09283-bc67-4e16-a699-fc9eece6c286', 
  'canje', 
  -40,  -- Negativo porque se descuentan
  23580, 
  'Web', 
  '0da2ba75-8591-4abe-92a6-8b293cdb292c', 
  'Corrección manual - Pago de pedido #1017 con runas'
);

-- 2. Actualizar el saldo del cliente (50 - 40 = 10 runas)
UPDATE customers 
SET cantidad_runas = 10
WHERE id = 'd5c09283-bc67-4e16-a699-fc9eece6c286';

-- 3. Corregir la orden #1017 con los valores correctos
-- discount y payment_runas deben reflejar el monto real pagado con runas
UPDATE orders
SET 
  discount = 23580,
  payment_runas = 23580,
  total = 0  -- subtotal - discount = 23580 - 23580 = 0 (pago completo con runas)
WHERE id = '0da2ba75-8591-4abe-92a6-8b293cdb292c';