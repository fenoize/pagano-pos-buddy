-- Agregar columna para almacenar montos de pagos via aplicaciones (Uber, PedidosYa)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_aplicacion INTEGER DEFAULT 0;