-- Crear función/trigger para generar pagos de delivery automáticamente al marcar pedido como Entregado

CREATE OR REPLACE FUNCTION public.ensure_delivery_payment_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_amount integer;
BEGIN
  -- Solo aplica a pedidos delivery entregados con repartidor asignado
  IF NEW.fulfillment <> 'delivery' THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'Entregado' THEN
    RETURN NEW;
  END IF;

  IF NEW.delivery_person_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determinar monto base a pagar al repartidor
  v_base_amount := COALESCE(NULLIF(NEW.delivery_payment_amount, 0), NEW.delivery_fee, 0);

  -- Insertar pago pendiente si no existe para esta orden
  INSERT INTO public.delivery_payments (
    order_id,
    delivery_person_id,
    base_amount,
    gross_amount,
    net_amount,
    status
  )
  SELECT
    NEW.id,
    NEW.delivery_person_id,
    v_base_amount,
    v_base_amount,
    v_base_amount,
    'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.delivery_payments dp WHERE dp.order_id = NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_delivery_payment ON public.orders;
CREATE TRIGGER trg_ensure_delivery_payment
AFTER INSERT OR UPDATE OF status, delivery_person_id, delivery_fee, delivery_payment_amount, fulfillment
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.ensure_delivery_payment_for_order();

-- Backfill: crear pagos pendientes faltantes para pedidos delivery ya entregados
INSERT INTO public.delivery_payments (
  order_id,
  delivery_person_id,
  base_amount,
  gross_amount,
  net_amount,
  status
)
SELECT
  o.id,
  o.delivery_person_id,
  COALESCE(NULLIF(o.delivery_payment_amount, 0), o.delivery_fee, 0) AS base_amount,
  COALESCE(NULLIF(o.delivery_payment_amount, 0), o.delivery_fee, 0) AS gross_amount,
  COALESCE(NULLIF(o.delivery_payment_amount, 0), o.delivery_fee, 0) AS net_amount,
  'pending' AS status
FROM public.orders o
WHERE o.fulfillment = 'delivery'
  AND o.status = 'Entregado'
  AND o.delivery_person_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.delivery_payments dp WHERE dp.order_id = o.id
  );
