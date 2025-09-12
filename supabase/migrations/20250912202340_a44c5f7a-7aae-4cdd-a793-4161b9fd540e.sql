-- Eliminar el usuario administrador por defecto por seguridad
DELETE FROM users WHERE username = 'administrador';