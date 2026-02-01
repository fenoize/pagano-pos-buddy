-- Actualizar RPC para usar cuenta por defecto cuando no hay account_id
CREATE OR REPLACE FUNCTION public.sync_cash_movement_to_finance(
  p_cash_movement_id UUID,
  p_session_id UUID,
  p_expense_date DATE,
  p_account_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense_id UUID;
  v_default_account_id UUID := '320fffee-cf4b-41d7-b828-dfbbcedb6acf'; -- Caja Chica
BEGIN
  -- Verificar que el movimiento de caja existe
  IF NOT EXISTS (SELECT 1 FROM cash_movements WHERE id = p_cash_movement_id) THEN
    RAISE EXCEPTION 'Cash movement not found: %', p_cash_movement_id;
  END IF;

  -- Verificar que no exista ya un egreso para este movimiento
  SELECT id INTO v_expense_id 
  FROM finance_expenses 
  WHERE cash_movement_id = p_cash_movement_id;

  IF v_expense_id IS NOT NULL THEN
    -- Ya existe, retornar el id existente
    RETURN v_expense_id;
  END IF;

  -- Insertar el egreso financiero
  INSERT INTO finance_expenses (
    expense_date,
    account_id,
    amount,
    expense_type,
    category,
    notes,
    payment_method,
    cash_movement_id,
    cash_session_id
  ) VALUES (
    p_expense_date,
    COALESCE(p_account_id, v_default_account_id),
    p_amount,
    'Variable',
    COALESCE(p_category, 'Caja - Movimiento de Turno'),
    p_notes,
    'Efectivo',
    p_cash_movement_id,
    p_session_id
  )
  RETURNING id INTO v_expense_id;

  RETURN v_expense_id;
END;
$$;