-- Enable replica identity for the orders table to capture complete row data
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add the orders table to the realtime publication so changes are broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;