-- ============================================
-- MÓDULO FINANZAS FASE 1: Cuentas y Egresos
-- ============================================

-- 1. Trigger genérico de timestamps (si no existe)
CREATE OR REPLACE FUNCTION public.set_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 2. Tabla finance_accounts
CREATE TABLE public.finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  type text NOT NULL CHECK (type IN ('Efectivo', 'Banco', 'Digital', 'Otro')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

CREATE INDEX idx_finance_accounts_active ON public.finance_accounts(is_active);
CREATE INDEX idx_finance_accounts_type ON public.finance_accounts(type);

-- Trigger timestamps para finance_accounts
CREATE TRIGGER set_timestamp_on_finance_accounts
BEFORE INSERT OR UPDATE ON public.finance_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- Trigger created_by para finance_accounts
CREATE OR REPLACE FUNCTION public.set_finance_account_created_by()
RETURNS trigger AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = public.get_current_staff_user_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER set_finance_account_created_by
BEFORE INSERT ON public.finance_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_finance_account_created_by();

-- 3. Tabla finance_expenses
CREATE TABLE public.finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT current_date,
  account_id uuid NOT NULL REFERENCES public.finance_accounts(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'CLP',
  expense_type text NOT NULL CHECK (expense_type IN ('Fijo', 'Variable', 'Inversión', 'Otro')),
  category text NOT NULL,
  supplier text,
  payment_method text,
  notes text,
  attachment_url text,
  registered_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_expenses_date ON public.finance_expenses(expense_date);
CREATE INDEX idx_finance_expenses_account ON public.finance_expenses(account_id);
CREATE INDEX idx_finance_expenses_registered_by ON public.finance_expenses(registered_by);
CREATE INDEX idx_finance_expenses_category ON public.finance_expenses(category);
CREATE INDEX idx_finance_expenses_type ON public.finance_expenses(expense_type);

-- Trigger timestamps para finance_expenses
CREATE TRIGGER set_timestamp_on_finance_expenses
BEFORE INSERT OR UPDATE ON public.finance_expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp();

-- Trigger registered_by para finance_expenses
CREATE OR REPLACE FUNCTION public.set_finance_expense_registered_by()
RETURNS trigger AS $$
BEGIN
  IF NEW.registered_by IS NULL THEN
    NEW.registered_by = public.get_current_staff_user_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER set_finance_expense_registered_by
BEFORE INSERT ON public.finance_expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_finance_expense_registered_by();

-- 4. RLS para finance_accounts
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view finance accounts"
ON public.finance_accounts
FOR SELECT
USING (public.is_active_staff());

CREATE POLICY "Admins can manage finance accounts"
ON public.finance_accounts
FOR ALL
USING (public.is_staff_admin())
WITH CHECK (public.is_staff_admin());

-- 5. RLS para finance_expenses
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view finance expenses"
ON public.finance_expenses
FOR SELECT
USING (public.is_active_staff());

CREATE POLICY "Staff can create finance expenses"
ON public.finance_expenses
FOR INSERT
WITH CHECK (public.is_active_staff());

CREATE POLICY "Staff can update own expenses or admin"
ON public.finance_expenses
FOR UPDATE
USING (
  public.is_staff_admin()
  OR registered_by = public.get_current_staff_user_id()
)
WITH CHECK (
  public.is_staff_admin()
  OR registered_by = public.get_current_staff_user_id()
);

CREATE POLICY "Admins can delete finance expenses"
ON public.finance_expenses
FOR DELETE
USING (public.is_staff_admin());