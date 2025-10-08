-- Agregar campo can_do_delivery a la tabla users
ALTER TABLE public.users 
ADD COLUMN can_do_delivery boolean NOT NULL DEFAULT false;

-- Actualizar usuarios con rol Reparto para que tengan el permiso por defecto
UPDATE public.users 
SET can_do_delivery = true 
WHERE role = 'Reparto';