-- Fix FK constraint: purchase_items.uom_id should reference units_of_measure (not unit_of_measures)
ALTER TABLE purchase_items DROP CONSTRAINT IF EXISTS purchase_items_uom_id_fkey;

ALTER TABLE purchase_items
ADD CONSTRAINT purchase_items_uom_id_fkey 
FOREIGN KEY (uom_id) REFERENCES units_of_measure(id) ON DELETE RESTRICT;