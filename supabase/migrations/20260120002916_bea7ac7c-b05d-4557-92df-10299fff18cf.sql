-- ============================================
-- FIX: Agregar políticas públicas de lectura para tablas HR de configuración
-- ============================================

-- hr_shift_roles: Roles de turno
DROP POLICY IF EXISTS "Allow read access to hr_shift_roles" ON public.hr_shift_roles;
DROP POLICY IF EXISTS "Allow all for hr_shift_roles" ON public.hr_shift_roles;

CREATE POLICY "Allow read access to hr_shift_roles"
  ON public.hr_shift_roles
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all for hr_shift_roles"
  ON public.hr_shift_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- hr_shift_types: Tipos de turno
DROP POLICY IF EXISTS "Allow read access to hr_shift_types" ON public.hr_shift_types;
DROP POLICY IF EXISTS "Allow all for hr_shift_types" ON public.hr_shift_types;

CREATE POLICY "Allow read access to hr_shift_types"
  ON public.hr_shift_types
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all for hr_shift_types"
  ON public.hr_shift_types
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- hr_pay_rules: Reglas de pago
DROP POLICY IF EXISTS "Allow read access to hr_pay_rules" ON public.hr_pay_rules;
DROP POLICY IF EXISTS "Allow all for hr_pay_rules" ON public.hr_pay_rules;

CREATE POLICY "Allow read access to hr_pay_rules"
  ON public.hr_pay_rules
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all for hr_pay_rules"
  ON public.hr_pay_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- hr_shifts: Turnos
DROP POLICY IF EXISTS "Allow read access to hr_shifts" ON public.hr_shifts;
DROP POLICY IF EXISTS "Allow all for hr_shifts" ON public.hr_shifts;

CREATE POLICY "Allow read access to hr_shifts"
  ON public.hr_shifts
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all for hr_shifts"
  ON public.hr_shifts
  FOR ALL
  USING (true)
  WITH CHECK (true);