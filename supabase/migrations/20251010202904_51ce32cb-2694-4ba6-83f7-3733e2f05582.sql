-- Eliminar política actual que causaba problemas de acceso
DROP POLICY IF EXISTS "Staff can view all sessions" ON cash_sessions;

-- Nueva política más específica y permisiva
-- Permite ver tus propias sesiones O todas si eres admin
CREATE POLICY "Staff can view own and admins view all sessions"
ON cash_sessions FOR SELECT
USING (
  -- El usuario puede ver sus propias sesiones
  user_id = get_current_staff_user_id()
  -- O es administrador activo (puede ver todas las sesiones)
  OR is_active_admin()
);