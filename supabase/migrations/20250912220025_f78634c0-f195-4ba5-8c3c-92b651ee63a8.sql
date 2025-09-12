-- Fix critical security vulnerability in customers table
-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Allow public access for POS operations" ON customers;

-- Create secure policies for authenticated staff only
-- Administrators have full access to all customer data
CREATE POLICY "Administrators can manage all customers"
ON customers 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Administrador' 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Administrador' 
    AND active = true
  )
);

-- Cashiers can view and create customers (needed for POS operations)
CREATE POLICY "Cashiers can view customers"
ON customers 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cajero') 
    AND active = true
  )
);

CREATE POLICY "Cashiers can create customers"
ON customers 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cajero') 
    AND active = true
  )
);

-- Only administrators can update customer data
CREATE POLICY "Only administrators can update customers"
ON customers 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Administrador' 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Administrador' 
    AND active = true
  )
);

-- Only administrators can delete customers
CREATE POLICY "Only administrators can delete customers"
ON customers 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Administrador' 
    AND active = true
  )
);