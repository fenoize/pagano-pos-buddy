-- Add KDS configuration settings with proper jsonb formatting
INSERT INTO config (key, value) VALUES 
  ('kds_time_green', '10'::jsonb),
  ('kds_time_yellow', '15'::jsonb), 
  ('kds_time_red', '20'::jsonb),
  ('kds_sound_enabled', 'true'::jsonb),
  ('kds_columns', '3'::jsonb),
  ('kds_card_size', '"medium"'::jsonb)
ON CONFLICT (key) DO NOTHING;