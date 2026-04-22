CREATE TABLE IF NOT EXISTS public.marketing_alliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'empresa_aliada',
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  welcome_runas INTEGER NOT NULL DEFAULT 0,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  free_delivery_first_order BOOLEAN NOT NULL DEFAULT false,
  usage_limit INTEGER,
  once_per_customer BOOLEAN NOT NULL DEFAULT true,
  internal_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_alliances_type_check CHECK (type IN ('empresa_aliada', 'embajador', 'convenio', 'otro')),
  CONSTRAINT marketing_alliances_welcome_runas_check CHECK (welcome_runas >= 0),
  CONSTRAINT marketing_alliances_usage_limit_check CHECK (usage_limit IS NULL OR usage_limit > 0),
  CONSTRAINT marketing_alliances_slug_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS public.marketing_alliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID NOT NULL REFERENCES public.marketing_alliances(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_alliance_events_type_check CHECK (event_type IN ('view', 'signup', 'reward_granted', 'purchase', 'reward_redeemed'))
);

CREATE TABLE IF NOT EXISTS public.marketing_alliance_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID NOT NULL REFERENCES public.marketing_alliances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  session_id TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_up_at TIMESTAMPTZ,
  first_purchase_at TIMESTAMPTZ,
  first_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, alliance_id)
);

CREATE TABLE IF NOT EXISTS public.marketing_alliance_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID NOT NULL REFERENCES public.marketing_alliances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT marketing_alliance_benefits_type_check CHECK (benefit_type IN ('runas', 'coupon', 'free_delivery')),
  CONSTRAINT marketing_alliance_benefits_status_check CHECK (status IN ('pending', 'applied', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_marketing_alliances_slug_active ON public.marketing_alliances(slug, is_active);
CREATE INDEX IF NOT EXISTS idx_marketing_alliance_events_alliance_created ON public.marketing_alliance_events(alliance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_alliance_events_type_created ON public.marketing_alliance_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_alliance_events_customer ON public.marketing_alliance_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_marketing_alliance_attributions_customer ON public.marketing_alliance_attributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_marketing_alliance_benefits_customer_status ON public.marketing_alliance_benefits(customer_id, status);

ALTER TABLE public.marketing_alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_alliance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_alliance_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_alliance_benefits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage marketing alliances" ON public.marketing_alliances;
CREATE POLICY "Admins manage marketing alliances" ON public.marketing_alliances FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Administrador' AND u.active = true)) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Administrador' AND u.active = true));

DROP POLICY IF EXISTS "Public can view active alliance landing" ON public.marketing_alliances;
CREATE POLICY "Public can view active alliance landing" ON public.marketing_alliances FOR SELECT USING (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));

DROP POLICY IF EXISTS "Admins view alliance events" ON public.marketing_alliance_events;
CREATE POLICY "Admins view alliance events" ON public.marketing_alliance_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Administrador' AND u.active = true));

DROP POLICY IF EXISTS "Admins view alliance attributions" ON public.marketing_alliance_attributions;
CREATE POLICY "Admins view alliance attributions" ON public.marketing_alliance_attributions FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Administrador' AND u.active = true));

DROP POLICY IF EXISTS "Admins view alliance benefits" ON public.marketing_alliance_benefits;
CREATE POLICY "Admins view alliance benefits" ON public.marketing_alliance_benefits FOR SELECT USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Administrador' AND u.active = true));

