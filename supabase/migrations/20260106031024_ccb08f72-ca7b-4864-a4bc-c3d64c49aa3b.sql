-- =====================================================
-- SISTEMA DE PAGOS A REPARTIDORES
-- =====================================================

-- 1. Modificar tabla delivery_zones: agregar campos de pago al repartidor
ALTER TABLE public.delivery_zones
ADD COLUMN IF NOT EXISTS driver_payment_mode text DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS driver_payment_amount integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS driver_payment_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS driver_payment_per_km numeric DEFAULT 0;

-- Comentarios descriptivos
COMMENT ON COLUMN public.delivery_zones.driver_payment_mode IS 'Modo de pago al repartidor: fixed, percentage, per_km';
COMMENT ON COLUMN public.delivery_zones.driver_payment_amount IS 'Monto fijo a pagar al repartidor';
COMMENT ON COLUMN public.delivery_zones.driver_payment_percentage IS 'Porcentaje del delivery_fee para el repartidor';
COMMENT ON COLUMN public.delivery_zones.driver_payment_per_km IS 'Monto por KM para calcular pago al repartidor';

-- 2. Modificar tabla orders: agregar campo de monto calculado para pago al repartidor
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_payment_amount integer DEFAULT 0;

COMMENT ON COLUMN public.orders.delivery_payment_amount IS 'Monto calculado a pagar al repartidor por esta orden';

-- 3. Crear tabla delivery_payments
CREATE TABLE IF NOT EXISTS public.delivery_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  delivery_person_id uuid NOT NULL,
  
  -- Montos base
  base_amount integer NOT NULL DEFAULT 0,
  shift_bonus integer NOT NULL DEFAULT 0,
  gross_amount integer NOT NULL DEFAULT 0,
  
  -- Configuración de impuestos
  has_invoice boolean NOT NULL DEFAULT false,
  company_pays_tax boolean NOT NULL DEFAULT true,
  tax_percentage numeric NOT NULL DEFAULT 13.5,
  tax_amount integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL DEFAULT 0,
  
  -- Estado del pago
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  
  -- Info del pago
  account_id uuid REFERENCES public.finance_accounts(id),
  paid_by uuid,
  payment_date timestamptz,
  notes text,
  
  -- Referencias a egresos de finanzas
  expense_id uuid REFERENCES public.finance_expenses(id),
  tax_expense_id uuid REFERENCES public.finance_expenses(id),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_delivery_payments_order ON public.delivery_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_payments_delivery_person ON public.delivery_payments(delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_delivery_payments_status ON public.delivery_payments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_payments_payment_date ON public.delivery_payments(payment_date);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_delivery_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_payments_updated_at ON public.delivery_payments;
CREATE TRIGGER trigger_delivery_payments_updated_at
  BEFORE UPDATE ON public.delivery_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_delivery_payments_updated_at();

-- RLS para delivery_payments
ALTER TABLE public.delivery_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all delivery payments"
  ON public.delivery_payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Delivery persons can view their own payments"
  ON public.delivery_payments
  FOR SELECT
  USING (true);

-- 4. Agregar configuración por defecto para impuestos
INSERT INTO public.config (key, value)
VALUES 
  ('delivery_tax_percentage', '13.5'::jsonb),
  ('delivery_default_company_pays_tax', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;