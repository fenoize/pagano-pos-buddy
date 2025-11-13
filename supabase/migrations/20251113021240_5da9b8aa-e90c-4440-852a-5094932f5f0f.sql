-- Actualizar función para manejar fecha de nacimiento en registro de clientes
CREATE OR REPLACE FUNCTION handle_new_customer_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM customers WHERE email = NEW.email) THEN
    INSERT INTO customers (
      auth_user_id,
      email,
      name,
      nombres,
      phone,
      fecha_nacimiento,
      estado_cliente,
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
      (NEW.raw_user_meta_data->>'birthDate')::date,
      'Activo',
      now()
    );
  ELSE
    UPDATE customers 
    SET auth_user_id = NEW.id, updated_at = now()
    WHERE email = NEW.email AND auth_user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION handle_new_customer_user IS 'Crea o actualiza registro de cliente al crear usuario auth, incluyendo fecha de nacimiento';