-- Modificar la restricción de clave foránea para permitir eliminación de clientes
-- pero preservar datos históricos en órdenes

-- Primero, eliminar la restricción existente
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

-- Recrear la restricción con ON DELETE SET NULL para preservar datos históricos
ALTER TABLE public.orders 
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.customers(id) 
ON DELETE SET NULL;