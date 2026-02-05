-- Agregar nuevo estado 'PendienteAceptacion' al enum order_status
-- Este estado se usa cuando un pedido de la app es pagado pero espera aceptación del cajero
ALTER TYPE order_status ADD VALUE 'PendienteAceptacion' AFTER 'PendientePago';