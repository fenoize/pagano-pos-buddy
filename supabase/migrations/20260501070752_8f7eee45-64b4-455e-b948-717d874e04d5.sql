
-- =========================================================================
-- FASE 1: Multi-Local — Tabla branches + branch_id en tablas relacionadas
-- =========================================================================

-- 1. Tabla branches
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  accepts_online_orders BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'America/Santiago',
  -- horario semanal: { "mon": {"open":"10:00","close":"23:00","closed":false}, ... }
  opening_hours JSONB NOT NULL DEFAULT jsonb_build_object(
    'mon', jsonb_build_object('open','10:00','close','23:00','closed',false),
    'tue', jsonb_build_object('open','10:00','close','23:00','closed',false),
    'wed', jsonb_build_object('open','10:00','close','23:00','closed',false),
    'thu', jsonb_build_object('open','10:00','close','23:00','closed',false),
    'fri', jsonb_build_object('open','10:00','close','23:30','closed',false),
    'sat', jsonb_build_object('open','10:00','close','23:30','closed',false),
    'sun', jsonb_build_object('open','10:00','close','22:30','closed',false)
  ),
  cash_account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo un local por defecto
CREATE UNIQUE INDEX uq_branches_one_default ON public.branches (is_default) WHERE is_default = true;
-- Una cuenta de caja no puede estar en dos locales
CREATE UNIQUE INDEX uq_branches_cash_account ON public.branches (cash_account_id) WHERE cash_account_id IS NOT NULL;

CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branches"
  ON public.branches FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert branches"
  ON public.branches FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

CREATE POLICY "Admins can update branches"
  ON public.branches FOR UPDATE
  USING (public.has_role(auth.uid(), 'Administrador'));

CREATE POLICY "Admins can delete branches"
  ON public.branches FOR DELETE
  USING (public.has_role(auth.uid(), 'Administrador'));

-- 2. Crear local "Principal" + asignar Caja Grande como caja registradora
INSERT INTO public.branches (name, address, is_default, is_active, cash_account_id)
VALUES (
  'Principal',
  NULL,
  true,
  true,
  'c9cb1171-0625-4f3b-9a5d-3cced56053db'  -- Caja Grande
);

-- Capturamos el id del local principal para el backfill
DO $$
DECLARE
  v_branch_id UUID;
BEGIN
  SELECT id INTO v_branch_id FROM public.branches WHERE is_default = true LIMIT 1;

  -- 3. Agregar branch_id a las tablas afectadas
  ALTER TABLE public.cash_sessions     ADD COLUMN branch_id UUID REFERENCES public.branches(id);
  ALTER TABLE public.cash_movements    ADD COLUMN branch_id UUID REFERENCES public.branches(id);
  ALTER TABLE public.orders            ADD COLUMN branch_id UUID REFERENCES public.branches(id);
  ALTER TABLE public.finance_expenses  ADD COLUMN branch_id UUID REFERENCES public.branches(id);
  ALTER TABLE public.finance_accounts  ADD COLUMN branch_id UUID REFERENCES public.branches(id);
  ALTER TABLE public.delivery_zones    ADD COLUMN branch_id UUID REFERENCES public.branches(id);

  -- 4. Backfill: todos los registros existentes pertenecen al local Principal
  EXECUTE format('UPDATE public.cash_sessions    SET branch_id = %L WHERE branch_id IS NULL', v_branch_id);
  EXECUTE format('UPDATE public.cash_movements   SET branch_id = %L WHERE branch_id IS NULL', v_branch_id);
  EXECUTE format('UPDATE public.orders           SET branch_id = %L WHERE branch_id IS NULL', v_branch_id);
  EXECUTE format('UPDATE public.finance_expenses SET branch_id = %L WHERE branch_id IS NULL', v_branch_id);
  EXECUTE format('UPDATE public.delivery_zones   SET branch_id = %L WHERE branch_id IS NULL', v_branch_id);

  -- Cuentas: solo la caja Grande/Chica se quedan ligadas al local Principal.
  -- Banco/MP quedan globales (branch_id NULL).
  UPDATE public.finance_accounts
  SET branch_id = v_branch_id
  WHERE id IN (
    'c9cb1171-0625-4f3b-9a5d-3cced56053db', -- Caja Grande
    '320fffee-cf4b-41d7-b828-dfbbcedb6acf'  -- Caja Chica
  );
END $$;

-- 5. Hacer NOT NULL donde corresponde (sesiones y pedidos siempre deben tener local)
ALTER TABLE public.cash_sessions  ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.orders         ALTER COLUMN branch_id SET NOT NULL;

-- Índices útiles
CREATE INDEX idx_cash_sessions_branch    ON public.cash_sessions(branch_id);
CREATE INDEX idx_cash_movements_branch   ON public.cash_movements(branch_id);
CREATE INDEX idx_orders_branch           ON public.orders(branch_id);
CREATE INDEX idx_finance_expenses_branch ON public.finance_expenses(branch_id);
CREATE INDEX idx_finance_accounts_branch ON public.finance_accounts(branch_id);
CREATE INDEX idx_delivery_zones_branch   ON public.delivery_zones(branch_id);

-- 6. Trigger: propagar branch_id desde la cash_session al cash_movement
CREATE OR REPLACE FUNCTION public.set_cash_movement_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.branch_id IS NULL AND NEW.session_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id
    FROM public.cash_sessions
    WHERE id = NEW.session_id;
  END IF;

  -- Fallback: local por defecto
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO NEW.branch_id FROM public.branches WHERE is_default = true LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_cash_movement_branch ON public.cash_movements;
CREATE TRIGGER trg_set_cash_movement_branch
BEFORE INSERT ON public.cash_movements
FOR EACH ROW EXECUTE FUNCTION public.set_cash_movement_branch();

-- 7. Trigger: propagar branch_id desde la cash_session al order (cuando viene de POS)
CREATE OR REPLACE FUNCTION public.set_order_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.branch_id IS NULL AND NEW.cash_session_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id
    FROM public.cash_sessions
    WHERE id = NEW.cash_session_id;
  END IF;

  -- Fallback: local por defecto (para órdenes online sin local explícito)
  IF NEW.branch_id IS NULL THEN
    SELECT id INTO NEW.branch_id FROM public.branches WHERE is_default = true LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_branch ON public.orders;
CREATE TRIGGER trg_set_order_branch
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_branch();
