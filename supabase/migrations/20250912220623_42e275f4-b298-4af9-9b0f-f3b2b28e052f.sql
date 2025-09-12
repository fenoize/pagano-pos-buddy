-- Fix critical security vulnerability in orders table
-- Remove the overly permissive public access policy
DROP POLICY IF EXISTS "Allow public access for POS operations" ON orders;

-- Create secure policies for authenticated staff only
-- Administrators have full access to all order data
CREATE POLICY "Administrators can manage all orders"
ON orders 
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

-- Cashiers can view and create orders (needed for POS operations)
CREATE POLICY "Cashiers can view and create orders"
ON orders 
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

CREATE POLICY "Cashiers can create orders"
ON orders 
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

-- Kitchen staff can view orders and update status for cooking operations
CREATE POLICY "Kitchen staff can view orders"
ON orders 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cajero', 'Cocinero') 
    AND active = true
  )
);

CREATE POLICY "Kitchen staff can update order status"
ON orders 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cocinero') 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cocinero') 
    AND active = true
  )
);

-- Delivery staff can view orders and update delivery status
CREATE POLICY "Delivery staff can view orders"
ON orders 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cajero', 'Cocinero', 'Repartidor') 
    AND active = true
  )
);

CREATE POLICY "Delivery staff can update delivery status"
ON orders 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Repartidor') 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Repartidor') 
    AND active = true
  )
);

-- Viewers can only read orders
CREATE POLICY "Viewers can read orders"
ON orders 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cajero', 'Cocinero', 'Repartidor', 'Viewer') 
    AND active = true
  )
);

-- Only administrators can delete orders
CREATE POLICY "Only administrators can delete orders"
ON orders 
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