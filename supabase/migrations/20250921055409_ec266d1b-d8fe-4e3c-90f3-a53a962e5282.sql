-- Agregar columna nombre_resumen para el nombre del pedido
ALTER TABLE public.orders 
ADD COLUMN nombre_resumen TEXT;