
-- Fix self-referencing combo slots: point them to the real Smash product
-- Big Pagana combo → Big Pagana Smash
UPDATE combo_items SET
  default_product_id = 'ebb2a677-941c-486e-a361-1dc9d8d988f6',
  category_id = '591fe32e-c0c6-42ce-a8a7-838804c76667',
  default_variant_id = 'f7819918-b88d-46ab-8ee2-4f5ef79d600b'
WHERE id = 'f19c0950-b06f-41f7-afd9-b1d357ad1dfa';

-- Loki combo → Loki Smash
UPDATE combo_items SET
  default_product_id = '89ba6a9a-3ca5-48bc-9e9f-287039c1536c',
  category_id = '591fe32e-c0c6-42ce-a8a7-838804c76667',
  default_variant_id = 'f7819918-b88d-46ab-8ee2-4f5ef79d600b'
WHERE id = 'cf38e67b-f03d-4ee9-93d6-4c5fe0ca9af1';

-- Melt combo → Melt Smash
UPDATE combo_items SET
  default_product_id = '05acd35b-6db7-456e-b0f4-71aed976860c',
  category_id = '591fe32e-c0c6-42ce-a8a7-838804c76667',
  default_variant_id = 'f7819918-b88d-46ab-8ee2-4f5ef79d600b'
WHERE id = 'e407f2f1-2a3c-40c1-91aa-664515993ad7';

-- Old School combo → Old School Smash
UPDATE combo_items SET
  default_product_id = 'fc4f3a50-c656-40aa-9daa-fb5f846807a8',
  category_id = '591fe32e-c0c6-42ce-a8a7-838804c76667',
  default_variant_id = 'f7819918-b88d-46ab-8ee2-4f5ef79d600b'
WHERE id = '5a4a5440-1d82-4c93-812d-7aacd82d3817';

-- Paltona combo → Paltona Smash
UPDATE combo_items SET
  default_product_id = 'e09707e0-5e27-4845-84f3-2858a104d5ea',
  category_id = '591fe32e-c0c6-42ce-a8a7-838804c76667',
  default_variant_id = 'f7819918-b88d-46ab-8ee2-4f5ef79d600b'
WHERE id = '1184fbec-aa95-4a27-9308-bc1670057e66';

-- Smoke House combo → Smoke House Smash
UPDATE combo_items SET
  default_product_id = 'f17d879b-25ea-4fd6-a5bb-cd61db71edff',
  category_id = '591fe32e-c0c6-42ce-a8a7-838804c76667',
  default_variant_id = 'f7819918-b88d-46ab-8ee2-4f5ef79d600b'
WHERE id = '796ab4c5-5ade-40e4-83db-3283f706811a';
