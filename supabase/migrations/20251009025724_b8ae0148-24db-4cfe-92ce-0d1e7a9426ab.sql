-- Eliminar política vieja que depende de app.user_id
DROP POLICY IF EXISTS "Cajero and Admin can create orders" ON orders;

-- Crear nueva política que valida directamente el created_by_user_id
CREATE POLICY "Staff can create orders" ON orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE u.id = created_by_user_id
      AND u.active = true
      AND ur.role IN ('Cajero', 'Administrador')
  )
);