
-- Insert the missing OC for "Caja Grande" from SC-0021 linked to Packing La Vega
INSERT INTO purchase_orders (supplier_id, warehouse_id, notes, subtotal, tax, total, status, request_id)
VALUES (
  '4a76c7f5-259c-40f6-ae25-5d41393e2831',  -- Packing La Vega
  'c199efc8-b149-44ab-9f3c-2f0b6ee025e8',  -- Local 11
  'Generada desde SC SC-0021',
  18000, 3420, 21420,
  'draft',
  '754c3903-ec8b-4e2e-96c2-e035329d74d4'   -- SC-0021
);

-- Insert the purchase item for this OC
INSERT INTO purchase_items (purchase_id, raw_material_id, qty, uom_id, unit_cost, qty_received)
SELECT 
  po.id,
  'cf3f8a0c-5ea8-49d5-8ace-62aaee81778b',  -- Caja Grande
  1,
  'c4db9b9d-f082-4515-b67a-50d93664f829',  -- UOM
  18000,
  0
FROM purchase_orders po
WHERE po.request_id = '754c3903-ec8b-4e2e-96c2-e035329d74d4'
  AND po.supplier_id = '4a76c7f5-259c-40f6-ae25-5d41393e2831'
LIMIT 1;
