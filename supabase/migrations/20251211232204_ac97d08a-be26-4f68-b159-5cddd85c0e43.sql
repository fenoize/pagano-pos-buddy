-- Función RPC para insertar cash_movements con contexto de staff
CREATE OR REPLACE FUNCTION public.insert_cash_movement_with_context(
  p_user_id uuid,
  p_session_id uuid,
  p_type text,
  p_amount numeric,
  p_note text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
  p_synced_to_finance boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_movement_id uuid;
  v_result jsonb;
BEGIN
  -- Establecer contexto dentro de la misma transacción
  PERFORM set_config('app.user_id', p_user_id::text, false);
  PERFORM set_config('app.customer_id', '', false);
  PERFORM set_config('app.customer_account_id', '', false);
  
  -- Verificar que el usuario tiene permisos
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role IN ('Cajero', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuario no tiene permisos para registrar movimientos de caja';
  END IF;
  
  -- Insertar el movimiento
  INSERT INTO cash_movements (session_id, type, amount, note, category, account_id, synced_to_finance)
  VALUES (p_session_id, p_type::cash_movement_type, p_amount, p_note, p_category, p_account_id, p_synced_to_finance)
  RETURNING id INTO v_movement_id;
  
  -- Obtener el registro completo
  SELECT jsonb_build_object(
    'id', cm.id,
    'session_id', cm.session_id,
    'type', cm.type,
    'amount', cm.amount,
    'note', cm.note,
    'category', cm.category,
    'account_id', cm.account_id,
    'synced_to_finance', cm.synced_to_finance,
    'created_at', cm.created_at
  ) INTO v_result
  FROM cash_movements cm
  WHERE cm.id = v_movement_id;
  
  RETURN v_result;
END;
$$;