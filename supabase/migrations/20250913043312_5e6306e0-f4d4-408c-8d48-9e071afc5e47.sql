-- Drop existing policies for delivery_zones
DROP POLICY IF EXISTS "Administrators can manage delivery zones" ON delivery_zones;
DROP POLICY IF EXISTS "Cashiers can view delivery zones" ON delivery_zones;

-- Create new public policies that allow all operations
-- Since we're handling permissions in the application layer
CREATE POLICY "Allow public access for delivery zones" 
ON delivery_zones 
FOR ALL 
USING (true)
WITH CHECK (true);