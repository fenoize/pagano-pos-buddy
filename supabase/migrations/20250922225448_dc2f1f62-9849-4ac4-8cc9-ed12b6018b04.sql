-- Limpiar funciones y políticas anteriores que no funcionan en web
DROP POLICY IF EXISTS "users_admin_select" ON public.users;
DROP POLICY IF EXISTS "users_admin_insert" ON public.users;
DROP POLICY IF EXISTS "users_admin_update" ON public.users;
DROP POLICY IF EXISTS "users_admin_delete" ON public.users;

DROP FUNCTION IF EXISTS app.set_user_context(UUID, TEXT);
DROP FUNCTION IF EXISTS app.current_user_id();
DROP FUNCTION IF EXISTS app.current_role();

-- Crear políticas RLS simples y públicas para la tabla users
-- Estas políticas permitirán acceso público a la tabla users
-- El control de acceso se manejará a nivel de aplicación

CREATE POLICY "Allow public read access to users" ON public.users
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to users" ON public.users
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to users" ON public.users
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete access to users" ON public.users
FOR DELETE 
USING (true);