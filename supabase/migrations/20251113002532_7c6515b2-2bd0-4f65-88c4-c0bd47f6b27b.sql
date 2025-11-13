-- Eliminar política RLS existente que depende del contexto
DROP POLICY IF EXISTS "Cajeros and admins can create movements" ON cash_movements;

-- Crear nueva política RLS más robusta que verifica directamente contra staff_sessions
CREATE POLICY "Cajeros and admins can create movements"
ON cash_movements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM cash_sessions cs
    JOIN staff_sessions ss ON ss.user_id = cs.user_id
    WHERE cs.id = cash_movements.session_id
      AND ss.is_active = true
      AND ss.expires_at > now()
      AND (
        has_role(cs.user_id, 'Cajero'::app_role) OR 
        has_role(cs.user_id, 'Administrador'::app_role)
      )
  )
);

COMMENT ON POLICY "Cajeros and admins can create movements" ON cash_movements IS 
'Permite crear movimientos de efectivo si existe una sesión activa de staff válida para el usuario dueño de la cash_session, y el usuario tiene rol de Cajero o Administrador';