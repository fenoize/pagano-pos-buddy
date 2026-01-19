-- Drop existing RLS policies for hr_shifts if any
DROP POLICY IF EXISTS "Allow all for hr_shifts" ON public.hr_shifts;
DROP POLICY IF EXISTS "Allow select for hr_shifts" ON public.hr_shifts;
DROP POLICY IF EXISTS "Allow insert for hr_shifts" ON public.hr_shifts;
DROP POLICY IF EXISTS "Allow update for hr_shifts" ON public.hr_shifts;
DROP POLICY IF EXISTS "Allow delete for hr_shifts" ON public.hr_shifts;

-- Ensure RLS is enabled
ALTER TABLE public.hr_shifts ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for all operations (staff context is validated by withStaffContext helper)
CREATE POLICY "Allow all for hr_shifts"
ON public.hr_shifts
FOR ALL
USING (true)
WITH CHECK (true);