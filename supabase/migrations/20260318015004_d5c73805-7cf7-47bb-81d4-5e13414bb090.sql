INSERT INTO role_permissions (role, permission) VALUES
  ('Leer QR', 'customers.view')
ON CONFLICT DO NOTHING;