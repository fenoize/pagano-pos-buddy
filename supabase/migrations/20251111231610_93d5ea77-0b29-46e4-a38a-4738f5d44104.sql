-- Agregar nuevo valor al enum order_status para órdenes pendientes de pago
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PendientePago' BEFORE 'Pendiente';

-- Comentario para documentación del flujo de estados
COMMENT ON TYPE order_status IS 'Estados de una orden: PendientePago (esperando confirmación de pago desde MercadoPago), Pendiente (en cola para cocina), En preparación, En pausa, Listo, Entregado, Cancelado';