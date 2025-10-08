-- Migración a Supabase Auth nativo para customer authentication

-- 1. Agregar columna auth_user_id a customers (para vincular con auth.users)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON customers(auth_user_id);

-- 3. Actualizar políticas RLS de customers para usar auth.uid()
DROP POLICY IF EXISTS "Customers can view own profile" ON customers;
DROP POLICY IF EXISTS "Customers can update own profile" ON customers;

CREATE POLICY "Customers can view own profile" 
ON customers FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Customers can update own profile" 
ON customers FOR UPDATE 
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- 4. Actualizar políticas RLS de addresses para usar auth.uid()
DROP POLICY IF EXISTS "Customers can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Customers can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Customers can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Customers can delete own addresses" ON addresses;

CREATE POLICY "Customers can view own addresses" 
ON addresses FOR SELECT 
USING (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Customers can insert own addresses" 
ON addresses FOR INSERT 
WITH CHECK (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Customers can update own addresses" 
ON addresses FOR UPDATE 
USING (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()))
WITH CHECK (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Customers can delete own addresses" 
ON addresses FOR DELETE 
USING (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

-- 5. Actualizar políticas de orders
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;

CREATE POLICY "Customers can view own orders" 
ON orders FOR SELECT 
USING (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

-- 6. Actualizar políticas de runas_transactions
DROP POLICY IF EXISTS "Customers can view own runas" ON runas_transactions;

CREATE POLICY "Customers can view own runas" 
ON runas_transactions FOR SELECT 
USING (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

-- 7. Actualizar políticas de customer_badges_awarded
DROP POLICY IF EXISTS "Customers can view own awarded badges" ON customer_badges_awarded;

CREATE POLICY "Customers can view own awarded badges" 
ON customer_badges_awarded FOR SELECT 
USING (customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid()));

-- 8. Crear función para vincular usuario existente con auth.users después del primer login con Supabase Auth
CREATE OR REPLACE FUNCTION link_customer_to_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar customer por email y vincular
  UPDATE customers 
  SET auth_user_id = NEW.id, updated_at = now()
  WHERE email = NEW.email 
    AND auth_user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Crear trigger para vincular automáticamente cuando un usuario se registra en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_link_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_link_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_customer_to_auth_user();

-- 10. Crear función para crear perfil de customer al registrarse con Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_customer_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear customer si no existe uno con ese email
  IF NOT EXISTS (SELECT 1 FROM customers WHERE email = NEW.email) THEN
    INSERT INTO customers (
      auth_user_id,
      email,
      name,
      nombres,
      estado_cliente,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'Activo',
      now()
    );
  ELSE
    -- Si ya existe, solo vincular
    UPDATE customers 
    SET auth_user_id = NEW.id, updated_at = now()
    WHERE email = NEW.email AND auth_user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Reemplazar trigger anterior para usar la nueva función
DROP TRIGGER IF EXISTS on_auth_user_created_link_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_handle_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_customer_user();