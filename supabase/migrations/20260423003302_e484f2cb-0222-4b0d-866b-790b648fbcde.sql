CREATE OR REPLACE FUNCTION public.track_marketing_alliance_purchase(_customer_id UUID, _order_id UUID, _amount NUMERIC DEFAULT 0, _metadata JSONB DEFAULT '{}'::jsonb)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attr public.marketing_alliance_attributions%ROWTYPE;
BEGIN
  SELECT * INTO _attr
  FROM public.marketing_alliance_attributions
  WHERE customer_id = _customer_id
  ORDER BY signed_up_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF _attr.id IS NULL OR _order_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.marketing_alliance_attributions
  SET first_purchase_at = COALESCE(first_purchase_at, now()),
      first_order_id = COALESCE(first_order_id, _order_id)
  WHERE id = _attr.id;

  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, customer_id, order_id, amount, metadata)
  VALUES (_attr.alliance_id, 'purchase', _customer_id, _order_id, COALESCE(_amount, 0), COALESCE(_metadata, '{}'::jsonb));

  UPDATE public.marketing_alliance_benefits
  SET status = 'applied', applied_at = now(), order_id = _order_id
  WHERE alliance_id = _attr.alliance_id
    AND customer_id = _customer_id
    AND status = 'pending'
    AND benefit_type = 'coupon';

  IF COALESCE((_metadata->>'alliance_free_delivery_applied')::boolean, false) THEN
    UPDATE public.marketing_alliance_benefits
    SET status = 'applied', applied_at = now(), order_id = _order_id
    WHERE alliance_id = _attr.alliance_id
      AND customer_id = _customer_id
      AND status = 'pending'
      AND benefit_type = 'free_delivery';
  END IF;

  INSERT INTO public.marketing_alliance_events (alliance_id, event_type, customer_id, order_id, amount, metadata)
  SELECT alliance_id, 'reward_redeemed', customer_id, _order_id, amount, jsonb_build_object('benefit_type', benefit_type, 'coupon_id', coupon_id)
  FROM public.marketing_alliance_benefits
  WHERE alliance_id = _attr.alliance_id
    AND customer_id = _customer_id
    AND order_id = _order_id
    AND benefit_type IN ('coupon', 'free_delivery');

  RETURN true;
END;
$$;