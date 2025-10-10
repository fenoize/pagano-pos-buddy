-- Cerrar la sesión de caja atorada manualmente
UPDATE cash_sessions 
SET 
  closed_at = '2025-10-09 23:30:00+00',
  closing_cash = 35700
WHERE id = 'f63abe18-49c1-4ddb-86a8-2a635e14ea04'
  AND closed_at IS NULL;