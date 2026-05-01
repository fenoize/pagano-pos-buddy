-- 1. Trigger server-side: cuando se crea un customer, evaluar campañas de registro automáticamente
CREATE OR REPLACE FUNCTION public.trigger_evaluate_registration_campaigns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Llamar de forma segura; si falla no debe bloquear la creación del customer
  BEGIN
    PERFORM public.evaluate_registration_campaigns(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'evaluate_registration_campaigns failed for customer %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evaluate_registration_campaigns ON public.customers;
CREATE TRIGGER trg_evaluate_registration_campaigns
AFTER INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.trigger_evaluate_registration_campaigns();

-- 2. Backfill: aplicar el bonus a clientes existentes que califican y nunca recibieron claim
DO $$
DECLARE
  v_customer RECORD;
BEGIN
  FOR v_customer IN
    SELECT c.id
    FROM public.customers c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.loyalty_campaign_claims lcc
      JOIN public.loyalty_campaigns lc ON lc.id = lcc.campaign_id
      WHERE lcc.customer_id = c.id
        AND lc.campaign_type = 'registration'
    )
  LOOP
    PERFORM public.evaluate_registration_campaigns(v_customer.id);
  END LOOP;
END $$;