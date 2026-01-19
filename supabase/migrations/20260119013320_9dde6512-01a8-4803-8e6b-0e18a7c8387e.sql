-- Allow shifts without assigned employee (for schedule-generated draft shifts)
ALTER TABLE public.hr_shifts ALTER COLUMN employee_id DROP NOT NULL;