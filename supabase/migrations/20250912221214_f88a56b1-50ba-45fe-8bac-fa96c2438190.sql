-- Clean up any existing policies and recreate them properly
-- Drop all existing policies for orders table
DROP POLICY IF EXISTS "Administrators can manage all orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can view and create orders" ON orders;
DROP POLICY IF EXISTS "Cashiers can create orders" ON orders;
DROP POLICY IF EXISTS "Kitchen staff can view orders" ON orders;
DROP POLICY IF EXISTS "Kitchen staff can update order status" ON orders;
DROP POLICY IF EXISTS "Delivery staff can view orders" ON orders;
DROP POLICY IF EXISTS "Delivery staff can update delivery status" ON orders;
DROP POLICY IF EXISTS "Viewers can read orders" ON orders;
DROP POLICY IF EXISTS "Only administrators can delete orders" ON orders;

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
CREATE POLICY "Cashiers can view orders"
ON orders 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Caja') 
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
    AND role IN ('Administrador', 'Caja') 
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
    AND role IN ('Administrador', 'Caja', 'Cocina') 
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
    AND role IN ('Administrador', 'Cocina') 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Cocina') 
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
    AND role IN ('Administrador', 'Caja', 'Cocina', 'Reparto') 
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
    AND role IN ('Administrador', 'Reparto') 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Reparto') 
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
    AND role IN ('Administrador', 'Caja', 'Cocina', 'Reparto', 'Viewer') 
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