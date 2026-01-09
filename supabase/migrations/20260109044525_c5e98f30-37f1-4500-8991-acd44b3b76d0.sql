-- Agregar el rol 'TV' al enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'TV';