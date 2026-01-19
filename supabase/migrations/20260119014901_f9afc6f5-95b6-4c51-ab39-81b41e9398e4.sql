-- ============================================
-- FIX: Agregar políticas públicas de lectura para tablas HR
-- Estas tablas son usadas por el staff interno y necesitan ser accesibles
-- ============================================

-- hr_employees: Agregar política de lectura pública
DROP POLICY IF EXISTS "Staff can view hr_employees" ON public.hr_employees;
DROP POLICY IF EXISTS "Staff can manage hr_employees" ON public.hr_employees;
DROP POLICY IF EXISTS "Allow read access to hr_employees" ON public.hr_employees;
DROP POLICY IF EXISTS "Allow all for hr_employees" ON public.hr_employees;

CREATE POLICY "Allow read access to hr_employees"
  ON public.hr_employees
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all for hr_employees"
  ON public.hr_employees
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- hr_schedules: Actualizar políticas (ya tiene Allow all pero vamos a estandarizar)
DROP POLICY IF EXISTS "Allow all for staff schedules" ON public.hr_schedules;
DROP POLICY IF EXISTS "Allow read access to hr_schedules" ON public.hr_schedules;

CREATE POLICY "Allow read access to hr_schedules"
  ON public.hr_schedules
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all for hr_schedules"
  ON public.hr_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- hr_schedule_positions: Estandarizar
DROP POLICY IF EXISTS "Allow all for staff schedule positions" ON public.hr_schedule_positions;
DROP POLICY IF EXISTS "Allow read access to hr_schedule_positions" ON public.hr_schedule_positions;

CREATE POLICY "Allow read access to hr_schedule_positions"
  ON public.hr_schedule_positions
  FOR SELECT
  USING (true);

CREATE POLICY "Allow all for hr_schedule_positions"
  ON public.hr_schedule_positions
  FOR ALL
  USING (true)
  WITH CHECK (true);