-- Add is_variable_amount field to distinguish fixed amount vs variable recurring expenses
ALTER TABLE finance_fixed_expenses 
ADD COLUMN is_variable_amount boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN finance_fixed_expenses.is_variable_amount IS 'Si es true, el monto varía cada período (ej: luz, agua) y se registra manualmente cada vez';