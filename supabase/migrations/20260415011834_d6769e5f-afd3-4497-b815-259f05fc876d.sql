
CREATE OR REPLACE FUNCTION public.update_fidelization_settings(p_settings jsonb, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_value jsonb;
  v_allowed_keys text[] := ARRAY[
    'runa_value',
    'runa_reward_value',
    'max_runas_per_order',
    'min_purchase_for_runas',
    'runa_expiry_days',
    'fidelization_active',
    'runas_exclude_if_paid_with_runas',
    'runas_exclude_if_discounted',
    'runas_min_eligible_amount'
  ];
  v_result jsonb;
BEGIN
  -- Validate admin
  IF NOT public.is_user_admin(p_user_id) THEN
    RAISE EXCEPTION 'Permission denied: only administrators can update fidelization settings';
  END IF;

  -- Upsert each allowed key
  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_settings)
  LOOP
    IF v_key = ANY(v_allowed_keys) THEN
      INSERT INTO public.config (key, value, updated_at)
      VALUES (v_key, v_value, now())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now();
    END IF;
  END LOOP;

  -- Return updated settings
  SELECT jsonb_object_agg(key, value) INTO v_result
  FROM public.config
  WHERE key = ANY(v_allowed_keys);

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;
