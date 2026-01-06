-- Fix missing FK relationships so PostgREST joins work
DO $$
BEGIN
  -- delivery_person_id -> users(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_payments_delivery_person_id_fkey'
  ) THEN
    ALTER TABLE public.delivery_payments
    ADD CONSTRAINT delivery_payments_delivery_person_id_fkey
    FOREIGN KEY (delivery_person_id) REFERENCES public.users(id);
  END IF;

  -- paid_by -> users(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_payments_paid_by_fkey'
  ) THEN
    ALTER TABLE public.delivery_payments
    ADD CONSTRAINT delivery_payments_paid_by_fkey
    FOREIGN KEY (paid_by) REFERENCES public.users(id);
  END IF;

  -- order_id -> orders(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_payments_order_id_fkey'
  ) THEN
    ALTER TABLE public.delivery_payments
    ADD CONSTRAINT delivery_payments_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id);
  END IF;

  -- account_id -> finance_accounts(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_payments_account_id_fkey'
  ) THEN
    ALTER TABLE public.delivery_payments
    ADD CONSTRAINT delivery_payments_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.finance_accounts(id);
  END IF;

  -- expense_id -> finance_expenses(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_payments_expense_id_fkey'
  ) THEN
    ALTER TABLE public.delivery_payments
    ADD CONSTRAINT delivery_payments_expense_id_fkey
    FOREIGN KEY (expense_id) REFERENCES public.finance_expenses(id);
  END IF;

  -- tax_expense_id -> finance_expenses(id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_payments_tax_expense_id_fkey'
  ) THEN
    ALTER TABLE public.delivery_payments
    ADD CONSTRAINT delivery_payments_tax_expense_id_fkey
    FOREIGN KEY (tax_expense_id) REFERENCES public.finance_expenses(id);
  END IF;
END $$;
