CREATE OR REPLACE FUNCTION public.claim_marketing_alliance_signup(_slug TEXT, _session_id TEXT, _customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _alliance public.marketing_alliances%ROWTYPE;
  _already_count INTEGER;
  _existing_attr UUID;
BEGIN
  SELECT * INTO _alliance FROM public.marketing_alliances WHERE slug = _slug AND is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()) LIMIT 1;
  IF _alliance.id IS NULL OR _customer_id IS NULL THEN RETURN false; END IF;

  SELECT id INTO _existing_attr FROM public.marketing_alliance_attributions WHERE alliance_id = _alliance.id AND customer_id = _customer_id LIMIT 1;

  IF _existing_attr IS NULL AND _alliance.usage_limit IS NOT NULL THEN
    SELECT count(*) INTO _already_count FROM public.marketing_alliance_attributions WHERE alliance_id = _alliance.id;
    IF _already_count >= _alliance.usage_limit THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.marketing_alliance_attributions (alliance_id, customer_id, session_id, signed_up_at)
  VALUES (_alliance.id, _customer_id, _session_id, now())
  ON CONFLICT (customer_id, alliance_id) DO UPDATE
  SET signed_up_at = COALESCE(public.marketing_alliance_attributions.signed_up_at, now()),
      session_id = COALESCE(public.marketing_alliance_attributions.session_id, EXCLUDED.session_id);

  IF _existing_attr IS NOT NULL THEN
    RETURN true;
  END IF;

  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata)
  VALUES (_alliance.id, 'signup', _session_id, _customer_id, jsonb_build_object('source', 'customer_signup'));

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