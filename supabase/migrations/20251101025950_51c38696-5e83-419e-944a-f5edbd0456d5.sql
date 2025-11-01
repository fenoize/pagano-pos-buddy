-- Performance optimization: Add indexes for faster queries (corregido)

-- 1. USERS table - optimizar búsquedas por username y active status
CREATE INDEX IF NOT EXISTS idx_users_username_active 
ON public.users(username, active) 
WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_users_active_created 
ON public.users(active, created_at DESC) 
WHERE active = true;

-- 2. CUSTOMERS table - optimizar búsquedas y filtros comunes
CREATE INDEX IF NOT EXISTS idx_customers_estado_created 
ON public.customers(estado_cliente, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON public.customers(phone) 
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_email 
ON public.customers(email) 
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_rut 
ON public.customers(rut) 
WHERE rut IS NOT NULL;

-- 3. ORDERS table - optimizar listado por fecha y filtros
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc 
ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON public.orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON public.orders(customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_method 
ON public.orders(payment_method, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_number 
ON public.orders(order_number);

-- 4. STAFF_SESSIONS - optimizar validación de tokens (sin predicado now())
CREATE INDEX IF NOT EXISTS idx_staff_sessions_token_active 
ON public.staff_sessions(token, is_active, expires_at) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_staff_sessions_user_active 
ON public.staff_sessions(user_id, is_active, expires_at DESC) 
WHERE is_active = true;

-- 5. USER_ROLES - optimizar joins de permisos
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON public.user_roles(user_id, role);

-- 6. ADDRESSES - optimizar queries por cliente
CREATE INDEX IF NOT EXISTS idx_addresses_customer_default 
ON public.addresses(customer_id, is_default DESC);

COMMENT ON INDEX idx_users_username_active IS 'Optimiza login y búsqueda de usuarios activos';
COMMENT ON INDEX idx_orders_created_at_desc IS 'Optimiza listado de ventas por fecha reciente';
COMMENT ON INDEX idx_staff_sessions_token_active IS 'Acelera validación de tokens de sesión';