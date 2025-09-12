-- Fix critical security vulnerability in addresses table
-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Allow public access for POS operations to addresses" ON addresses;

-- Create secure policies for authenticated staff only
-- Administrators have full access to all address data
CREATE POLICY "Administrators can manage all addresses"
ON addresses 
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

-- Cashiers can view and create addresses (needed for delivery orders in POS)
CREATE POLICY "Cashiers can view addresses"
ON addresses 
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

CREATE POLICY "Cashiers can create addresses"
ON addresses 
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

-- Only administrators can update address data
CREATE POLICY "Only administrators can update addresses"
ON addresses 
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

-- Only administrators can delete addresses
CREATE POLICY "Only administrators can delete addresses"
ON addresses 
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