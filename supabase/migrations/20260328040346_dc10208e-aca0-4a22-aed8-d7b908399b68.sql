-- Allow authenticated users (staff) to read all awarded badges
CREATE POLICY "Staff can view all awarded badges"
ON public.customer_badges_awarded
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon to read (staff uses anon key with custom auth)
CREATE POLICY "Anon can read awarded badges"
ON public.customer_badges_awarded
FOR SELECT
TO anon
USING (true);