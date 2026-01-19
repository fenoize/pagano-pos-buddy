-- Crear tabla hr_schedules (Horarios/Plantillas de turnos)
CREATE TABLE public.hr_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days_of_week integer[] NOT NULL DEFAULT '{}',
  start_time time NOT NULL,
  end_time time NOT NULL,
  crosses_midnight boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla hr_schedule_positions (Posiciones requeridas por horario)
CREATE TABLE public.hr_schedule_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.hr_schedules(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.hr_shift_roles(id) ON DELETE CASCADE,
  shift_type_id uuid NOT NULL REFERENCES public.hr_shift_types(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_hr_schedules_active ON public.hr_schedules(is_active);
CREATE INDEX idx_hr_schedule_positions_schedule ON public.hr_schedule_positions(schedule_id);

-- RLS policies
ALTER TABLE public.hr_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_schedule_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view schedules" ON public.hr_schedules
  FOR SELECT USING (public.has_active_staff_session());

CREATE POLICY "Staff can insert schedules" ON public.hr_schedules
  FOR INSERT WITH CHECK (public.has_active_staff_session());

CREATE POLICY "Staff can update schedules" ON public.hr_schedules
  FOR UPDATE USING (public.has_active_staff_session());

CREATE POLICY "Staff can delete schedules" ON public.hr_schedules
  FOR DELETE USING (public.has_active_staff_session());

CREATE POLICY "Staff can view schedule positions" ON public.hr_schedule_positions
  FOR SELECT USING (public.has_active_staff_session());

CREATE POLICY "Staff can insert schedule positions" ON public.hr_schedule_positions
  FOR INSERT WITH CHECK (public.has_active_staff_session());

CREATE POLICY "Staff can update schedule positions" ON public.hr_schedule_positions
  FOR UPDATE USING (public.has_active_staff_session());

CREATE POLICY "Staff can delete schedule positions" ON public.hr_schedule_positions
  FOR DELETE USING (public.has_active_staff_session());

-- Trigger para updated_at
CREATE TRIGGER update_hr_schedules_updated_at
  BEFORE UPDATE ON public.hr_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();