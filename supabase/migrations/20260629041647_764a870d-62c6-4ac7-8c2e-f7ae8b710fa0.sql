ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_cash_pending;
ALTER TABLE public.delivery_cash_pending REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;