
-- Políticas RLS para cash_movements
-- Permitir a staff activo ver movimientos de caja
CREATE POLICY "Staff activo puede ver movimientos de caja"
ON public.cash_movements
FOR SELECT
TO authenticated
USING (public.is_active_staff());

-- Permitir a Cajeros y Administradores insertar movimientos
CREATE POLICY "Cajeros y Admins pueden insertar movimientos"
ON public.cash_movements
FOR INSERT
TO authenticated
WITH CHECK (public.is_cashier_or_admin());

-- Permitir a Cajeros y Administradores actualizar movimientos
CREATE POLICY "Cajeros y Admins pueden actualizar movimientos"
ON public.cash_movements
FOR UPDATE
TO authenticated
USING (public.is_cashier_or_admin())
WITH CHECK (public.is_cashier_or_admin());

-- Permitir solo a Administradores eliminar movimientos
CREATE POLICY "Solo Admins pueden eliminar movimientos"
ON public.cash_movements
FOR DELETE
TO authenticated
USING (public.is_active_admin());
