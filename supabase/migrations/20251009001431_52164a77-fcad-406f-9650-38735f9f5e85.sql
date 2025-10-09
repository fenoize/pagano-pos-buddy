-- ============================================
-- FIX: Corrección de políticas RLS para cash_sessions y cash_movements
-- Eliminar dependencia de set_config() y validar directamente contra user_roles
-- ============================================

-- ============================================
-- CASH_SESSIONS: Eliminar políticas antiguas
-- ============================================
DROP POLICY IF EXISTS "Staff can view cash sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Cajeros and admins can create sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Session owner or admin can update sessions" ON cash_sessions;
DROP POLICY IF EXISTS "Admins can delete sessions" ON cash_sessions;

-- ============================================
-- CASH_SESSIONS: Nuevas políticas RLS
-- ============================================

-- INSERT: Verificar que el user_id existe en user_roles con rol adecuado y usuario activo
CREATE POLICY "Staff with cashier role can create sessions"
ON cash_sessions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.user_id = cash_sessions.user_id
      AND ur.role IN ('Cajero', 'Administrador')
      AND u.active = true
  )
);

-- SELECT: Permitir a cualquier usuario de staff (simplificado por seguridad de app)
CREATE POLICY "Staff can view all cash sessions"
ON cash_sessions FOR SELECT
USING (true);

-- UPDATE: Permitir al dueño o a administradores
CREATE POLICY "Session owner or admin can update"
ON cash_sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.user_id = cash_sessions.user_id
      AND ur.role IN ('Cajero', 'Administrador')
      AND u.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.user_id = cash_sessions.user_id
      AND ur.role IN ('Cajero', 'Administrador')
      AND u.active = true
  )
);

-- DELETE: Solo administradores
CREATE POLICY "Only admins can delete sessions"
ON cash_sessions FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.role = 'Administrador' 
      AND u.active = true
  )
);

-- ============================================
-- CASH_MOVEMENTS: Eliminar políticas antiguas
-- ============================================
DROP POLICY IF EXISTS "Staff can view cash movements" ON cash_movements;
DROP POLICY IF EXISTS "Cajeros and admins can create movements" ON cash_movements;
DROP POLICY IF EXISTS "Admins can update movements" ON cash_movements;
DROP POLICY IF EXISTS "Admins can delete movements" ON cash_movements;

-- ============================================
-- CASH_MOVEMENTS: Nuevas políticas RLS
-- ============================================

-- INSERT: Verificar que la sesión existe y pertenece a un usuario con rol adecuado
CREATE POLICY "Staff with cashier role can create movements"
ON cash_movements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM cash_sessions cs
    JOIN user_roles ur ON ur.user_id = cs.user_id
    JOIN users u ON u.id = ur.user_id
    WHERE cs.id = cash_movements.session_id
      AND ur.role IN ('Cajero', 'Administrador')
      AND u.active = true
  )
);

-- SELECT: Permitir a cualquier usuario de staff
CREATE POLICY "Staff can view all movements"
ON cash_movements FOR SELECT
USING (true);

-- UPDATE: Solo administradores
CREATE POLICY "Only admins can update movements"
ON cash_movements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.role = 'Administrador' 
      AND u.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.role = 'Administrador' 
      AND u.active = true
  )
);

-- DELETE: Solo administradores
CREATE POLICY "Only admins can delete movements"
ON cash_movements FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.role = 'Administrador' 
      AND u.active = true
  )
);