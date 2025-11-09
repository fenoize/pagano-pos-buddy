-- Crear políticas RLS para marketing_app_promotions
-- Permitir a staff activo realizar todas las operaciones

-- Policy para SELECT: staff activo puede ver todas las promociones
CREATE POLICY "Staff can view all promotions"
ON public.marketing_app_promotions
FOR SELECT
TO public
USING (public.is_active_staff());

-- Policy para INSERT: staff activo puede crear promociones
CREATE POLICY "Staff can create promotions"
ON public.marketing_app_promotions
FOR INSERT
TO public
WITH CHECK (public.is_active_staff());

-- Policy para UPDATE: staff activo puede actualizar promociones
CREATE POLICY "Staff can update promotions"
ON public.marketing_app_promotions
FOR UPDATE
TO public
USING (public.is_active_staff())
WITH CHECK (public.is_active_staff());

-- Policy para DELETE: solo administradores pueden eliminar
CREATE POLICY "Admins can delete promotions"
ON public.marketing_app_promotions
FOR DELETE
TO public
USING (public.is_active_admin());

-- Policy adicional para clientes: pueden ver promociones activas y válidas (sin autenticación)
CREATE POLICY "Public can view active promotions"
ON public.marketing_app_promotions
FOR SELECT
TO public
USING (
  is_active = true
  AND (start_date IS NULL OR start_date <= CURRENT_DATE)
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
);