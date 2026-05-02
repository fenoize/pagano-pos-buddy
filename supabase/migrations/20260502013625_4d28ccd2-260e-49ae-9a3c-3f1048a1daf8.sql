
-- 1) Función que evalúa todas las insignias automáticas para un cliente
CREATE OR REPLACE FUNCTION public.evaluate_customer_badges(p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_count int;
  v_total_spent numeric;
  v_birthday date;
  v_today date := (now() AT TIME ZONE 'America/Santiago')::date;
  v_has_consecutive boolean;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(total),0)
    INTO v_order_count, v_total_spent
  FROM public.orders
  WHERE customer_id = p_customer_id
    AND status <> 'Cancelado';

  SELECT fecha_nacimiento INTO v_birthday
  FROM public.customers WHERE id = p_customer_id;

  -- Primera orden
  IF v_order_count >= 1 THEN
    PERFORM public.check_and_award_badge(p_customer_id, 'first_order');
  END IF;

  -- 10 órdenes (>=, no estricto)
  IF v_order_count >= 10 THEN
    PERFORM public.check_and_award_badge(p_customer_id, 'ten_orders');
  END IF;

  -- Gran gastador
  IF v_total_spent >= 100000 THEN
    PERFORM public.check_and_award_badge(p_customer_id, 'big_spender');
  END IF;

  -- Cumpleañero (pedido el día de cumpleaños, comparando mes/día)
  IF v_birthday IS NOT NULL
     AND EXTRACT(MONTH FROM v_birthday) = EXTRACT(MONTH FROM v_today)
     AND EXTRACT(DAY   FROM v_birthday) = EXTRACT(DAY   FROM v_today) THEN
    PERFORM public.check_and_award_badge(p_customer_id, 'birthday_order');
  END IF;

  -- Devoto semanal (4 semanas consecutivas)
  SELECT public.has_orders_in_last_4_weeks(p_customer_id) INTO v_has_consecutive;
  IF v_has_consecutive THEN
    PERFORM public.check_and_award_badge(p_customer_id, 'weekly_loyal');
  END IF;
END;
$$;

-- 2) Trigger function sobre orders
CREATE OR REPLACE FUNCTION public.trigger_evaluate_customer_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    BEGIN
      PERFORM public.evaluate_customer_badges(NEW.customer_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'evaluate_customer_badges failed for customer %: %', NEW.customer_id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Trigger AFTER INSERT en orders
DROP TRIGGER IF EXISTS trg_evaluate_customer_badges_insert ON public.orders;
CREATE TRIGGER trg_evaluate_customer_badges_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_evaluate_customer_badges();

-- 4) Trigger AFTER UPDATE de status (cuando se cancela/desincela cambia el conteo válido)
DROP TRIGGER IF EXISTS trg_evaluate_customer_badges_status ON public.orders;
CREATE TRIGGER trg_evaluate_customer_badges_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trigger_evaluate_customer_badges();

-- 5) Backfill: re-evaluar todos los clientes con al menos un pedido no cancelado
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT customer_id
    FROM public.orders
    WHERE customer_id IS NOT NULL
      AND status <> 'Cancelado'
  LOOP
    BEGIN
      PERFORM public.evaluate_customer_badges(r.customer_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Backfill badges failed for %: %', r.customer_id, SQLERRM;
    END;
  END LOOP;
END $$;
