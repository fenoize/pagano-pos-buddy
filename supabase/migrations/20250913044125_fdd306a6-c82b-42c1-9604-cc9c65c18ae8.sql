-- Fix RLS policies for customers table
DROP POLICY IF EXISTS "Administrators can manage all customers" ON customers;
DROP POLICY IF EXISTS "Cashiers can create customers" ON customers;
DROP POLICY IF EXISTS "Cashiers can view customers" ON customers;
DROP POLICY IF EXISTS "Only administrators can delete customers" ON customers;
DROP POLICY IF EXISTS "Only administrators can update customers" ON customers;

CREATE POLICY "Allow public access for customers" 
ON customers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix RLS policies for orders table
DROP POLICY IF EXISTS "Administrators can manage all orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can create orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can view orders" ON orders;
DROP POLICY IF EXISTS "Kitchen staff can view orders" ON orders;
DROP POLICY IF EXISTS "Kitchen staff can update order status" ON orders;
DROP POLICY IF EXISTS "Delivery staff can view orders" ON orders;
DROP POLICY IF EXISTS "Delivery staff can update delivery status" ON orders;
DROP POLICY IF EXISTS "Only administrators can delete orders" ON orders;
DROP POLICY IF EXISTS "Viewers can read orders" ON orders;

CREATE POLICY "Allow public access for orders" 
ON orders 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix RLS policies for runas_transactions table
DROP POLICY IF EXISTS "Administrators can manage all runas transactions" ON runas_transactions;
DROP POLICY IF EXISTS "Cashiers can create runas transactions" ON runas_transactions;
DROP POLICY IF EXISTS "Cashiers can view and create runas transactions" ON runas_transactions;
DROP POLICY IF EXISTS "Only administrators can delete runas transactions" ON runas_transactions;
DROP POLICY IF EXISTS "Only administrators can update runas transactions" ON runas_transactions;

CREATE POLICY "Allow public access for runas transactions" 
ON runas_transactions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix RLS policies for addresses table
DROP POLICY IF EXISTS "Administrators can manage all addresses" ON addresses;
DROP POLICY IF EXISTS "Cashiers can create addresses" ON addresses;
DROP POLICY IF EXISTS "Cashiers can view addresses" ON addresses;
DROP POLICY IF EXISTS "Only administrators can delete addresses" ON addresses;
DROP POLICY IF EXISTS "Only administrators can update addresses" ON addresses;

CREATE POLICY "Allow public access for addresses" 
ON addresses 
FOR ALL 
USING (true)
WITH CHECK (true);