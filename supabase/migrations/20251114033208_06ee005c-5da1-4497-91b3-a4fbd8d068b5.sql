
-- Eliminar todas las políticas duplicadas y antiguas de cash_movements
DROP POLICY IF EXISTS "Cajeros and admins can create movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Cajeros y Admins pueden insertar movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Cajeros y Admins pueden actualizar movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Only admins can update movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Only admins can delete movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Solo Admins pueden eliminar movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff activo puede ver movimientos de caja" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff can view movements" ON public.cash_movements;

-- Crear políticas nuevas y limpias que funcionen con el sistema de autenticación custom
-- Los Cajeros y Administradores pueden ver todos los movimientos de caja
CREATE POLICY "Staff puede ver movimientos"
ON public.cash_movements
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    JOIN public.users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > now()
      AND u.active = true
      AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Los Cajeros y Administradores pueden insertar movimientos de caja
CREATE POLICY "Staff puede insertar movimientos"
ON public.cash_movements
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    JOIN public.users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > now()
      AND u.active = true
      AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Los Cajeros y Administradores pueden actualizar movimientos de caja
CREATE POLICY "Staff puede actualizar movimientos"
ON public.cash_movements
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    JOIN public.users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > now()
      AND u.active = true
      AND ur.role IN ('Cajero', 'Administrador')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    JOIN public.users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > now()
      AND u.active = true
      AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Solo los Administradores pueden eliminar movimientos
CREATE POLICY "Solo Admins pueden eliminar movimientos"
ON public.cash_movements
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.staff_sessions ss
    JOIN public.user_roles ur ON ur.user_id = ss.user_id
    JOIN public.users u ON u.id = ss.user_id
    WHERE ss.is_active = true
      AND ss.expires_at > now()
      AND u.active = true
      AND ur.role = 'Administrador'
  )
);
