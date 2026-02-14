
-- Unify 'Caja' role to 'Cajero' in user_roles
UPDATE user_roles SET role = 'Cajero' WHERE role = 'Caja';

-- Update users table role column
UPDATE users SET role = 'Cajero' WHERE role = 'Caja';

-- Remove duplicate user_roles if any (keep one per user)
DELETE FROM user_roles a USING user_roles b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.role = b.role;
