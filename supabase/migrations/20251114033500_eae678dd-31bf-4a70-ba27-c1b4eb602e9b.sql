
-- Eliminar políticas anteriores que no funcionan
DROP POLICY IF EXISTS "Staff puede ver movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff puede insertar movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Staff puede actualizar movimientos" ON public.cash_movements;
DROP POLICY IF EXISTS "Solo Admins pueden eliminar movimientos" ON public.cash_movements;

-- Crear políticas que usan la función que lee el token del header
-- Staff puede ver movimientos si tiene sesión activa (verificada por token)
CREATE POLICY "Staff autenticado puede ver movimientos"
ON public.cash_movements
FOR SELECT
TO public
USING (
  public.get_current_staff_user_from_token() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = public.get_current_staff_user_from_token()
      AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Cajeros y Administradores pueden insertar movimientos
CREATE POLICY "Staff autenticado puede insertar movimientos"
ON public.cash_movements
FOR INSERT
TO public
WITH CHECK (
  public.get_current_staff_user_from_token() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = public.get_current_staff_user_from_token()
      AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Cajeros y Administradores pueden actualizar movimientos
CREATE POLICY "Staff autenticado puede actualizar movimientos"
ON public.cash_movements
FOR UPDATE
TO public
USING (
  public.get_current_staff_user_from_token() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = public.get_current_staff_user_from_token()
      AND ur.role IN ('Cajero', 'Administrador')
  )
)
WITH CHECK (
  public.get_current_staff_user_from_token() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = public.get_current_staff_user_from_token()
      AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Solo Administradores pueden eliminar movimientos
CREATE POLICY "Solo Administradores pueden eliminar movimientos"
ON public.cash_movements
FOR DELETE
TO public
USING (
  public.get_current_staff_user_from_token() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = public.get_current_staff_user_from_token()
      AND ur.role = 'Administrador'
  )
);
