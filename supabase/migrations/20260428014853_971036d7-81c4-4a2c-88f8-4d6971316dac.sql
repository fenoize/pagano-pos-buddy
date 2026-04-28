
-- =====================================================
-- 1. Catálogo de etiquetas
-- =====================================================
CREATE TABLE public.customer_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  auto_source TEXT NOT NULL DEFAULT 'manual' CHECK (auto_source IN ('manual','alliance','campaign','system')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unicidad case-insensitive del nombre
CREATE UNIQUE INDEX customer_tags_name_lower_idx ON public.customer_tags (lower(name));

ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;

-- Función helper: cualquier rol staff
CREATE OR REPLACE FUNCTION public.is_staff_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "Staff can view customer_tags"
  ON public.customer_tags FOR SELECT
  TO authenticated
  USING (public.is_staff_user(auth.uid()));

CREATE POLICY "Staff can insert customer_tags"
  ON public.customer_tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_user(auth.uid()));

CREATE POLICY "Staff can update customer_tags"
  ON public.customer_tags FOR UPDATE
  TO authenticated
  USING (public.is_staff_user(auth.uid()));

CREATE POLICY "Staff can delete customer_tags"
  ON public.customer_tags FOR DELETE
  TO authenticated
  USING (public.is_staff_user(auth.uid()));

CREATE TRIGGER update_customer_tags_updated_at
  BEFORE UPDATE ON public.customer_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. Asignaciones cliente <-> etiqueta
-- =====================================================
CREATE TABLE public.customer_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','alliance','campaign','import','system')),
  source_ref_id UUID,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_tag_assignments_unique UNIQUE (customer_id, tag_id)
);

CREATE INDEX customer_tag_assignments_customer_idx ON public.customer_tag_assignments(customer_id);
CREATE INDEX customer_tag_assignments_tag_idx ON public.customer_tag_assignments(tag_id);

ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view customer_tag_assignments"
  ON public.customer_tag_assignments FOR SELECT
  TO authenticated
  USING (public.is_staff_user(auth.uid()));

CREATE POLICY "Staff can insert customer_tag_assignments"
  ON public.customer_tag_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_user(auth.uid()));

CREATE POLICY "Staff can update customer_tag_assignments"
  ON public.customer_tag_assignments FOR UPDATE
  TO authenticated
  USING (public.is_staff_user(auth.uid()));

CREATE POLICY "Staff can delete customer_tag_assignments"
  ON public.customer_tag_assignments FOR DELETE
  TO authenticated
  USING (public.is_staff_user(auth.uid()));

-- =====================================================
-- 3. Vínculo con alianzas
-- =====================================================
ALTER TABLE public.marketing_alliances
  ADD COLUMN auto_tag_id UUID REFERENCES public.customer_tags(id) ON DELETE SET NULL;

-- =====================================================
-- 4. RPCs
-- =====================================================

