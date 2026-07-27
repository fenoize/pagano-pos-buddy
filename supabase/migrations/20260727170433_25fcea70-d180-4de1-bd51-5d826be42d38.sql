CREATE OR REPLACE FUNCTION public.notify_pending_acceptance_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'PendienteAceptacion'::order_status
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM net.http_post(
      url := 'https://lxxfhayifyiioglfbsyj.supabase.co/functions/v1/notify-new-app-order',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eGZoYXlpZnlpaW9nbGZic3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzMzNTgsImV4cCI6MjA3MTA0OTM1OH0.vpIwYxp9AXBXvp3OPY-GGXl0J1yeAwTeH3OZW2Bs0Ss'
      ),
      body := jsonb_build_object('order_id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_pending_acceptance_order failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_pending_acceptance_order ON public.orders;
CREATE TRIGGER trg_notify_pending_acceptance_order
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_pending_acceptance_order();