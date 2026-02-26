
-- 1. Add management_notes to purchase_requests
ALTER TABLE public.purchase_requests 
ADD COLUMN management_notes text;

-- 2. Add last_supplier_id and last_procurement_mode to raw_materials
ALTER TABLE public.raw_materials
ADD COLUMN last_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

ALTER TABLE public.raw_materials
ADD COLUMN last_procurement_mode text;
