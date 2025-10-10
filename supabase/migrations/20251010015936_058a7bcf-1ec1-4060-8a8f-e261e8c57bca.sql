-- Crear función para sincronizar cantidad_runas automáticamente
CREATE OR REPLACE FUNCTION sync_customer_runas_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar cantidad_runas sumando el valor de la nueva transacción
  UPDATE customers
  SET 
    cantidad_runas = GREATEST(0, COALESCE(cantidad_runas, 0) + NEW.runas),
    updated_at = now()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$;

-- Crear trigger que se ejecuta después de insertar en runas_transactions
CREATE TRIGGER trg_sync_customer_runas
AFTER INSERT ON runas_transactions
FOR EACH ROW
EXECUTE FUNCTION sync_customer_runas_on_transaction();