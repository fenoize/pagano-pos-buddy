
-- 1) Trigger para sincronizar balance de finance_accounts cuando hay ingresos/egresos en cash_movements
CREATE OR REPLACE FUNCTION public.sync_cash_movement_to_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo procesamos ingresos y egresos con account_id (las transferencias ya las maneja register_account_transfer)
  IF NEW.type = 'transferencia' THEN
    RETURN NEW;
  END IF;

  IF NEW.account_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'ingreso' THEN
      UPDATE public.finance_accounts
      SET balance = COALESCE(balance, 0) + NEW.amount, updated_at = now()
      WHERE id = NEW.account_id;
    ELSIF NEW.type = 'egreso' THEN
      UPDATE public.finance_accounts
      SET balance = COALESCE(balance, 0) - NEW.amount, updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'ingreso' THEN
      UPDATE public.finance_accounts
      SET balance = COALESCE(balance, 0) - OLD.amount, updated_at = now()
      WHERE id = OLD.account_id;
    ELSIF OLD.type = 'egreso' THEN
      UPDATE public.finance_accounts
      SET balance = COALESCE(balance, 0) + OLD.amount, updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_movement_account_balance ON public.cash_movements;
CREATE TRIGGER trg_cash_movement_account_balance
AFTER INSERT OR DELETE ON public.cash_movements
FOR EACH ROW
EXECUTE FUNCTION public.sync_cash_movement_to_account_balance();

-- 2) Backfill: recalcular saldos basados en movimientos históricos + saldo inicial implícito
-- Estrategia: tomar el saldo actual como base verdad, no recalcular para evitar duplicar.
-- En su lugar, NO hacemos backfill automático para no destruir valores configurados manualmente.

-- 3) RPC para registrar movimientos directos desde Finanzas > Cuentas (sin requerir turno de caja)
CREATE OR REPLACE FUNCTION public.register_account_movement(
  p_account_id uuid,
  p_type text, -- 'ingreso' | 'egreso' | 'transferencia'
  p_amount integer,
  p_note text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_to_account_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id uuid;
  v_balance numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  IF p_type NOT IN ('ingreso', 'egreso', 'transferencia') THEN
    RAISE EXCEPTION 'Tipo de movimiento inválido';
  END IF;

  IF p_type = 'transferencia' THEN
    IF p_to_account_id IS NULL OR p_to_account_id = p_account_id THEN
      RAISE EXCEPTION 'Cuenta destino inválida para transferencia';
    END IF;

    -- Validar cuentas
    SELECT balance INTO v_balance FROM public.finance_accounts WHERE id = p_account_id AND is_active = true FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Cuenta origen no existe o está inactiva'; END IF;

    PERFORM 1 FROM public.finance_accounts WHERE id = p_to_account_id AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cuenta destino no existe o está inactiva'; END IF;

    UPDATE public.finance_accounts SET balance = balance - p_amount, updated_at = now() WHERE id = p_account_id;
    UPDATE public.finance_accounts SET balance = balance + p_amount, updated_at = now() WHERE id = p_to_account_id;

    INSERT INTO public.cash_movements (session_id, type, amount, note, category, account_id, account_to_id, synced_to_finance)
    VALUES (NULL, 'transferencia', p_amount, p_note, COALESCE(p_category, 'Transferencia entre cuentas'), p_account_id, p_to_account_id, true)
    RETURNING id INTO v_movement_id;
  ELSE
    -- Ingreso/Egreso directo: el trigger actualizará el balance automáticamente
    INSERT INTO public.cash_movements (session_id, type, amount, note, category, account_id, synced_to_finance)
    VALUES (NULL, p_type::cash_movement_type, p_amount, p_note, p_category, p_account_id, true)
    RETURNING id INTO v_movement_id;
  END IF;

  RETURN v_movement_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_account_movement(uuid, text, integer, text, text, uuid) TO authenticated, anon;

-- 4) Permitir session_id NULL en cash_movements (movimientos directos sin turno)
ALTER TABLE public.cash_movements ALTER COLUMN session_id DROP NOT NULL;
