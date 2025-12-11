-- Función RPC para insertar transacciones de runas con contexto de staff
-- Evita problemas de RLS al establecer contexto y ejecutar INSERT en la misma transacción

CREATE OR REPLACE FUNCTION public.insert_runas_transaction_with_context(
  p_user_id uuid,
  p_customer_id uuid,
  p_order_id uuid,
  p_type text,
  p_runas integer,
  p_amount integer,
  p_origen text DEFAULT 'POS',
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id uuid;
  v_new_balance integer;
  v_result jsonb;
BEGIN
  -- Establecer contexto de staff dentro de la transacción
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.user_id', p_user_id::text, true);
    PERFORM set_config('app.customer_id', '', true);
    PERFORM set_config('app.customer_account_id', '', true);
  END IF;
  
  -- Insertar transacción de runas
  INSERT INTO runas_transactions (
    customer_id, 
    order_id, 
    type, 
    runas, 
    amount, 
    origen, 
    motivo, 
    responsable_id
  ) VALUES (
    p_customer_id, 
    p_order_id, 
    p_type::runa_movement_type, 
    p_runas, 
    p_amount, 
    p_origen::origen_movimiento, 
    p_motivo, 
    p_user_id
  )
  RETURNING id INTO v_transaction_id;
  
  -- Calcular nuevo saldo sumando todas las transacciones
  SELECT COALESCE(SUM(runas), 0) INTO v_new_balance
  FROM runas_transactions
  WHERE customer_id = p_customer_id;
  
  -- Actualizar saldo del cliente
  UPDATE customers 
  SET cantidad_runas = GREATEST(0, v_new_balance),
      updated_at = now()
  WHERE id = p_customer_id;
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', GREATEST(0, v_new_balance)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Corregir transacciones de canje históricas faltantes
-- Buscar órdenes con payment_runas > 0 que no tienen transacción de canje
DO $$
DECLARE
  v_runa_reward_value integer;
  v_missing_count integer;
BEGIN
  -- Obtener valor de canje de runas
  SELECT COALESCE((value)::integer, 600) INTO v_runa_reward_value
  FROM config 
  WHERE key = 'runa_reward_value';
  
  -- Contar transacciones faltantes
  SELECT COUNT(*) INTO v_missing_count
  FROM orders o
  LEFT JOIN runas_transactions rt ON rt.order_id = o.id AND rt.type = 'canje'
  WHERE o.payment_runas > 0
    AND o.customer_id IS NOT NULL
    AND rt.id IS NULL
    AND o.status NOT IN ('Cancelado');
  
  RAISE NOTICE 'Transacciones de canje faltantes encontradas: %', v_missing_count;
  
  -- Insertar transacciones de canje faltantes
  INSERT INTO runas_transactions (customer_id, order_id, type, runas, amount, origen, motivo)
  SELECT 
    o.customer_id,
    o.id,
    'canje'::runa_movement_type,
    -o.payment_runas,
    o.payment_runas * v_runa_reward_value,
    'POS'::origen_movimiento,
    'Corrección automática - transacción de canje faltante'
  FROM orders o
  LEFT JOIN runas_transactions rt ON rt.order_id = o.id AND rt.type = 'canje'
  WHERE o.payment_runas > 0
    AND o.customer_id IS NOT NULL
    AND rt.id IS NULL
    AND o.status NOT IN ('Cancelado');
  
  RAISE NOTICE 'Transacciones de canje insertadas: %', v_missing_count;
END $$;

-- Recalcular saldos de runas de todos los clientes afectados
UPDATE customers c
SET cantidad_runas = GREATEST(0, (
  SELECT COALESCE(SUM(runas), 0)
  FROM runas_transactions rt
  WHERE rt.customer_id = c.id
)),
updated_at = now()
WHERE c.id IN (
  SELECT DISTINCT customer_id FROM runas_transactions
);