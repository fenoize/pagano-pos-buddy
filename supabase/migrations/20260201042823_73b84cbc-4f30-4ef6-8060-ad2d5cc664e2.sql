-- RPC para sincronizar movimientos de caja a finance_expenses
-- Usa SECURITY DEFINER para bypass RLS ya que cajeros no tienen permisos de finanzas
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
    p_account_id,
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

-- Permisos para que cualquier usuario autenticado pueda llamar esta función
GRANT EXECUTE ON FUNCTION public.sync_cash_movement_to_finance TO authenticated, anon;

COMMENT ON FUNCTION public.sync_cash_movement_to_finance IS 
'Sincroniza un movimiento de caja (egreso) a la tabla finance_expenses. 
Usa SECURITY DEFINER para permitir que cajeros registren egresos sin necesitar permisos de finanzas.';