CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Borrar job previo si existe
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'schedule-checker-every-5min';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'schedule-checker-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lxxfhayifyiioglfbsyj.supabase.co/functions/v1/schedule-checker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eGZoYXlpZnlpaW9nbGZic3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzMzNTgsImV4cCI6MjA3MTA0OTM1OH0.vpIwYxp9AXBXvp3OPY-GGXl0J1yeAwTeH3OZW2Bs0Ss'
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);