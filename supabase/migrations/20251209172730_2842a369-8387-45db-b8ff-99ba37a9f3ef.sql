-- Insertar egresos desde imagen del usuario
INSERT INTO finance_expenses (expense_date, category, notes, amount, account_id, expense_type, currency) VALUES
-- 2/12/25 BEBIDAS - Bebidas compra jumbo - $73,850 - SANTANDER PAGANO
('2025-12-02', 'BEBIDAS', 'Bebidas compra jumbo', 73850, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP'),

-- 4/12/25 diesel - Diesel PARTHNER - $20,000 - SANTANDER PAGANO
('2025-12-04', 'diesel', 'Diesel PARTHNER', 20000, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP'),

-- 3/12/25 GAS 45 KG - GAS 45 KG - $76,500 - Caja Grande (Efectivo)
('2025-12-03', 'GAS 45 KG', 'GAS 45 KG', 76500, 'c9cb1171-0625-4f3b-9a5d-3cced56053db', 'Variable', 'CLP'),

-- 4/12/25 GALLETAS - CRISTOBAL - $10,000 - Caja Grande (Efectivo)
('2025-12-04', 'GALLETAS', 'CRISTOBAL', 10000, 'c9cb1171-0625-4f3b-9a5d-3cced56053db', 'Variable', 'CLP'),

-- 4/12/25 TECNICO - REVISION - $10,000 - Caja Grande (Efectivo)
('2025-12-04', 'TECNICO', 'REVISION', 10000, 'c9cb1171-0625-4f3b-9a5d-3cced56053db', 'Variable', 'CLP'),

-- 4/12/25 INSUMOS - Insumos - $5,400 - Caja Grande (Efectivo)
('2025-12-04', 'INSUMOS', 'Insumos', 5400, 'c9cb1171-0625-4f3b-9a5d-3cced56053db', 'Variable', 'CLP'),

-- 5/12/25 COMPRAS VEGA - Compras Vega - $224,420 - SANTANDER PAGANO
('2025-12-05', 'COMPRAS VEGA', 'Compras Vega', 224420, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP'),

-- 5/12/25 LIDER - Pisos y bebida - $43,900 - SANTANDER PAGANO
('2025-12-05', 'LIDER', 'Pisos y bebida', 43900, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP'),

-- 6/12/25 STREAT BAKER - NOT MARTINS X5 - $83,850 - SANTANDER PAGANO
('2025-12-06', 'STREAT BAKER', 'NOT MARTINS X5', 83850, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP'),

-- 6/12/25 LIMPIEZA QUIMCHAMALI - DESENGRASANTE 2L Y LAVALOZA 5L - $7,500 - SANTANDER PAGANO
('2025-12-06', 'LIMPIEZA QUIMCHAMALI', 'DESENGRASANTE 2L Y LAVALOZA 5L', 7500, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP'),

-- 7/12/25 DELIVERY FERNANDO - Delivery Fernando del 1 al 7 de diciembre - $37,500 - SANTANDER PAGANO
('2025-12-07', 'DELIVERY FERNANDO', 'Delivery Fernando del 1 al 7 de diciembre', 37500, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP'),

-- 7/12/25 TURNOS MATIAS - Turno Matías TC VIERNES TL SABADO - $35,000 - SANTANDER PAGANO
('2025-12-07', 'TURNOS MATIAS', 'Turno Matías TC VIERNES TL SABADO', 35000, '20f7de7a-5f7e-42d3-90a0-a6080f980044', 'Variable', 'CLP');