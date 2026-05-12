
-- Fix phantom $40,150 cash deposit on order 2724 (paid by transfer, not cash)
UPDATE delivery_cash_pending
SET status = 'ajustado',
    amount = 0,
    notes = COALESCE(notes,'') || ' | Ajuste auditoría: pedido 2724 fue pagado por transferencia, no efectivo. Removido del depósito de sesión 47575faa.'
WHERE id = '7f969875-ae1f-4514-a652-882e6a55291e';

-- Audit log
INSERT INTO order_audits (order_id, field_name, old_value, new_value, reason)
VALUES (
  '6dc50333-993f-4e74-974b-4dee0e127500',
  'delivery_cash_pending_adjustment',
  '40150',
  '0',
  'Auditoría cierre Matías 09-10/05/2026: pedido 2724 fue pagado por transferencia. Se anuló depósito fantasma de $40.150 en sesión 47575faa-e2a8-432e-b4d6-da374ac9dece.'
);
