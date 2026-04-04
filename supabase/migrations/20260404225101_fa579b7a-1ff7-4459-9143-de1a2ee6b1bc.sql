
-- Assign Proteína group to combo Amerikana product
INSERT INTO public.product_variant_groups (product_id, group_id)
VALUES ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', 'fda701a5-f86a-413b-893d-910c8b738b87')
ON CONFLICT DO NOTHING;

-- Create variant combinations with Carne/Pollo for combo Amerikana
-- Simple + Carne
INSERT INTO public.product_variant_options (product_id, category_variant_id, variant_group_option_id, price, is_default, active, is_enabled)
VALUES 
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '5549a2fc-f1db-45c2-9d24-e81e2623f184', 'f588fdbf-6fea-40ff-8196-91d831633789', 9090, true, true, true),
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '5549a2fc-f1db-45c2-9d24-e81e2623f184', 'd19e10a9-7bed-4a8c-9665-38ddb1146e74', 9090, false, true, true),
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '89cc4fd3-ed4f-414c-92d9-b754acf37a2b', 'f588fdbf-6fea-40ff-8196-91d831633789', 12990, false, true, true),
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '89cc4fd3-ed4f-414c-92d9-b754acf37a2b', 'd19e10a9-7bed-4a8c-9665-38ddb1146e74', 12990, false, true, true),
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '25b8e887-3a40-4ea1-b81b-84908574f180', 'f588fdbf-6fea-40ff-8196-91d831633789', 15890, false, true, true),
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '25b8e887-3a40-4ea1-b81b-84908574f180', 'd19e10a9-7bed-4a8c-9665-38ddb1146e74', 15890, false, true, true),
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '83dd8622-502c-4dec-8e4b-48b21ba0ce80', 'f588fdbf-6fea-40ff-8196-91d831633789', 0, false, true, true),
  ('081d8b92-f929-4f02-a9fd-d96c8824bdd6', '83dd8622-502c-4dec-8e4b-48b21ba0ce80', 'd19e10a9-7bed-4a8c-9665-38ddb1146e74', 0, false, true, true)
ON CONFLICT DO NOTHING;
