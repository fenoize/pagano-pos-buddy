-- Fix security vulnerability in runas_transactions table
-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Allow public access for POS operations" ON runas_transactions;

-- Create secure policies for authenticated staff only
-- Administrators can do everything
CREATE POLICY "Administrators can manage all runas transactions"
ON runas_transactions 
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

-- Cashiers can view and create runas transactions (for POS operations)
CREATE POLICY "Cashiers can view and create runas transactions"
ON runas_transactions 
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

CREATE POLICY "Cashiers can create runas transactions"
ON runas_transactions 
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

-- Only administrators can update runas transactions (for manual adjustments)
CREATE POLICY "Only administrators can update runas transactions"
ON runas_transactions 
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

-- Only administrators can delete runas transactions
CREATE POLICY "Only administrators can delete runas transactions"
ON runas_transactions 
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