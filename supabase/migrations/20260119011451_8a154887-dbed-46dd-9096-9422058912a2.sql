-- Eliminar políticas existentes de hr_shift_roles
DROP POLICY IF EXISTS "Staff can view hr shift roles" ON public.hr_shift_roles;
DROP POLICY IF EXISTS "Staff can insert hr shift roles" ON public.hr_shift_roles;
DROP POLICY IF EXISTS "Staff can update hr shift roles" ON public.hr_shift_roles;
DROP POLICY IF EXISTS "Staff can delete hr shift roles" ON public.hr_shift_roles;
DROP POLICY IF EXISTS "Allow all for hr shift roles" ON public.hr_shift_roles;

-- Eliminar políticas existentes de hr_shift_types
DROP POLICY IF EXISTS "Staff can view hr shift types" ON public.hr_shift_types;
DROP POLICY IF EXISTS "Staff can insert hr shift types" ON public.hr_shift_types;
DROP POLICY IF EXISTS "Staff can update hr shift types" ON public.hr_shift_types;
DROP POLICY IF EXISTS "Staff can delete hr shift types" ON public.hr_shift_types;
DROP POLICY IF EXISTS "Allow all for hr shift types" ON public.hr_shift_types;

-- Eliminar políticas existentes de hr_pay_rules
DROP POLICY IF EXISTS "Staff can view hr pay rules" ON public.hr_pay_rules;
DROP POLICY IF EXISTS "Staff can insert hr pay rules" ON public.hr_pay_rules;
DROP POLICY IF EXISTS "Staff can update hr pay rules" ON public.hr_pay_rules;
DROP POLICY IF EXISTS "Staff can delete hr pay rules" ON public.hr_pay_rules;
DROP POLICY IF EXISTS "Allow all for hr pay rules" ON public.hr_pay_rules;

-- Crear políticas permisivas para hr_shift_roles
CREATE POLICY "Allow all for hr shift roles" ON public.hr_shift_roles
  FOR ALL USING (true) WITH CHECK (true);

-- Crear políticas permisivas para hr_shift_types
CREATE POLICY "Allow all for hr shift types" ON public.hr_shift_types
  FOR ALL USING (true) WITH CHECK (true);

-- Crear políticas permisivas para hr_pay_rules
CREATE POLICY "Allow all for hr pay rules" ON public.hr_pay_rules
  FOR ALL USING (true) WITH CHECK (true);