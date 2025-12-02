-- Add polygon and calculation columns to delivery_zones
ALTER TABLE delivery_zones 
ADD COLUMN IF NOT EXISTS polygon jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_per_km integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS min_fee integer DEFAULT 2000,
ADD COLUMN IF NOT EXISTS calculation_mode text DEFAULT 'fixed' CHECK (calculation_mode IN ('fixed', 'distance'));

-- Add store location and auto-detection columns to delivery_settings
ALTER TABLE delivery_settings
ADD COLUMN IF NOT EXISTS store_lat numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS store_lng numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS store_address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS auto_zone_detection boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mapbox_token text DEFAULT NULL;