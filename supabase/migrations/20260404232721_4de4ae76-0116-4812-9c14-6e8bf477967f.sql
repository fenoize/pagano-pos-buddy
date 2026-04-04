
-- Fix combo item: point to Amerikana from Smash category instead of Smash&Fries
UPDATE combo_items
SET 
  default_product_id = '7f268790-35fb-4f08-b976-77e4fe59492d',  -- Amerikana from Smash
  default_variant_id = 'f7819918-b88d-46ab-8ee2-4f5ef79d600b',  -- Simple from Smash category
  category_id = '591fe32e-c0c6-42ce-a8a7-838804c76667'           -- Smash category
WHERE id = 'a69a8d21-efd4-421f-8eb3-f4aa0e0c467f';
