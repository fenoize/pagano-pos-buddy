
-- Create table for customer discount subscriptions
CREATE TABLE public.customer_discount_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_customer_discount UNIQUE (customer_id)
);

-- Enable RLS
ALTER TABLE public.customer_discount_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: Allow all for authenticated (staff pattern used in this project)
CREATE POLICY "Allow SELECT for authenticated"
  ON public.customer_discount_subscriptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow INSERT for authenticated"
  ON public.customer_discount_subscriptions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow UPDATE for authenticated"
  ON public.customer_discount_subscriptions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow DELETE for authenticated"
  ON public.customer_discount_subscriptions
  FOR DELETE TO authenticated USING (true);

-- Also allow anon SELECT so customer app can read their own discount
CREATE POLICY "Allow SELECT for anon"
  ON public.customer_discount_subscriptions
  FOR SELECT TO anon USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_customer_discount_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_discount_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_customer_discount_subs_customer ON public.customer_discount_subscriptions(customer_id);
CREATE INDEX idx_customer_discount_subs_active ON public.customer_discount_subscriptions(customer_id, is_active) WHERE is_active = true;
