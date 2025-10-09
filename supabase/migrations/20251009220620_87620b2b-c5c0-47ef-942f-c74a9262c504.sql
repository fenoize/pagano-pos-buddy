-- Actualizar roles de 'Caja' a 'Cajero' para consistencia con políticas RLS
UPDATE public.user_roles 
SET role = 'Cajero'::app_role 
WHERE role = 'Caja'::app_role;

UPDATE public.users 
SET role = 'Cajero'::app_role 
WHERE role = 'Caja'::app_role;