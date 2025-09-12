-- Fix the existing update_customer_value function to have proper search_path
CREATE OR REPLACE FUNCTION public.update_customer_value()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Actualizar valor_cliente cuando se crea/actualiza una orden
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE customers 
    SET 
      valor_cliente = (
        SELECT COALESCE(AVG(total), 0) 
        FROM orders 
        WHERE customer_id = NEW.customer_id
      ),
      ultima_compra = NEW.created_at
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$;