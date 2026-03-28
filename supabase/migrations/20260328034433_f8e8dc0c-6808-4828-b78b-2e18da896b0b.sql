
-- Award the 3 runas to the customer whose campaign claim was recorded but runas weren't awarded
DO $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT insert_runas_transaction_with_context(
    p_user_id := NULL::uuid,
    p_customer_id := '9ea5ba2b-468e-4468-b0a4-6de5d5f71f47'::uuid,
    p_order_id := NULL::uuid,
    p_type := 'acumulacion',
    p_runas := 3,
    p_amount := 0,
    p_origen := 'Campaña',
    p_motivo := 'Campaña: Bonus Bienvenida (corrección manual)'
  ) INTO v_result;
  
  RAISE NOTICE 'Result: %', v_result;
END;
$$;
