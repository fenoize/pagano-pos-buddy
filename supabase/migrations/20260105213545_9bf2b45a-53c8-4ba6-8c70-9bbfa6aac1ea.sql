-- Agregar columnas start_date y end_date a customer_runa_subscriptions
ALTER TABLE customer_runa_subscriptions
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN customer_runa_subscriptions.start_date IS 'Fecha desde la cual la suscripción está activa';
COMMENT ON COLUMN customer_runa_subscriptions.end_date IS 'Fecha opcional de término (NULL = sin término)';

-- Actualizar la función process_auto_runas para respetar las fechas
CREATE OR REPLACE FUNCTION process_auto_runas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription RECORD;
  v_processed_count INT := 0;
  v_expired_count INT := 0;
  v_result jsonb;
BEGIN
  -- Primero, desactivar suscripciones que han expirado
  UPDATE customer_runa_subscriptions
  SET is_active = false,
      updated_at = NOW()
  WHERE is_active = true
    AND end_date IS NOT NULL
    AND end_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Procesar suscripciones activas que deben ejecutarse hoy
  FOR v_subscription IN
    SELECT crs.*, c.nombres, c.apellidos, c.cantidad_runas
    FROM customer_runa_subscriptions crs
    JOIN customers c ON c.id = crs.customer_id
    WHERE crs.is_active = true
      AND crs.next_execution_date <= CURRENT_DATE
      AND (crs.start_date IS NULL OR crs.start_date <= CURRENT_DATE)
      AND (crs.end_date IS NULL OR crs.end_date >= CURRENT_DATE)
  LOOP
    -- Agregar runas al cliente
    UPDATE customers
    SET cantidad_runas = COALESCE(cantidad_runas, 0) + v_subscription.runas_amount,
        updated_at = NOW()
    WHERE id = v_subscription.customer_id;

    -- Registrar la transacción de runas
    INSERT INTO customer_runa_transactions (
      customer_id,
      amount,
      type,
      description,
      created_at
    ) VALUES (
      v_subscription.customer_id,
      v_subscription.runas_amount,
      'earned',
      CASE v_subscription.subscription_type
        WHEN 'monthly' THEN 'Bono mensual automático'
        WHEN 'weekly' THEN 'Bono semanal automático'
        WHEN 'birthday' THEN 'Bono de cumpleaños'
        ELSE 'Bono automático'
      END,
      NOW()
    );

    -- Actualizar la suscripción con la próxima fecha de ejecución
    UPDATE customer_runa_subscriptions
    SET 
      last_executed_at = NOW(),
      next_execution_date = CASE subscription_type
        WHEN 'monthly' THEN 
          DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        WHEN 'weekly' THEN 
          CURRENT_DATE + INTERVAL '7 days'
        WHEN 'birthday' THEN 
          -- Próximo cumpleaños (mismo día/mes, año siguiente)
          CASE 
            WHEN TO_CHAR(next_execution_date, 'MM-DD') > TO_CHAR(CURRENT_DATE, 'MM-DD')
            THEN next_execution_date
            ELSE next_execution_date + INTERVAL '1 year'
          END
        ELSE next_execution_date + INTERVAL '1 month'
      END,
      updated_at = NOW()
    WHERE id = v_subscription.id;

    v_processed_count := v_processed_count + 1;

    -- Log
    RAISE NOTICE 'Processed subscription % for customer % (% runas)', 
      v_subscription.id, 
      v_subscription.customer_id, 
      v_subscription.runas_amount;
  END LOOP;

  v_result := jsonb_build_object(
    'processed_count', v_processed_count,
    'expired_count', v_expired_count,
    'executed_at', NOW()
  );

  RETURN v_result;
END;
$$;