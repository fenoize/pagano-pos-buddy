CREATE OR REPLACE FUNCTION public.evaluate_campaigns_for_order(p_customer_id uuid, p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign RECORD;
  v_results jsonb := '[]'::jsonb;
  v_claimed boolean;
  v_order RECORD;
  v_item_count integer;
  v_total_spent numeric;
  v_order_count integer;
  v_conditions jsonb;
  v_runa_value numeric;
  v_base_runas integer;
  v_multiplier numeric;
  v_bonus_runas integer;
  v_handled boolean;
  v_reward_override integer;
BEGIN
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
    v_handled := false;
    v_reward_override := NULL;

    CASE v_campaign.campaign_type
      WHEN 'first_purchase' THEN
        SELECT COUNT(*) INTO v_order_count
        FROM orders
        WHERE customer_id = p_customer_id
          AND status != 'Cancelado'
          AND id != p_order_id;
        IF v_order_count = 0 THEN
          v_claimed := check_and_claim_campaign(p_customer_id, v_campaign.id, p_order_id);
        END IF;

      WHEN 'product_purchase' THEN
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
        SELECT COALESCE(SUM(total), 0) INTO v_total_spent
        FROM orders
        WHERE customer_id = p_customer_id
          AND status != 'Cancelado'
          AND created_at >= v_campaign.starts_at
          AND created_at <= v_campaign.ends_at;
        IF v_total_spent >= COALESCE((v_conditions->>'min_amount')::numeric, 0) THEN
          v_claimed := check_and_claim_campaign(p_customer_id, v_campaign.id, p_order_id);
        END IF;

      WHEN 'runas_multiplier' THEN
        SELECT NULLIF(value::text, 'null')::numeric INTO v_runa_value
        FROM config WHERE key = 'runa_value' LIMIT 1;
        IF v_runa_value IS NULL OR v_runa_value = 0 THEN
          v_runa_value := 5000;
        END IF;

        v_multiplier := COALESCE((v_conditions->>'multiplier')::numeric, 2);
        v_base_runas := FLOOR(v_order.total / v_runa_value)::integer;
        v_bonus_runas := FLOOR(v_base_runas * (v_multiplier - 1))::integer;

        IF v_bonus_runas > 0 THEN
          v_claimed := check_and_claim_campaign(p_customer_id, v_campaign.id, p_order_id);
          IF v_claimed THEN
            v_results := v_results || jsonb_build_object(
              'campaign_id', v_campaign.id,
              'title', v_campaign.title,
              'runas', v_bonus_runas
            );
            v_handled := true;
          END IF;
        END IF;
    END CASE;

    IF v_claimed AND NOT v_handled THEN
      v_results := v_results || jsonb_build_object(
        'campaign_id', v_campaign.id,
        'title', v_campaign.title,
        'runas', v_campaign.reward_runas
      );
    END IF;
  END LOOP;

  RETURN v_results;
END;
$function$;