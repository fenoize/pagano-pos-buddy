
CREATE OR REPLACE FUNCTION public.insert_runas_transaction_with_context(p_user_id uuid, p_customer_id uuid, p_order_id uuid, p_type text, p_runas integer, p_amount integer, p_origen text DEFAULT 'POS'::text, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction_id uuid;
  v_current_balance integer;
  v_new_balance integer;
BEGIN
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.user_id', p_user_id::text, true);
    PERFORM set_config('app.customer_id', '', true);
    PERFORM set_config('app.customer_account_id', '', true);
  END IF;

  -- Saldo actual del cliente (fuente de verdad)
  SELECT COALESCE(cantidad_runas, 0) INTO v_current_balance
  FROM customers
  WHERE id = p_customer_id
  FOR UPDATE;

  -- Aplicar delta sobre el saldo actual (nunca menor a 0)
  v_new_balance := GREATEST(0, v_current_balance + p_runas);

  INSERT INTO runas_transactions (
    customer_id, order_id, type, runas, amount, origen, motivo, responsable_id
  ) VALUES (
    p_customer_id, p_order_id, p_type::runa_movement_type, p_runas, p_amount,
    p_origen::origen_movimiento, p_motivo, p_user_id
  )
  RETURNING id INTO v_transaction_id;

  UPDATE customers
  SET cantidad_runas = v_new_balance,
      updated_at = now()
  WHERE id = p_customer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;

-- Reconciliar el saldo del cliente afectado (tenía +4 ajuste manual que no se reflejó)
UPDATE public.customers
SET cantidad_runas = 4, updated_at = now()
WHERE id = 'e088d86f-5538-4604-81fb-b47d08f59e1b' AND cantidad_runas = 0;
