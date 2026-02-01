-- Sincronizar retroactivamente egresos de caja que no tienen finance_expense asociado
-- Usar 'Caja Chica' como cuenta por defecto cuando no hay account_id
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
)
SELECT 
  cm.created_at::date as expense_date,
  COALESCE(cm.account_id, '320fffee-cf4b-41d7-b828-dfbbcedb6acf') as account_id,
  cm.amount,
  'Variable',
  COALESCE(cm.category, 'Caja - Movimiento de Turno'),
  cm.note,
  'Efectivo',
  cm.id as cash_movement_id,
  cm.session_id
FROM cash_movements cm
LEFT JOIN finance_expenses fe ON fe.cash_movement_id = cm.id
WHERE cm.type = 'egreso' 
  AND cm.synced_to_finance = true
  AND fe.id IS NULL;