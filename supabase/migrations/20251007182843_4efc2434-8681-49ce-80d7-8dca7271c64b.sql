-- Phase 1: Database Updates

-- Add payment_runas column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_runas integer DEFAULT 0;

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  icon text NOT NULL DEFAULT 'DollarSign',
  is_active boolean NOT NULL DEFAULT true,
  requires_change boolean NOT NULL DEFAULT false,
  requires_receipt boolean NOT NULL DEFAULT false,
  requires_operation_number boolean NOT NULL DEFAULT false,
  counts_as_real_sale boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_methods
CREATE POLICY "Allow public read access to payment_methods"
ON public.payment_methods
FOR SELECT
USING (true);

CREATE POLICY "Allow admin insert access to payment_methods"
ON public.payment_methods
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow admin update access to payment_methods"
ON public.payment_methods
FOR UPDATE
USING (true);

CREATE POLICY "Allow admin delete access to payment_methods"
ON public.payment_methods
FOR DELETE
USING (true);

-- Insert initial payment methods
INSERT INTO public.payment_methods (name, display_name, icon, requires_change, counts_as_real_sale, display_order) VALUES
  ('efectivo', 'Efectivo', 'Banknote', true, true, 1),
  ('pos', 'POS', 'CreditCard', false, true, 2),
  ('transferencia', 'Transferencia/MP', 'Smartphone', false, true, 3),
  ('aplicacion', 'Aplicación', 'AppWindow', false, true, 4),
  ('runas', 'Runas', 'Sparkles', false, false, 5)
ON CONFLICT (name) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();