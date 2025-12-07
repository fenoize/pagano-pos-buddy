-- Cerrar turno abierto del 21 sept 2025
UPDATE cash_sessions 
SET closed_at = NOW(), closing_cash = opening_cash 
WHERE id = '817d3cf1-06a4-4806-bb90-83ddfdf275c7' 
AND closed_at IS NULL;