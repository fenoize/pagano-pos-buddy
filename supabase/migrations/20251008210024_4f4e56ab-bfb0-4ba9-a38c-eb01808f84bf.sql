-- FASE 1: Mejoras RLS y Constraints para Portal del Cliente

-- 1.1 Crear función para obtener customer_id desde contexto
CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('app.customer_id', true), '')::uuid;
$$;

-- 1.2 Actualizar RLS policies de addresses con cast explícito
DROP POLICY IF EXISTS "Customers can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Customers can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Customers can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Customers can delete own addresses" ON addresses;

CREATE POLICY "Customers can view own addresses" 
ON addresses
FOR SELECT 
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can insert own addresses" 
ON addresses
FOR INSERT 
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can update own addresses" 
ON addresses
FOR UPDATE 
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  customer_id IN (
    SELECT id FROM customers 
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Customers can delete own addresses" 
ON addresses
FOR DELETE 
USING (
  customer_id IN (
    SELECT id FROM customers 
    WHERE auth_user_id = auth.uid()
  )
);

-- 1.3 Agregar constraint de máximo 5 direcciones por cliente
CREATE OR REPLACE FUNCTION check_max_addresses()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM addresses WHERE customer_id = NEW.customer_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) >= 5 THEN
    RAISE EXCEPTION 'El cliente no puede tener más de 5 direcciones';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_max_addresses ON addresses;
CREATE TRIGGER enforce_max_addresses
BEFORE INSERT ON addresses
FOR EACH ROW
EXECUTE FUNCTION check_max_addresses();

-- 1.4 Verificar índices para paginación server-side
-- Índice para orders ya existe: idx_orders_customer_created (customer_id, created_at)
-- Crear versión descendente optimizada
DROP INDEX IF EXISTS idx_orders_customer_created_desc;
CREATE INDEX idx_orders_customer_created_desc 
ON orders (customer_id, created_at DESC);

-- Índice para runas_transactions
DROP INDEX IF EXISTS idx_runas_customer_created;
CREATE INDEX idx_runas_customer_created 
ON runas_transactions (customer_id, created_at DESC);

-- Índice para addresses
DROP INDEX IF EXISTS idx_addresses_customer;
CREATE INDEX idx_addresses_customer 
ON addresses (customer_id, is_default DESC);