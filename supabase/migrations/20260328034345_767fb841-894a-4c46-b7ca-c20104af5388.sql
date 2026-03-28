
-- Fix check_and_claim_campaign to call insert_runas_transaction_with_context with correct params
CREATE OR REPLACE FUNCTION public.check_and_claim_campaign(
  p_customer_id uuid,
  p_campaign_id uuid,
  p_order_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign loyalty_campaigns%ROWTYPE;
  v_claim_count integer;
  v_existing integer;
BEGIN
  SELECT * INTO v_campaign FROM loyalty_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN false; END IF;

  IF NOT v_campaign.is_active THEN RETURN false; END IF;
  IF now() < v_campaign.starts_at OR now() > v_campaign.ends_at THEN RETURN false; END IF;

  IF v_campaign.one_per_customer THEN
    SELECT COUNT(*) INTO v_existing
    FROM loyalty_campaign_claims
    WHERE campaign_id = p_campaign_id AND customer_id = p_customer_id;
    IF v_existing > 0 THEN RETURN false; END IF;
  END IF;

  IF v_campaign.max_claims IS NOT NULL THEN
    SELECT COUNT(*) INTO v_claim_count
    FROM loyalty_campaign_claims
    WHERE campaign_id = p_campaign_id;
    IF v_claim_count >= v_campaign.max_claims THEN RETURN false; END IF;
  END IF;

  INSERT INTO loyalty_campaign_claims (campaign_id, customer_id, order_id)
  VALUES (p_campaign_id, p_customer_id, p_order_id);

  -- Award runas with correct parameters
  PERFORM insert_runas_transaction_with_context(
    p_user_id := NULL::uuid,
    p_customer_id := p_customer_id,
    p_order_id := p_order_id,
    p_type := 'acumulacion',
    p_runas := v_campaign.reward_runas,
    p_amount := 0,
    p_origen := 'Campaña',
    p_motivo := 'Campaña: ' || v_campaign.title
  );

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$function$;

-- Award the 3 runas to the customer who already registered
DO $$
DECLARE
  v_customer_id uuid := '9ea5ba2b-468e-4468-b0a4-6de5d5f71f47';
  v_campaign_id uuid := '196bf538-0ee6-43cd-adf3-616ea8a53bea';
BEGIN
  -- Insert claim
  INSERT INTO loyalty_campaign_claims (campaign_id, customer_id, order_id)
  VALUES (v_campaign_id, v_customer_id, NULL)
  ON CONFLICT DO NOTHING;

  -- Insert runas transaction
  PERFORM insert_runas_transaction_with_context(
    p_user_id := NULL::uuid,
    p_customer_id := v_customer_id,
    p_order_id := NULL::uuid,
    p_type := 'acumulacion',
    p_runas := 3,
    p_amount := 0,
    p_origen := 'Campaña',
    p_motivo := 'Campaña: Bonus Bienvenida (corrección manual)'
  );
END;
$$;
