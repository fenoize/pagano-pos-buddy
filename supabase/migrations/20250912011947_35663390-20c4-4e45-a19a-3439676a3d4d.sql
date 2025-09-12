-- Fix RLS policies for POS operations
-- Drop existing restrictive policies and create more permissive ones for internal POS use

-- Customers table: Allow public access for POS operations
DROP POLICY IF EXISTS "Allow authenticated all access" ON public.customers;

CREATE POLICY "Allow public access for POS operations" 
ON public.customers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Orders table: Allow public access for POS operations  
DROP POLICY IF EXISTS "Allow authenticated all access" ON public.orders;

CREATE POLICY "Allow public access for POS operations"
ON public.orders
FOR ALL
USING (true) 
WITH CHECK (true);

-- Runas transactions: Allow public access for POS operations
DROP POLICY IF EXISTS "Allow authenticated all access to runas transactions" ON public.runas_transactions;

CREATE POLICY "Allow public access for POS operations"
ON public.runas_transactions
FOR ALL
USING (true)
WITH CHECK (true);

-- Cash sessions and movements: Allow public access for POS operations
DROP POLICY IF EXISTS "Allow authenticated all access" ON public.cash_sessions;

CREATE POLICY "Allow public access for POS operations" 
ON public.cash_sessions
FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated all access" ON public.cash_movements;

CREATE POLICY "Allow public access for POS operations"
ON public.cash_movements  
FOR ALL
USING (true)
WITH CHECK (true);