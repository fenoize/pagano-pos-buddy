-- Función para cancelar órdenes con pago pendiente que llevan >30 min sin completarse
CREATE OR REPLACE FUNCTION public.auto_cancel_stale_pending_payment_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH cancelled AS (
    UPDATE public.orders
    SET 
      status = 'Cancelado',
      notes = COALESCE(notes, '') || E'\n\n⏱️ Cancelado automáticamente: pago MercadoPago no completado tras 30 minutos.'
    WHERE status = 'PendientePago'
      AND created_at < (now() - interval '30 minutes')
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM cancelled;
  
  RETURN v_count;
END;
$$;

-- Habilitar extensiones para cron si no están
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar ejecución cada 10 minutos
DO $$
BEGIN
  PERFORM cron.unschedule('auto-cancel-stale-pending-payments');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'auto-cancel-stale-pending-payments',
  '*/10 * * * *',
  $$SELECT public.auto_cancel_stale_pending_payment_orders();$$
);