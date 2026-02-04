-- Add google_signin_enabled column to online_order_settings table
ALTER TABLE public.online_order_settings 
ADD COLUMN IF NOT EXISTS google_signin_enabled boolean NOT NULL DEFAULT false;