-- Relax RLS on users to work without Supabase Auth (internal app)
-- Drop admin-only policies to avoid restrictive AND behavior
DROP POLICY IF EXISTS "Allow admin to insert users" ON public.users;
DROP POLICY IF EXISTS "Allow admin to update users" ON public.users;
DROP POLICY IF EXISTS "Allow admin to delete users" ON public.users;

-- Allow ALL operations for POS (UI enforces admin-only)
CREATE POLICY "Allow public access for POS operations to users"
ON public.users
FOR ALL
USING (true)
WITH CHECK (true);