
-- 1. RPC segura para validar si un cliente tiene alguna de las etiquetas permitidas de un cupón
CREATE OR REPLACE FUNCTION public.customer_matches_coupon_tags(_customer_id uuid, _coupon_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM public.coupon_allowed_tags WHERE coupon_id = _coupon_id
      ) THEN true
      WHEN _customer_id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1
        FROM public.coupon_allowed_tags cat
        JOIN public.customer_tag_assignments cta
          ON cta.tag_id = cat.tag_id
         AND cta.customer_id = _customer_id
        WHERE cat.coupon_id = _coupon_id
      )
    END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_matches_coupon_tags(uuid, uuid) TO anon, authenticated;

-- 2. Endurecer claim_marketing_alliance_signup para evitar beneficios duplicados
CREATE OR REPLACE FUNCTION public.claim_marketing_alliance_signup(_slug text, _session_id text, _customer_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _alliance public.marketing_alliances%ROWTYPE;
  _already_count INTEGER;
  _has_runas_benefit BOOLEAN;
  _has_coupon_benefit BOOLEAN;
  _has_free_delivery_benefit BOOLEAN;
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

  -- Verificar beneficios existentes para no duplicar
  SELECT EXISTS(SELECT 1 FROM public.marketing_alliance_benefits WHERE alliance_id=_alliance.id AND customer_id=_customer_id AND benefit_type='runas') INTO _has_runas_benefit;
  SELECT EXISTS(SELECT 1 FROM public.marketing_alliance_benefits WHERE alliance_id=_alliance.id AND customer_id=_customer_id AND benefit_type='coupon') INTO _has_coupon_benefit;
  SELECT EXISTS(SELECT 1 FROM public.marketing_alliance_benefits WHERE alliance_id=_alliance.id AND customer_id=_customer_id AND benefit_type='free_delivery') INTO _has_free_delivery_benefit;

  IF _alliance.welcome_runas > 0 AND NOT _has_runas_benefit THEN
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

  IF _alliance.coupon_id IS NOT NULL AND NOT _has_coupon_benefit THEN
    INSERT INTO public.marketing_alliance_benefits (alliance_id, customer_id, benefit_type, coupon_id, status, metadata)
    VALUES (_alliance.id, _customer_id, 'coupon', _alliance.coupon_id, 'pending', jsonb_build_object('reason', 'alliance_associated'));

    INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata)
    VALUES (_alliance.id, 'reward_granted', _session_id, _customer_id, jsonb_build_object('benefit_type', 'coupon', 'coupon_id', _alliance.coupon_id));
  END IF;

  IF (_alliance.free_delivery_first_order OR jsonb_array_length(COALESCE(_alliance.free_delivery_addresses, '[]'::jsonb)) > 0)
     AND NOT _has_free_delivery_benefit THEN
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

  -- Registrar el evento signup siempre (para analytics), aunque ya tuviera beneficios
  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, session_id, customer_id, metadata)
  VALUES (_alliance.id, 'signup', _session_id, _customer_id, jsonb_build_object('source', 'customer_signup'));

  RETURN true;
END;
$function$;

-- 3. Limpiar duplicados existentes de beneficios (mantener el más antiguo por (alliance, customer, benefit_type))
DELETE FROM public.marketing_alliance_benefits b
USING public.marketing_alliance_benefits b2
WHERE b.alliance_id = b2.alliance_id
  AND b.customer_id = b2.customer_id
  AND b.benefit_type = b2.benefit_type
  AND b.granted_at > b2.granted_at;
