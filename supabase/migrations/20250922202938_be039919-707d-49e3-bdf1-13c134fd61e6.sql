-- Crear funciones de contexto que funcionen sin JWT
-- Estas funciones obtendrán el usuario actual del sistema de autenticación interno

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID AS $$
DECLARE
  current_session_user UUID;
BEGIN
  -- Obtener el ID del usuario desde la configuración de la sesión
  -- Esto debe ser establecido por el sistema de autenticación al hacer login
  current_session_user := current_setting('app.current_user_id', true)::uuid;
  RETURN current_session_user;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, app;

CREATE OR REPLACE FUNCTION app.current_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obtener el rol del usuario desde la configuración de la sesión
  user_role := current_setting('app.current_role', true);
  RETURN user_role;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, app;

-- Función auxiliar para establecer el contexto del usuario
CREATE OR REPLACE FUNCTION app.set_user_context(user_id UUID, user_role TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
  PERFORM set_config('app.current_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, app;

-- Crear políticas RLS para la tabla users

-- Política para SELECT: Los administradores pueden ver todos los usuarios
CREATE POLICY "users_admin_select" ON public.users
FOR SELECT 
USING (
  app.current_role() = 'admin' OR 
  app.current_role() = 'Administrador'
);

-- Política para INSERT: Los administradores pueden crear usuarios
CREATE POLICY "users_admin_insert" ON public.users
FOR INSERT 
WITH CHECK (
  app.current_role() = 'admin' OR 
  app.current_role() = 'Administrador'
);

-- Política para UPDATE: Los administradores pueden actualizar cualquier usuario
CREATE POLICY "users_admin_update" ON public.users
FOR UPDATE 
USING (
  app.current_role() = 'admin' OR 
  app.current_role() = 'Administrador'
)
WITH CHECK (
  app.current_role() = 'admin' OR 
  app.current_role() = 'Administrador'
);

-- Política para DELETE: Los administradores pueden eliminar usuarios
CREATE POLICY "users_admin_delete" ON public.users
FOR DELETE 
USING (
  app.current_role() = 'admin' OR 
  app.current_role() = 'Administrador'
);