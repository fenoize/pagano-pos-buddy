-- Fix cash_movements RLS policies to use the session context properly
DROP POLICY IF EXISTS "Active staff can view cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Active staff can insert cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Active staff can update cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Only admins can delete cash movements" ON public.cash_movements;

-- Staff can view movements (Cajero or Administrador)
CREATE POLICY "Staff can view cash movements"
ON public.cash_movements
FOR SELECT
USING (
  current_setting('app.user_id', true)::uuid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = current_setting('app.user_id', true)::uuid
    AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Staff can insert movements (Cajero or Administrador)
CREATE POLICY "Staff can insert cash movements"
ON public.cash_movements
FOR INSERT
WITH CHECK (
  current_setting('app.user_id', true)::uuid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = current_setting('app.user_id', true)::uuid
    AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Staff can update movements (Cajero or Administrador)
CREATE POLICY "Staff can update cash movements"
ON public.cash_movements
FOR UPDATE
USING (
  current_setting('app.user_id', true)::uuid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = current_setting('app.user_id', true)::uuid
    AND ur.role IN ('Cajero', 'Administrador')
  )
)
WITH CHECK (
  current_setting('app.user_id', true)::uuid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = current_setting('app.user_id', true)::uuid
    AND ur.role IN ('Cajero', 'Administrador')
  )
);

-- Only admins can delete movements
CREATE POLICY "Only admins can delete cash movements"
ON public.cash_movements
FOR DELETE
USING (
  current_setting('app.user_id', true)::uuid IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = current_setting('app.user_id', true)::uuid
    AND ur.role = 'Administrador'
  )
);