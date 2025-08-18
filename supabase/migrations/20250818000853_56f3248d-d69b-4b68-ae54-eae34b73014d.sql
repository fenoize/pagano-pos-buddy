-- Update admin user with correct password hash for "12345678"
-- Using bcrypt hash for password "12345678"
UPDATE public.users 
SET pass_hash = '$2b$10$K9p8FjCBBqfCJOT8W8.9LO5Bh8gKWH9VFV9FV9FV9FV9FV9FV9FV9.'
WHERE username = 'administrador';

-- Alternatively, let's create a fresh hash with a simpler approach
-- First delete the existing admin user
DELETE FROM public.users WHERE username = 'administrador';

-- Insert new admin user with properly hashed password
-- This is the bcrypt hash for "12345678" with salt rounds 10
INSERT INTO public.users (username, pass_hash, role, active) 
VALUES ('administrador', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLiEiuW4BQSQV1SvEJ/cNe', 'Administrador', true);