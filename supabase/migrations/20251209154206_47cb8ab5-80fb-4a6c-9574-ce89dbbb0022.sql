-- Add balance field to finance_accounts
ALTER TABLE public.finance_accounts
ADD COLUMN balance numeric DEFAULT 0 NOT NULL;