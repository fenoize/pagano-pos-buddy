BEGIN;

-- ========================================
-- FASE 4: POLÍTICAS RLS POR ROL (SIN BRANCH_ID POR AHORA)
-- ========================================

-- USERS: Cerrar tabla, acceso controlado por funciones
DROP POLICY IF EXISTS "Allow public access for POS operations" ON public.users;
DROP POLICY IF EXISTS "Allow creating users" ON public.users;  
DROP POLICY IF EXISTS "Allow reading users for authentication" ON public.users;
DROP POLICY IF EXISTS "Allow updating users" ON public.users;
DROP POLICY IF EXISTS "Allow deleting users" ON public.users;

-- Solo permitir actualización de propio perfil
CREATE POLICY users_update_self ON public.users
FOR UPDATE TO PUBLIC
USING (id = app.current_user_id())
WITH CHECK (id = app.current_user_id() AND app.current_role() IN ('admin', 'cashier', 'kitchen', 'delivery', 'viewer'));

-- Vista pública autenticada (no contiene hashes)
GRANT SELECT ON public.app_public_users TO PUBLIC;

-- CUSTOMERS: admin/cashier leer/escribir; otros roles sin acceso
DROP POLICY IF EXISTS "Allow public access for customers" ON public.customers;

CREATE POLICY customers_read ON public.customers
FOR SELECT TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') );

CREATE POLICY customers_insert ON public.customers
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

CREATE POLICY customers_update ON public.customers
FOR UPDATE TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') )
WITH CHECK ( app.current_role() IN ('admin','cashier') );

-- ORDERS: admin/cashier acceso completo
DROP POLICY IF EXISTS "Allow public access for orders" ON public.orders;

CREATE POLICY orders_read ON public.orders
FOR SELECT TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') );

CREATE POLICY orders_insert ON public.orders
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

CREATE POLICY orders_update ON public.orders
FOR UPDATE TO PUBLIC
USING ( app.current_role() IN ('admin','cashier') )
WITH CHECK ( app.current_role() IN ('admin','cashier') );

-- Permisos sobre vistas para roles específicos
GRANT SELECT ON public.app_orders_kitchen TO PUBLIC;
GRANT SELECT ON public.app_orders_delivery TO PUBLIC;

-- CASH SESSIONS: admin ve todo, cashier solo sus propias sesiones  
DROP POLICY IF EXISTS "Allow public access for POS operations" ON public.cash_sessions;

CREATE POLICY cash_sessions_read ON public.cash_sessions
FOR SELECT TO PUBLIC
USING (
  app.current_role() = 'admin'
  OR (app.current_role() = 'cashier' AND user_id = app.current_user_id())
);

CREATE POLICY cash_sessions_insert ON public.cash_sessions
FOR INSERT TO PUBLIC
WITH CHECK ( app.current_role() IN ('admin','cashier') );

CREATE POLICY cash_sessions_update ON public.cash_sessions
FOR UPDATE TO PUBLIC
USING ( 
  app.current_role() = 'admin' 
  OR (app.current_role() = 'cashier' AND user_id = app.current_user_id())
)
WITH CHECK ( 
  app.current_role() = 'admin' 
  OR (app.current_role() = 'cashier' AND user_id = app.current_user_id())
);

-- CASH MOVEMENTS: admin ve todo, cashier solo sus propias sesiones
DROP POLICY IF EXISTS "Allow public access for POS operations" ON public.cash_movements;

CREATE POLICY cash_movements_read ON public.cash_movements
FOR SELECT TO PUBLIC
USING (
  app.current_role() = 'admin'
  OR session_id IN (
    SELECT id FROM public.cash_sessions 
    WHERE user_id = app.current_user_id()
  )
);

CREATE POLICY cash_movements_insert ON public.cash_movements
FOR INSERT TO PUBLIC
WITH CHECK (
  app.current_role() IN ('admin','cashier')
  AND session_id IN (
    SELECT id FROM public.cash_sessions 
    WHERE user_id = app.current_user_id()
  )
);

COMMIT;