-- Add pickup_mode column to orders table for "Servir" or "Llevar" selection
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pickup_mode TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.pickup_mode IS 'For pickup orders: servir = eat in, llevar = take away';