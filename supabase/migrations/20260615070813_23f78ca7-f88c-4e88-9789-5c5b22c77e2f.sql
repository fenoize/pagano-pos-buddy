
CREATE OR REPLACE FUNCTION public.finance_get_kpis(_start date, _end date, _tz text DEFAULT 'America/Santiago'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
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
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
  ) INTO stock_movements_exists;

  WITH real_orders AS (
    SELECT o.*, pm.counts_as_real_sale
    FROM public.orders o
    LEFT JOIN public.payment_methods pm ON pm.name = o.payment_method::text
    WHERE o.created_at >= s
      AND o.created_at < e
      AND o.status IN ('Entregado','Pendiente','Listo')
      AND (
        o.payment_method::text = 'mixto'
        OR COALESCE(pm.counts_as_real_sale, false) = true
      )
  )
  SELECT
    COUNT(*),
    COALESCE(SUM(
      CASE
        WHEN payment_method::text = 'mixto' THEN GREATEST(subtotal - COALESCE(payment_runas, 0), 0)
        ELSE subtotal
      END
    ), 0),
    COALESCE(SUM(discount), 0),
    COALESCE(SUM(
      CASE
        WHEN payment_method::text = 'mixto' THEN GREATEST(total - COALESCE(payment_runas, 0), 0)
        ELSE total
      END
    ), 0),
    COALESCE(SUM(delivery_fee), 0),
    COALESCE(SUM(payment_runas), 0)
  INTO total_orders, gross_sales, total_discounts, net_sales, delivery_fee, payment_runas
  FROM real_orders;

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
    'period', jsonb_build_object('start', _start, 'end', _end, 'tz', _tz),
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

CREATE OR REPLACE FUNCTION public.finance_get_daily_data(_start date, _end date, _tz text DEFAULT 'America/Santiago'::text)
 RETURNS TABLE(day date, gross_sales integer, net_sales integer, discounts integer, orders_count integer, cogs integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  s timestamptz;
  e timestamptz;
  stock_movements_exists boolean;
BEGIN
  SELECT ts_start, ts_end INTO s, e
  FROM public.finance_normalize_range(_start, _end, _tz);

  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'stock_movements'
  ) INTO stock_movements_exists;

  IF stock_movements_exists THEN
    RETURN QUERY
    WITH real_orders AS (
      SELECT o.*, pm.counts_as_real_sale
      FROM public.orders o
      LEFT JOIN public.payment_methods pm ON pm.name = o.payment_method::text
      WHERE o.created_at >= s AND o.created_at < e
        AND o.status IN ('Entregado','Pendiente','Listo')
        AND (
          o.payment_method::text = 'mixto'
          OR COALESCE(pm.counts_as_real_sale, false) = true
        )
    ),
    daily_sales AS (
      SELECT
        (created_at AT TIME ZONE _tz)::date AS d,
        COALESCE(SUM(
          CASE
            WHEN payment_method::text = 'mixto' THEN GREATEST(subtotal - COALESCE(payment_runas, 0), 0)
            ELSE subtotal
          END
        ), 0) AS gs,
        COALESCE(SUM(
          CASE
            WHEN payment_method::text = 'mixto' THEN GREATEST(total - COALESCE(payment_runas, 0), 0)
            ELSE total
          END
        ), 0) AS ns,
        COALESCE(SUM(discount), 0) AS disc,
        COUNT(*) AS oc
      FROM real_orders
      GROUP BY (created_at AT TIME ZONE _tz)::date
    ),
    daily_cogs AS (
      SELECT
        (sm.created_at AT TIME ZONE _tz)::date AS d,
        COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)::integer AS c
      FROM public.stock_movements sm
      WHERE sm.movement_type = 'SALIDA'
        AND sm.reference_type = 'VENTA'
        AND sm.created_at >= s AND sm.created_at < e
      GROUP BY (sm.created_at AT TIME ZONE _tz)::date
    )
    SELECT
      COALESCE(ds.d, dc.d) AS day,
      COALESCE(ds.gs, 0)::integer,
      COALESCE(ds.ns, 0)::integer,
      COALESCE(ds.disc, 0)::integer,
      COALESCE(ds.oc, 0)::integer,
      COALESCE(dc.c, 0)::integer
    FROM daily_sales ds
    FULL OUTER JOIN daily_cogs dc ON ds.d = dc.d
    ORDER BY COALESCE(ds.d, dc.d);
  ELSE
    RETURN QUERY
    WITH real_orders AS (
      SELECT o.*, pm.counts_as_real_sale
      FROM public.orders o
      LEFT JOIN public.payment_methods pm ON pm.name = o.payment_method::text
      WHERE o.created_at >= s AND o.created_at < e
        AND o.status IN ('Entregado','Pendiente','Listo')
        AND (
          o.payment_method::text = 'mixto'
          OR COALESCE(pm.counts_as_real_sale, false) = true
        )
    )
    SELECT
      (created_at AT TIME ZONE _tz)::date AS day,
      COALESCE(SUM(
        CASE
          WHEN payment_method::text = 'mixto' THEN GREATEST(subtotal - COALESCE(payment_runas, 0), 0)
          ELSE subtotal
        END
      ), 0)::integer,
      COALESCE(SUM(
        CASE
          WHEN payment_method::text = 'mixto' THEN GREATEST(total - COALESCE(payment_runas, 0), 0)
          ELSE total
        END
      ), 0)::integer,
      COALESCE(SUM(discount), 0)::integer,
      COUNT(*)::integer,
      0::integer
    FROM real_orders
    GROUP BY (created_at AT TIME ZONE _tz)::date
    ORDER BY (created_at AT TIME ZONE _tz)::date;
  END IF;
END;
$function$;
