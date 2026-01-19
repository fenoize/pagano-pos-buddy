-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Staff can view schedules" ON public.hr_schedules;
DROP POLICY IF EXISTS "Staff can insert schedules" ON public.hr_schedules;
DROP POLICY IF EXISTS "Staff can update schedules" ON public.hr_schedules;
DROP POLICY IF EXISTS "Staff can delete schedules" ON public.hr_schedules;

DROP POLICY IF EXISTS "Staff can view schedule positions" ON public.hr_schedule_positions;
DROP POLICY IF EXISTS "Staff can insert schedule positions" ON public.hr_schedule_positions;
DROP POLICY IF EXISTS "Staff can update schedule positions" ON public.hr_schedule_positions;
DROP POLICY IF EXISTS "Staff can delete schedule positions" ON public.hr_schedule_positions;

-- Crear políticas más permisivas para hr_schedules (similares a las otras tablas HR)
CREATE POLICY "Allow all for staff schedules" ON public.hr_schedules
  FOR ALL USING (true) WITH CHECK (true);

-- Crear políticas para hr_schedule_positions
CREATE POLICY "Allow all for staff schedule positions" ON public.hr_schedule_positions
  FOR ALL USING (true) WITH CHECK (true);