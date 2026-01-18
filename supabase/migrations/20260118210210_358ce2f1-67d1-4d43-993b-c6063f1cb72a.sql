
-- Seed HR shift types requested
INSERT INTO public.hr_shift_types (name, default_hours, is_active)
SELECT 'T. Completo', 7, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.hr_shift_types WHERE name = 'T. Completo'
);

INSERT INTO public.hr_shift_types (name, default_hours, is_active)
SELECT 'Medio T.', 4, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.hr_shift_types WHERE name = 'Medio T.'
);
