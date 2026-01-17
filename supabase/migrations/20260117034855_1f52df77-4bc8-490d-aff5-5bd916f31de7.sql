-- Marcar el efectivo pendiente como depositado por Diego
UPDATE delivery_cash_pending 
SET 
  status = 'depositado',
  deposited_at = NOW(),
  deposited_to_session_id = 'aa587260-fd13-4963-b21c-911d872ada80',
  notes = 'Recepcionado por Diego Ulloa - marcado manualmente debido a problema de sincronización'
WHERE id = '6de17b4c-fab0-43e9-9f76-9e38e01d2d32';