
CREATE OR REPLACE FUNCTION public.manage_loyalty_campaign(
  p_action text,
  p_campaign_data jsonb DEFAULT '{}'::jsonb,
  p_campaign_id uuid DEFAULT NULL,
  p_staff_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_result jsonb;
  v_new_id uuid;
BEGIN
  -- Get staff context: prefer parameter, fallback to session variable
  v_staff_id := COALESCE(p_staff_user_id, NULLIF(current_setting('app.user_id', true), '')::uuid);
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'No staff context';
  END IF;

  -- Check admin role
  SELECT role INTO v_role FROM users WHERE id = v_staff_id;
  IF v_role IS DISTINCT FROM 'Administrador' THEN
    RAISE EXCEPTION 'Solo administradores pueden gestionar campañas';
  END IF;

  CASE p_action
    WHEN 'insert' THEN
      INSERT INTO loyalty_campaigns (
        title, description, campaign_type, is_active, starts_at, ends_at,
        reward_runas, conditions, max_claims, one_per_customer
      ) VALUES (
        p_campaign_data->>'title',
        p_campaign_data->>'description',
        (p_campaign_data->>'campaign_type')::loyalty_campaign_type,
        COALESCE((p_campaign_data->>'is_active')::boolean, true),
        (p_campaign_data->>'starts_at')::timestamptz,
        (p_campaign_data->>'ends_at')::timestamptz,
        (p_campaign_data->>'reward_runas')::integer,
        COALESCE(p_campaign_data->'conditions', '{}'::jsonb),
        (p_campaign_data->>'max_claims')::integer,
        COALESCE((p_campaign_data->>'one_per_customer')::boolean, true)
      ) RETURNING id INTO v_new_id;
      v_result := jsonb_build_object('id', v_new_id, 'success', true);

    WHEN 'update' THEN
      IF p_campaign_id IS NULL THEN RAISE EXCEPTION 'campaign_id required'; END IF;
      UPDATE loyalty_campaigns SET
        title = COALESCE(p_campaign_data->>'title', title),
        description = p_campaign_data->>'description',
        campaign_type = COALESCE((p_campaign_data->>'campaign_type')::loyalty_campaign_type, campaign_type),
        is_active = COALESCE((p_campaign_data->>'is_active')::boolean, is_active),
        starts_at = COALESCE((p_campaign_data->>'starts_at')::timestamptz, starts_at),
        ends_at = COALESCE((p_campaign_data->>'ends_at')::timestamptz, ends_at),
        reward_runas = COALESCE((p_campaign_data->>'reward_runas')::integer, reward_runas),
        conditions = COALESCE(p_campaign_data->'conditions', conditions),
        max_claims = (p_campaign_data->>'max_claims')::integer,
        one_per_customer = COALESCE((p_campaign_data->>'one_per_customer')::boolean, one_per_customer)
      WHERE id = p_campaign_id;
      v_result := jsonb_build_object('id', p_campaign_id, 'success', true);

    WHEN 'delete' THEN
      IF p_campaign_id IS NULL THEN RAISE EXCEPTION 'campaign_id required'; END IF;
      DELETE FROM loyalty_campaigns WHERE id = p_campaign_id;
      v_result := jsonb_build_object('id', p_campaign_id, 'success', true);

    WHEN 'toggle' THEN
      IF p_campaign_id IS NULL THEN RAISE EXCEPTION 'campaign_id required'; END IF;
      UPDATE loyalty_campaigns SET is_active = COALESCE((p_campaign_data->>'is_active')::boolean, NOT is_active)
      WHERE id = p_campaign_id;
      v_result := jsonb_build_object('id', p_campaign_id, 'success', true);

    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  RETURN v_result;
END;
$$;