-- Asignar etiqueta (idempotente)
CREATE OR REPLACE FUNCTION public.assign_customer_tag(
  _customer_id UUID,
  _tag_id UUID,
  _source TEXT DEFAULT 'manual',
  _source_ref_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assignment_id UUID;
BEGIN
  IF _customer_id IS NULL OR _tag_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.customer_tag_assignments
    (customer_id, tag_id, source, source_ref_id, assigned_by)
  VALUES
    (_customer_id, _tag_id, COALESCE(_source, 'manual'), _source_ref_id, auth.uid())
  ON CONFLICT (customer_id, tag_id) DO UPDATE
    SET source = EXCLUDED.source,
        source_ref_id = EXCLUDED.source_ref_id
  RETURNING id INTO _assignment_id;

  RETURN _assignment_id;
END;
$$;

-- Quitar etiqueta
CREATE OR REPLACE FUNCTION public.remove_customer_tag(
  _customer_id UUID,
  _tag_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.customer_tag_assignments
  WHERE customer_id = _customer_id AND tag_id = _tag_id;
  RETURN FOUND;
END;
$$;

-- Listado del catálogo con conteo de clientes
CREATE OR REPLACE FUNCTION public.list_customer_tags_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  color TEXT,
  description TEXT,
  auto_source TEXT,
  customer_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.color,
    t.description,
    t.auto_source,
    COUNT(a.id) AS customer_count,
    t.created_at
  FROM public.customer_tags t
  LEFT JOIN public.customer_tag_assignments a ON a.tag_id = t.id
  GROUP BY t.id
  ORDER BY t.name ASC;
$$;

-- =====================================================
-- 5. Actualizar claim_marketing_alliance_signup para
--    auto-asignar la etiqueta de la alianza
-- =====================================================
CREATE OR REPLACE FUNCTION public.claim_marketing_alliance_signup(_slug text, _session_id text, _customer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _alliance public.marketing_alliances%ROWTYPE;
  _already_count INTEGER;
BEGIN
  SELECT * INTO _alliance
  FROM public.marketing_alliances
  WHERE slug = _slug
    AND is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  LIMIT 1;

  IF _alliance.id IS NULL OR _customer_id IS NULL THEN
    RETURN false;
  END IF;

  IF _alliance.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO _already_count
    FROM public.marketing_alliance_attributions
    WHERE alliance_id = _alliance.id;

    IF _already_count >= _alliance.usage_limit THEN
      RETURN false;
    END IF;
  END IF;

  INSERT INTO public.marketing_alliance_attributions (alliance_id, customer_id, session_id, signed_up_at)
  VALUES (_alliance.id, _customer_id, _session_id, now())
  ON CONFLICT (customer_id, alliance_id)
  DO UPDATE SET
    signed_up_at = COALESCE(public.marketing_alliance_attributions.signed_up_at, now()),
    session_id = COALESCE(public.marketing_alliance_attributions.session_id, EXCLUDED.session_id);

  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata)
  VALUES (_alliance.id, 'signup', _session_id, _customer_id, jsonb_build_object('source', 'customer_signup'));

  IF _alliance.welcome_runas > 0 THEN
    INSERT INTO public.customer_points_log (customer_id, type, amount, description)
    VALUES (_customer_id, 'promo', _alliance.welcome_runas, 'Alianza: ' || _alliance.name);

    UPDATE public.customers
    SET cantidad_runas = COALESCE(cantidad_runas, 0) + _alliance.welcome_runas,
        updated_at = now()
    WHERE id = _customer_id;

    INSERT INTO public.marketing_alliance_benefits (alliance_id, customer_id, benefit_type, amount, status, applied_at, metadata)
    VALUES (_alliance.id, _customer_id, 'runas', _alliance.welcome_runas, 'applied', now(), jsonb_build_object('reason', 'signup'));

    INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, amount, metadata)
    VALUES (_alliance.id, 'reward_granted', _session_id, _customer_id, _alliance.welcome_runas, jsonb_build_object('benefit_type', 'runas'));
  END IF;

  IF _alliance.coupon_id IS NOT NULL THEN
    INSERT INTO public.marketing_alliance_benefits (alliance_id, customer_id, benefit_type, coupon_id, status, metadata)
    VALUES (_alliance.id, _customer_id, 'coupon', _alliance.coupon_id, 'pending', jsonb_build_object('reason', 'first_order'));

    INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata)
    VALUES (_alliance.id, 'reward_granted', _session_id, _customer_id, jsonb_build_object('benefit_type', 'coupon', 'coupon_id', _alliance.coupon_id));
  END IF;

  IF _alliance.free_delivery_first_order OR jsonb_array_length(COALESCE(_alliance.free_delivery_addresses, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.marketing_alliance_benefits (alliance_id, customer_id, benefit_type, status, metadata)
    VALUES (
      _alliance.id,
      _customer_id,
      'free_delivery',
      'pending',
      jsonb_build_object(
        'reason', CASE WHEN _alliance.free_delivery_first_order THEN 'first_order' ELSE 'exact_addresses' END,
        'free_delivery_first_order', _alliance.free_delivery_first_order,
        'addresses', COALESCE(_alliance.free_delivery_addresses, '[]'::jsonb)
      )
    );

    INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata)
    VALUES (
      _alliance.id,
      'reward_granted',
      _session_id,
      _customer_id,
      jsonb_build_object(
        'benefit_type', 'free_delivery',
        'free_delivery_first_order', _alliance.free_delivery_first_order,
        'addresses_count', jsonb_array_length(COALESCE(_alliance.free_delivery_addresses, '[]'::jsonb))
      )
    );
  END IF;

  -- Auto-asignar etiqueta de la alianza (si está configurada)
  IF _alliance.auto_tag_id IS NOT NULL THEN
    INSERT INTO public.customer_tag_assignments
      (customer_id, tag_id, source, source_ref_id)
    VALUES
      (_customer_id, _alliance.auto_tag_id, 'alliance', _alliance.id)
    ON CONFLICT (customer_id, tag_id) DO NOTHING;
  END IF;

  RETURN true;
END;
$function$;
