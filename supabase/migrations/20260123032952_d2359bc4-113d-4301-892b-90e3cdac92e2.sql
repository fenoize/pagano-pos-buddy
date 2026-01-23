-- Agregar columna schedule_id a hr_shifts para vincular turnos con jornadas/horarios
ALTER TABLE public.hr_shifts
ADD COLUMN schedule_id UUID REFERENCES public.hr_schedules(id) ON DELETE SET NULL;

-- Crear índice para mejorar consultas por schedule
CREATE INDEX idx_hr_shifts_schedule_id ON public.hr_shifts(schedule_id);

-- Comentario descriptivo
COMMENT ON COLUMN public.hr_shifts.schedule_id IS 'Referencia al horario/jornada (ej: Jornada AM, Jornada PM) desde el cual se generó este turno';