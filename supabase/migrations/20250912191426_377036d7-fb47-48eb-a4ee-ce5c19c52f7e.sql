-- Fix search path security issue for the function
CREATE OR REPLACE FUNCTION public.update_customer_value_and_audit()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Update customer value calculation (existing functionality)
  IF NEW.customer_id IS NOT NULL THEN
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