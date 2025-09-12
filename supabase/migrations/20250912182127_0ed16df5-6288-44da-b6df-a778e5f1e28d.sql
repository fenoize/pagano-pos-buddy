-- Add KDS configuration settings
INSERT INTO config (key, value) VALUES 
  ('kds_time_green', 10),
  ('kds_time_yellow', 15), 
  ('kds_time_red', 20),
  ('kds_sound_enabled', true),
  ('kds_columns', 3),
  ('kds_card_size', '"medium"')
ON CONFLICT (key) DO NOTHING;