DROP POLICY IF EXISTS "Customers view own alliance benefits" ON public.marketing_alliance_benefits;
CREATE POLICY "Customers view own alliance benefits" ON public.marketing_alliance_benefits FOR SELECT USING (customer_id IN (SELECT id FROM public.customers WHERE auth_user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_marketing_alliances_updated_at ON public.marketing_alliances;
CREATE TRIGGER touch_marketing_alliances_updated_at BEFORE UPDATE ON public.marketing_alliances FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_marketing_alliance_attributions_updated_at ON public.marketing_alliance_attributions;
CREATE TRIGGER touch_marketing_alliance_attributions_updated_at BEFORE UPDATE ON public.marketing_alliance_attributions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.get_marketing_alliance_by_slug(_slug TEXT)
RETURNS TABLE (id UUID, name TEXT, type TEXT, slug TEXT, description TEXT, welcome_runas INTEGER, coupon_id UUID, free_delivery_first_order BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ma.id, ma.name, ma.type, ma.slug, ma.description, ma.welcome_runas, ma.coupon_id, ma.free_delivery_first_order
  FROM public.marketing_alliances ma
  WHERE ma.slug = _slug AND ma.is_active = true AND (ma.starts_at IS NULL OR ma.starts_at <= now()) AND (ma.ends_at IS NULL OR ma.ends_at >= now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.track_marketing_alliance_view(_slug TEXT, _session_id TEXT, _metadata JSONB DEFAULT '{}'::jsonb)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _alliance_id UUID; _event_id UUID;
BEGIN
  SELECT id INTO _alliance_id FROM public.marketing_alliances WHERE slug = _slug AND is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()) LIMIT 1;
  IF _alliance_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, metadata) VALUES (_alliance_id, 'view', _session_id, COALESCE(_metadata, '{}'::jsonb)) RETURNING id INTO _event_id;
  RETURN _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_marketing_alliance_signup(_slug TEXT, _session_id TEXT, _customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _alliance public.marketing_alliances%ROWTYPE; _already_count INTEGER;
BEGIN
  SELECT * INTO _alliance FROM public.marketing_alliances WHERE slug = _slug AND is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()) LIMIT 1;
  IF _alliance.id IS NULL OR _customer_id IS NULL THEN RETURN false; END IF;
  IF _alliance.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO _already_count FROM public.marketing_alliance_attributions WHERE alliance_id = _alliance.id;
    IF _already_count >= _alliance.usage_limit THEN RETURN false; END IF;
  END IF;
  INSERT INTO public.marketing_alliance_attributions (alliance_id, customer_id, session_id, signed_up_at) VALUES (_alliance.id, _customer_id, _session_id, now()) ON CONFLICT (customer_id, alliance_id) DO UPDATE SET signed_up_at = COALESCE(public.marketing_alliance_attributions.signed_up_at, now()), session_id = COALESCE(public.marketing_alliance_attributions.session_id, EXCLUDED.session_id);
  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata) VALUES (_alliance.id, 'signup', _session_id, _customer_id, jsonb_build_object('source', 'customer_signup'));
  IF _alliance.welcome_runas > 0 THEN
    INSERT INTO public.customer_points_log (customer_id, type, amount, description) VALUES (_customer_id, 'promo', _alliance.welcome_runas, 'Alianza: ' || _alliance.name);
    UPDATE public.customers SET cantidad_runas = COALESCE(cantidad_runas, 0) + _alliance.welcome_runas, updated_at = now() WHERE id = _customer_id;
    INSERT INTO public.marketing_alliance_benefits (alliance_id, customer_id, benefit_type, amount, status, applied_at, metadata) VALUES (_alliance.id, _customer_id, 'runas', _alliance.welcome_runas, 'applied', now(), jsonb_build_object('reason', 'signup'));
    INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, amount, metadata) VALUES (_alliance.id, 'reward_granted', _session_id, _customer_id, _alliance.welcome_runas, jsonb_build_object('benefit_type', 'runas'));
  END IF;
  IF _alliance.coupon_id IS NOT NULL THEN
    INSERT INTO public.marketing_alliance_benefits (alliance_id, customer_id, benefit_type, coupon_id, status, metadata) VALUES (_alliance.id, _customer_id, 'coupon', _alliance.coupon_id, 'pending', jsonb_build_object('reason', 'first_order'));
    INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata) VALUES (_alliance.id, 'reward_granted', _session_id, _customer_id, jsonb_build_object('benefit_type', 'coupon', 'coupon_id', _alliance.coupon_id));
  END IF;
  IF _alliance.free_delivery_first_order THEN
    INSERT INTO public.marketing_alliance_benefits (alliance_id, customer_id, benefit_type, status, metadata) VALUES (_alliance.id, _customer_id, 'free_delivery', 'pending', jsonb_build_object('reason', 'first_order'));
    INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata) VALUES (_alliance.id, 'reward_granted', _session_id, _customer_id, jsonb_build_object('benefit_type', 'free_delivery'));
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_marketing_alliance_purchase(_customer_id UUID, _order_id UUID, _amount NUMERIC DEFAULT 0, _metadata JSONB DEFAULT '{}'::jsonb)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attr public.marketing_alliance_attributions%ROWTYPE;
BEGIN
  SELECT * INTO _attr FROM public.marketing_alliance_attributions WHERE customer_id = _customer_id ORDER BY signed_up_at DESC NULLS LAST, created_at DESC LIMIT 1;
  IF _attr.id IS NULL OR _order_id IS NULL THEN RETURN false; END IF;
  UPDATE public.marketing_alliance_attributions SET first_purchase_at = COALESCE(first_purchase_at, now()), first_order_id = COALESCE(first_order_id, _order_id) WHERE id = _attr.id;
  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, customer_id, order_id, amount, metadata) VALUES (_attr.alliance_id, 'purchase', _customer_id, _order_id, COALESCE(_amount, 0), COALESCE(_metadata, '{}'::jsonb));
  UPDATE public.marketing_alliance_benefits SET status = 'applied', applied_at = now(), order_id = _order_id WHERE alliance_id = _attr.alliance_id AND customer_id = _customer_id AND status = 'pending' AND benefit_type IN ('coupon', 'free_delivery');
  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, customer_id, order_id, amount, metadata) SELECT alliance_id, 'reward_redeemed', customer_id, _order_id, amount, jsonb_build_object('benefit_type', benefit_type, 'coupon_id', coupon_id) FROM public.marketing_alliance_benefits WHERE alliance_id = _attr.alliance_id AND customer_id = _customer_id AND order_id = _order_id AND benefit_type IN ('coupon', 'free_delivery');
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_marketing_alliance_kpis(_start_date TIMESTAMPTZ DEFAULT NULL, _end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (alliance_id UUID, name TEXT, type TEXT, slug TEXT, is_active BOOLEAN, views BIGINT, signups BIGINT, purchases BIGINT, revenue NUMERIC, runas_granted NUMERIC, rewards_redeemed BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ma.id, ma.name, ma.type, ma.slug, ma.is_active,
    count(*) FILTER (WHERE e.event_type = 'view') AS views,
    count(*) FILTER (WHERE e.event_type = 'signup') AS signups,
    count(*) FILTER (WHERE e.event_type = 'purchase') AS purchases,
    COALESCE(sum(e.amount) FILTER (WHERE e.event_type = 'purchase'), 0) AS revenue,
    COALESCE(sum(e.amount) FILTER (WHERE e.event_type = 'reward_granted' AND e.metadata->>'benefit_type' = 'runas'), 0) AS runas_granted,
    count(*) FILTER (WHERE e.event_type = 'reward_redeemed') AS rewards_redeemed
  FROM public.marketing_alliances ma
  LEFT JOIN public.marketing_alliance_events e ON e.alliance_id = ma.id AND (_start_date IS NULL OR e.created_at >= _start_date) AND (_end_date IS NULL OR e.created_at <= _end_date)
  WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Administrador' AND u.active = true)
  GROUP BY ma.id, ma.name, ma.type, ma.slug, ma.is_active
  ORDER BY ma.created_at DESC;
$$;