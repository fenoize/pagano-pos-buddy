-- Temporarily update admin user with plain text password for testing
-- We'll hash it properly after login works
UPDATE public.users 
SET pass_hash = '12345678'
WHERE username = 'administrador';