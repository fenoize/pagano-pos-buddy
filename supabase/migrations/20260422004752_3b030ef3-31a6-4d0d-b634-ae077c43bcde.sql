CREATE OR REPLACE FUNCTION public.finance_get_kpis(_start date, _end date, _tz text DEFAULT 'America/Santiago'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  s timestamptz;
  e timestamptz;
  result jsonb;
  total_orders integer;
  gross_sales integer;
  total_discounts integer;
  net_sales integer;
  delivery_fee integer;
  payment_runas integer;
  avg_order_value integer;
  total_cogs integer := 0;
  gross_margin integer;
  gross_margin_pct numeric(5,2);
  stock_movements_exists boolean;
BEGIN
  SELECT ts_start, ts_end INTO s, e 
  FROM public.finance_normalize_range(_start, _end, _tz);

  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_movements'
  ) INTO stock_movements_exists;

  SELECT
    COUNT(*),
    COALESCE(SUM(o.subtotal), 0),
    COALESCE(SUM(o.discount), 0),
    COALESCE(SUM(
      CASE
        WHEN o.payment_method::text = 'mixto' THEN o.total - COALESCE(o.payment_runas, 0)
        WHEN pm.counts_as_real_sale = false THEN 0
        ELSE o.total
      END
    ), 0),
    COALESCE(SUM(o.delivery_fee), 0),
    COALESCE(SUM(o.payment_runas), 0)
  INTO total_orders, gross_sales, total_discounts, net_sales, delivery_fee, payment_runas
  FROM public.orders o
  LEFT JOIN public.payment_methods pm ON pm.name = o.payment_method::text
  WHERE o.created_at >= s 
    AND o.created_at < e
    AND o.status = 'Entregado';

  IF stock_movements_exists THEN
    SELECT COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)::integer
    INTO total_cogs
    FROM public.stock_movements sm
    WHERE sm.movement_type = 'SALIDA'
      AND sm.reference_type = 'VENTA'
      AND sm.created_at >= s 
      AND sm.created_at < e;
  END IF;

  gross_margin := (net_sales - total_cogs);
  IF net_sales > 0 THEN
    gross_margin_pct := ROUND((gross_margin::numeric / net_sales::numeric) * 100, 2);
  ELSE
    gross_margin_pct := 0;
  END IF;

  IF total_orders > 0 THEN
    avg_order_value := ROUND(net_sales::numeric / total_orders::numeric);
  ELSE
    avg_order_value := 0;
  END IF;

  result := jsonb_build_object(
    'period', jsonb_build_object(
      'start', _start,
      'end', _end,
      'tz', _tz
    ),
    'orders', total_orders,
    'sales', jsonb_build_object(
      'gross', gross_sales,
      'discounts', total_discounts,
      'net', net_sales,
      'delivery_fee', delivery_fee,
      'payment_runas', payment_runas,
      'aov', avg_order_value
    ),
    'costs', jsonb_build_object(
      'cogs', total_cogs,
      'gross_margin', gross_margin,
      'gross_margin_pct', gross_margin_pct
    )
  );

  RETURN result;
END;
$function$;