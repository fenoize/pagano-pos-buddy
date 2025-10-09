-- Crear función helper mejorada para verificar si es administrador activo
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = get_current_staff_user_id()
      AND u.active = true
  );
$$;

-- Función específica para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id = get_current_staff_user_id()
      AND ur.role = 'Administrador'
      AND u.active = true
  );
$$;

-- Función para verificar si es cajero o admin
CREATE OR REPLACE FUNCTION public.is_cashier_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.users u ON u.id = ur.user_id
    WHERE ur.user_id = get_current_staff_user_id()
      AND ur.role IN ('Cajero', 'Administrador')
      AND u.active = true
  );
$$;

-- Reemplazar política de SELECT en orders para dar acceso total a staff activo
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;

CREATE POLICY "Staff and customers can view orders" ON public.orders
FOR SELECT
USING (
  -- Si es staff activo (cualquier rol), puede ver todas las órdenes
  is_active_staff()
  OR
  -- Si es cliente, solo puede ver sus propias órdenes
  (customer_id IN (
    SELECT id FROM public.customers WHERE auth_user_id = auth.uid()
  ))
);

-- Mejorar política de UPDATE en orders
DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;

CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- Mejorar política de INSERT en orders
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;

CREATE POLICY "Staff can create orders" ON public.orders
FOR INSERT
WITH CHECK (
  is_cashier_or_admin()
  AND created_by_user_id = get_current_staff_user_id()
);

-- Aplicar mismo patrón a customers
DROP POLICY IF EXISTS "Staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Cajero and Admin can create customers" ON public.customers;

CREATE POLICY "Staff can view customers" ON public.customers
FOR SELECT
USING (
  is_active_staff()
  OR
  (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id)
);

CREATE POLICY "Staff can update customers" ON public.customers
FOR UPDATE
USING (
  is_active_staff()
  OR
  (auth.uid() = auth_user_id)
)
WITH CHECK (
  is_active_staff()
  OR
  (auth.uid() = auth_user_id)
);

CREATE POLICY "Cashier and Admin can create customers" ON public.customers
FOR INSERT
WITH CHECK (is_cashier_or_admin());

-- Mejorar políticas de cash_sessions
DROP POLICY IF EXISTS "Staff can view all cash sessions" ON public.cash_sessions;

CREATE POLICY "Staff can view all sessions" ON public.cash_sessions
FOR SELECT
USING (is_active_staff());

DROP POLICY IF EXISTS "Session owner or admin can update sessions" ON public.cash_sessions;

CREATE POLICY "Staff can update sessions" ON public.cash_sessions
FOR UPDATE
USING (
  user_id = get_current_staff_user_id()
  OR is_active_admin()
)
WITH CHECK (
  user_id = get_current_staff_user_id()
  OR is_active_admin()
);

-- Mejorar políticas de cash_movements
DROP POLICY IF EXISTS "Staff can view all movements" ON public.cash_movements;

CREATE POLICY "Staff can view movements" ON public.cash_movements
FOR SELECT
USING (is_active_staff());