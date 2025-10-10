-- Eliminar política actual que depende de contexto de sesión
DROP POLICY IF EXISTS "Staff can view own and admins view all sessions" ON cash_sessions;

-- Nueva política simple que permite lectura a todos
-- Las operaciones de escritura siguen protegidas por sus políticas específicas
CREATE POLICY "Staff can view all sessions"
ON cash_sessions FOR SELECT
USING (true);