
-- 1. Sales channels table
CREATE TABLE public.sales_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('local','delivery_app','web','phone')),
  color text,
  icon_url text,
  active boolean NOT NULL DEFAULT true,
  integration_enabled boolean NOT NULL DEFAULT false,
  integration_config jsonb,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sales_channels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_channels TO authenticated;
GRANT ALL ON public.sales_channels TO service_role;

ALTER TABLE public.sales_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_channels_select_all"
  ON public.sales_channels FOR SELECT
  USING (true);

CREATE POLICY "sales_channels_admin_insert"
  ON public.sales_channels FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Administrador'::app_role));

CREATE POLICY "sales_channels_admin_update"
  ON public.sales_channels FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Administrador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Administrador'::app_role));

CREATE POLICY "sales_channels_admin_delete"
  ON public.sales_channels FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Administrador'::app_role));

-- updated_at trigger (reuses existing function if present, otherwise create)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sales_channels_updated_at
  BEFORE UPDATE ON public.sales_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial channels
INSERT INTO public.sales_channels (name, slug, type, color, position) VALUES
  ('Local', 'local', 'local', '#475569', 1),
  ('App Paganos', 'app', 'web', '#6366f1', 2),
  ('Rappi', 'rappi', 'delivery_app', '#ff2f5b', 3),
  ('Uber Eats', 'uber_eats', 'delivery_app', '#06c167', 4),
  ('PedidosYa', 'pedidos_ya', 'delivery_app', '#fa0050', 5),
  ('Teléfono', 'phone', 'phone', '#0ea5e9', 6);

-- 2. Add sales_channel_slug to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sales_channel_slug text;
CREATE INDEX IF NOT EXISTS idx_orders_sales_channel_slug ON public.orders (sales_channel_slug);

-- 3. RPC for safe delete check
CREATE OR REPLACE FUNCTION public.can_delete_sales_channel(channel_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.orders WHERE sales_channel_slug = channel_slug
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_delete_sales_channel(text) TO authenticated;
