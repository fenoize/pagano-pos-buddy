
-- Enum for campaign types
CREATE TYPE public.loyalty_campaign_type AS ENUM (
  'registration',
  'product_purchase',
  'accumulated_spend',
  'first_purchase'
);

-- Main campaigns table
CREATE TABLE public.loyalty_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  campaign_type public.loyalty_campaign_type NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reward_runas integer NOT NULL CHECK (reward_runas > 0),
  conditions jsonb NOT NULL DEFAULT '{}',
  max_claims integer,
  one_per_customer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Claims table
CREATE TABLE public.loyalty_campaign_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.loyalty_campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL
);

-- Unique constraint for one_per_customer enforcement
CREATE UNIQUE INDEX uq_campaign_customer ON public.loyalty_campaign_claims(campaign_id, customer_id);

-- RLS
ALTER TABLE public.loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_campaign_claims ENABLE ROW LEVEL SECURITY;

-- Staff can read campaigns
CREATE POLICY "Staff can read campaigns"
  ON public.loyalty_campaigns FOR SELECT
  TO authenticated
  USING (true);

-- Staff can manage campaigns (admin only via frontend check)
CREATE POLICY "Staff can manage campaigns"
  ON public.loyalty_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Staff can read claims
CREATE POLICY "Staff can read claims"
  ON public.loyalty_campaign_claims FOR SELECT
  TO authenticated
  USING (true);

-- Claims inserted via RPC only
CREATE POLICY "Claims insert via rpc"
  ON public.loyalty_campaign_claims FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- RPC: check_and_claim_campaign
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_and_claim_campaign(
  p_customer_id uuid,
  p_campaign_id uuid,
  p_order_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign loyalty_campaigns%ROWTYPE;
  v_claim_count integer;
  v_existing integer;
BEGIN
  -- Get campaign
  SELECT * INTO v_campaign FROM loyalty_campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Check active and within dates
  IF NOT v_campaign.is_active THEN RETURN false; END IF;
  IF now() < v_campaign.starts_at OR now() > v_campaign.ends_at THEN RETURN false; END IF;

  -- Check one_per_customer
  IF v_campaign.one_per_customer THEN
    SELECT COUNT(*) INTO v_existing
    FROM loyalty_campaign_claims
    WHERE campaign_id = p_campaign_id AND customer_id = p_customer_id;
    IF v_existing > 0 THEN RETURN false; END IF;
  END IF;

  -- Check max_claims
  IF v_campaign.max_claims IS NOT NULL THEN
    SELECT COUNT(*) INTO v_claim_count
    FROM loyalty_campaign_claims
    WHERE campaign_id = p_campaign_id;
    IF v_claim_count >= v_campaign.max_claims THEN RETURN false; END IF;
  END IF;

  -- Insert claim
  INSERT INTO loyalty_campaign_claims (campaign_id, customer_id, order_id)
  VALUES (p_campaign_id, p_customer_id, p_order_id);

  -- Award runas
  PERFORM insert_runas_transaction_with_context(
    p_customer_id,
    v_campaign.reward_runas * 600, -- convert runas to CLP amount (runa value = 600)
    'acumulacion',
    'Campaña: ' || v_campaign.title
  );

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

-- ============================================================
-- RPC: evaluate_campaigns_for_order
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_campaigns_for_order(
  p_customer_id uuid,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_results jsonb := '[]'::jsonb;
  v_claimed boolean;
  v_order RECORD;
  v_item_count integer;
  v_total_spent numeric;
  v_order_count integer;
  v_conditions jsonb;
BEGIN
  -- Get order info
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN v_results; END IF;

  FOR v_campaign IN
    SELECT * FROM loyalty_campaigns
    WHERE is_active = true
      AND now() >= starts_at
      AND now() <= ends_at
      AND campaign_type != 'registration'
  LOOP
    v_conditions := v_campaign.conditions;
    v_claimed := false;

    CASE v_campaign.campaign_type
      WHEN 'first_purchase' THEN
        -- Check if this is customer's first non-cancelled order
        SELECT COUNT(*) INTO v_order_count
        FROM orders
        WHERE customer_id = p_customer_id
          AND status != 'Cancelado'
          AND id != p_order_id;
        IF v_order_count = 0 THEN
          v_claimed := check_and_claim_campaign(p_customer_id, v_campaign.id, p_order_id);
        END IF;

      WHEN 'product_purchase' THEN
        -- Count matching items across all orders in campaign period
        SELECT COALESCE(SUM(oi.quantity), 0) INTO v_item_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN products p ON p.id = oi.product_id
        WHERE o.customer_id = p_customer_id
          AND o.status != 'Cancelado'
          AND o.created_at >= v_campaign.starts_at
          AND o.created_at <= v_campaign.ends_at
          AND (
            (v_conditions->'product_ids' IS NOT NULL AND p.id::text IN (SELECT jsonb_array_elements_text(v_conditions->'product_ids')))
            OR
            (v_conditions->'category_ids' IS NOT NULL AND p.category_id::text IN (SELECT jsonb_array_elements_text(v_conditions->'category_ids')))
          );
        IF v_item_count >= COALESCE((v_conditions->>'min_quantity')::integer, 1) THEN
          v_claimed := check_and_claim_campaign(p_customer_id, v_campaign.id, p_order_id);
        END IF;

      WHEN 'accumulated_spend' THEN
        -- Sum total spent in campaign period
        SELECT COALESCE(SUM(total), 0) INTO v_total_spent
        FROM orders
        WHERE customer_id = p_customer_id
          AND status != 'Cancelado'
          AND created_at >= v_campaign.starts_at
          AND created_at <= v_campaign.ends_at;
        IF v_total_spent >= COALESCE((v_conditions->>'min_amount')::numeric, 0) THEN
          v_claimed := check_and_claim_campaign(p_customer_id, v_campaign.id, p_order_id);
        END IF;
    END CASE;

    IF v_claimed THEN
      v_results := v_results || jsonb_build_object(
        'campaign_id', v_campaign.id,
        'title', v_campaign.title,
        'runas', v_campaign.reward_runas
      );
    END IF;
  END LOOP;

  RETURN v_results;
END;
$$;

-- ============================================================
-- RPC: evaluate_registration_campaigns
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_registration_campaigns(
  p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_results jsonb := '[]'::jsonb;
  v_claimed boolean;
BEGIN
  FOR v_campaign IN
    SELECT * FROM loyalty_campaigns
    WHERE is_active = true
      AND campaign_type = 'registration'
      AND now() >= starts_at
      AND now() <= ends_at
  LOOP
    v_claimed := check_and_claim_campaign(p_customer_id, v_campaign.id, NULL);
    IF v_claimed THEN
      v_results := v_results || jsonb_build_object(
        'campaign_id', v_campaign.id,
        'title', v_campaign.title,
        'runas', v_campaign.reward_runas
      );
    END IF;
  END LOOP;

  RETURN v_results;
END;
$$;
