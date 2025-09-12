-- Update app_role enum to match new requirements
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'Preparador';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'Cajero';

-- Add created_by_user_id to orders for audit logging
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.users(id);

-- Add index for better performance on user queries
CREATE INDEX IF NOT EXISTS idx_orders_created_by_user_id ON public.orders(created_by_user_id);

-- Create trigger to update customer value when orders are created/updated
CREATE OR REPLACE FUNCTION public.update_customer_value_and_audit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for orders
DROP TRIGGER IF EXISTS update_orders_customer_value ON public.orders;
CREATE TRIGGER update_orders_customer_value
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_value_and_audit();