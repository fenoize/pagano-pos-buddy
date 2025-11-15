-- Fix cash_movements RLS policies to work with the staff session system properly
-- Drop existing policies
DROP POLICY IF EXISTS "Staff autenticado puede ver movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff autenticado puede insertar movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff autenticado puede actualizar movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Solo Administradores pueden eliminar movimientos" ON public.cash_movements;

-- Create new policies that check for active staff sessions
CREATE POLICY "Active staff can view cash movements"
ON public.cash_movements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    WHERE ss.is_active = true
    AND ss.expires_at > now()
    AND ur.role IN ('Cajero', 'Administrador')
  )
);

CREATE POLICY "Active staff can insert cash movements"
ON public.cash_movements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    WHERE ss.is_active = true
    AND ss.expires_at > now()
    AND ur.role IN ('Cajero', 'Administrador')
  )
);

CREATE POLICY "Active staff can update cash movements"
ON public.cash_movements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    WHERE ss.is_active = true
    AND ss.expires_at > now()
    AND ur.role IN ('Cajero', 'Administrador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    WHERE ss.is_active = true
    AND ss.expires_at > now()
    AND ur.role IN ('Cajero', 'Administrador')
  )
);

CREATE POLICY "Only admins can delete cash movements"
ON public.cash_movements
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    WHERE ss.is_active = true
    AND ss.expires_at > now()
    AND ur.role = 'Administrador'
  )
);