-- Add geolocation columns to addresses table for Mapbox integration
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_addresses_coordinates 
ON public.addresses (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.addresses.latitude IS 'Latitude coordinate from Mapbox geocoding';
COMMENT ON COLUMN public.addresses.longitude IS 'Longitude coordinate from Mapbox geocoding';
COMMENT ON COLUMN public.addresses.formatted_address IS 'Full formatted address from Mapbox';