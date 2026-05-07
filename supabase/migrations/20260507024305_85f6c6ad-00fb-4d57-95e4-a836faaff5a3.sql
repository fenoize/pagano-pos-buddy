ALTER TABLE public.marketing_alliances
  ADD COLUMN IF NOT EXISTS free_delivery_min_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_delivery_time_windows jsonb;

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
    VALUES (_alliance.id, _customer_id, 'coupon', _alliance.coupon_id, 'pending', jsonb_build_object('reason', 'alliance_associated'));

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
        'addresses', COALESCE(_alliance.free_delivery_addresses, '[]'::jsonb),
        'min_amount', COALESCE(_alliance.free_delivery_min_amount, 0),
        'time_windows', COALESCE(_alliance.free_delivery_time_windows, 'null'::jsonb)
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