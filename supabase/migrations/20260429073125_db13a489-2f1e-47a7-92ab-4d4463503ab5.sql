-- 1) Agregar 'transferencia' al enum cash_movement_type
ALTER TYPE cash_movement_type ADD VALUE IF NOT EXISTS 'transferencia';

-- 2) Agregar columna account_to_id a cash_movements para transferencias (cuenta destino)
ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS account_to_id uuid REFERENCES public.finance_accounts(id);

COMMENT ON COLUMN public.cash_movements.account_id IS 'Para egresos: cuenta de origen. Para transferencias: cuenta de origen.';
COMMENT ON COLUMN public.cash_movements.account_to_id IS 'Solo para transferencias: cuenta de destino.';

-- 3) RPC para registrar una transferencia entre cuentas de manera atómica.
--    Actualiza balances de ambas cuentas y crea el cash_movement vinculado al turno.
CREATE OR REPLACE FUNCTION public.register_account_transfer(
  p_session_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount integer,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance numeric;
  v_movement_id uuid;
BEGIN
  IF p_from_account_id IS NULL OR p_to_account_id IS NULL THEN
    RAISE EXCEPTION 'Debes indicar cuenta origen y cuenta destino';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'La cuenta origen y la cuenta destino no pueden ser la misma';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  -- Validar que existan y estén activas
  SELECT balance INTO v_from_balance
  FROM public.finance_accounts
  WHERE id = p_from_account_id AND is_active = true
  FOR UPDATE;

  IF v_from_balance IS NULL THEN
    RAISE EXCEPTION 'La cuenta origen no existe o está inactiva';
  END IF;

  PERFORM 1 FROM public.finance_accounts
  WHERE id = p_to_account_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cuenta destino no existe o está inactiva';
  END IF;

  -- Actualizar balances
  UPDATE public.finance_accounts
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE id = p_from_account_id;

  UPDATE public.finance_accounts
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE id = p_to_account_id;

  -- Registrar movimiento contra el turno
  INSERT INTO public.cash_movements (
    session_id,
    type,
    amount,
    note,
    category,
    account_id,
    account_to_id,
    synced_to_finance
  ) VALUES (
    p_session_id,
    'transferencia',
    p_amount,
    p_note,
    'Transferencia entre cuentas',
    p_from_account_id,
    p_to_account_id,
    true
  )
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_account_transfer(uuid, uuid, uuid, integer, text) TO authenticated, anon;