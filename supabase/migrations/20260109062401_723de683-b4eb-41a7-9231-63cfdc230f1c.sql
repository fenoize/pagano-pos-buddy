-- Eliminar políticas existentes
DROP POLICY IF EXISTS "tv_screen_content_insert" ON public.tv_screen_content;
DROP POLICY IF EXISTS "tv_screen_content_update" ON public.tv_screen_content;
DROP POLICY IF EXISTS "tv_screen_content_delete" ON public.tv_screen_content;

-- Crear políticas más permisivas para staff
-- Insert: cualquier usuario con contexto de staff o auth
CREATE POLICY "tv_screen_content_insert" ON public.tv_screen_content
  FOR INSERT WITH CHECK (
    current_setting('app.current_user_id', true) IS NOT NULL 
    AND current_setting('app.current_user_id', true) != ''
  );

-- Update: cualquier usuario con contexto de staff
CREATE POLICY "tv_screen_content_update" ON public.tv_screen_content
  FOR UPDATE USING (
    current_setting('app.current_user_id', true) IS NOT NULL 
    AND current_setting('app.current_user_id', true) != ''
  );

-- Delete: cualquier usuario con contexto de staff
CREATE POLICY "tv_screen_content_delete" ON public.tv_screen_content
  FOR DELETE USING (
    current_setting('app.current_user_id', true) IS NOT NULL 
    AND current_setting('app.current_user_id', true) != ''
  );