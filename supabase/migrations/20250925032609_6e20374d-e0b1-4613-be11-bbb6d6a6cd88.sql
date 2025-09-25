-- Add configuration for cash denominations
INSERT INTO config (key, value) VALUES 
('cash_denominations', '[1000, 2000, 5000, 10000, 20000]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = '[1000, 2000, 5000, 10000, 20000]'::jsonb;