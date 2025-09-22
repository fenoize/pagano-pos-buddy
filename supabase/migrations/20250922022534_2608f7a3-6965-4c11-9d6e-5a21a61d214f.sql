-- Add observaciones column to cash_sessions table
ALTER TABLE public.cash_sessions 
ADD COLUMN observaciones text;