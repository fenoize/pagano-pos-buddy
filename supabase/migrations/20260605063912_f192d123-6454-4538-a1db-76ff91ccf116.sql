
-- Trigger: when a cash session is closed, call the edge function that
-- emails admins the closure detail. Uses pg_net.http_post (async).

CREATE OR REPLACE FUNCTION public.notify_cash_session_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  v_url text := 'https://lxxfhayifyiioglfbsyj.supabase.co/functions/v1/send-cash-session-close-email';
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eGZoYXlpZnlpaW9nbGZic3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzMzNTgsImV4cCI6MjA3MTA0OTM1OH0.vpIwYxp9AXBXvp3OPY-GGXl0J1yeAwTeH3OZW2Bs0Ss';
BEGIN
  IF OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL THEN
    PERFORM net.http_post(
      url     := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon
      ),
      body    := jsonb_build_object('session_id', NEW.id)
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the session close on email failures.
  RAISE WARNING 'notify_cash_session_closed failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_cash_session_closed ON public.cash_sessions;

CREATE TRIGGER trg_notify_cash_session_closed
AFTER UPDATE ON public.cash_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_cash_session_closed();
