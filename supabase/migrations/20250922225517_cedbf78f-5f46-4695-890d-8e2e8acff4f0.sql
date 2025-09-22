-- Eliminar funciones con CASCADE para remover todas las dependencias
DROP FUNCTION IF EXISTS app.set_user_context(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS app.current_user_id() CASCADE;
DROP FUNCTION IF EXISTS app.current_role() CASCADE;

-- Crear políticas RLS simples y públicas para la tabla users
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

-- Recrear políticas básicas para cash_sessions (acceso público por ahora)
CREATE POLICY "cash_sessions_basic_access" ON public.cash_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Recrear políticas básicas para cash_movements (acceso público por ahora)  
CREATE POLICY "cash_movements_basic_access" ON public.cash_movements
FOR ALL
USING (true)
WITH CHECK (true);