-- Agregar "Aplicación" a los métodos de pago disponibles
UPDATE config 
SET value = '["Efectivo", "POS", "Transferencia", "Aplicación", "Runas"]'::jsonb,
    updated_at = now()
WHERE key = 'payment_methods';