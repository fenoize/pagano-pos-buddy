CREATE OR REPLACE FUNCTION public.finance_get_daily_data(_start date, _end date, _tz text DEFAULT 'America/Santiago'::text)
 RETURNS TABLE(day date, gross_sales integer, net_sales integer, discounts integer, orders_count integer, cogs integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
    WHERE table_schema = 'public' 
    AND table_name = 'stock_movements'
  ) INTO stock_movements_exists;

  IF stock_movements_exists THEN
    RETURN QUERY
    WITH daily_sales AS (
      SELECT
        (o.created_at AT TIME ZONE _tz)::date AS d,
        COALESCE(SUM(o.subtotal), 0) AS gs,
        COALESCE(SUM(
          CASE
            WHEN o.payment_method::text = 'mixto' THEN o.total - COALESCE(o.payment_runas, 0)
            WHEN pm.counts_as_real_sale = false THEN 0
            ELSE o.total
          END
        ), 0) AS ns,
        COALESCE(SUM(o.discount), 0) AS disc,
        COUNT(*) AS oc
      FROM public.orders o
      LEFT JOIN public.payment_methods pm ON pm.name = o.payment_method::text
      WHERE o.created_at >= s 
        AND o.created_at < e
        AND o.status NOT IN ('Cancelado')
      GROUP BY (o.created_at AT TIME ZONE _tz)::date
    ),
    daily_cogs AS (
      SELECT
        (sm.created_at AT TIME ZONE _tz)::date AS d,
        COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)::integer AS c
      FROM public.stock_movements sm
      WHERE sm.movement_type = 'SALIDA'
        AND sm.reference_type = 'VENTA'
        AND sm.created_at >= s 
        AND sm.created_at < e
      GROUP BY (sm.created_at AT TIME ZONE _tz)::date
    )
    SELECT
      COALESCE(ds.d, dc.d) AS day,
      COALESCE(ds.gs, 0)::integer AS gross_sales,
      COALESCE(ds.ns, 0)::integer AS net_sales,
      COALESCE(ds.disc, 0)::integer AS discounts,
      COALESCE(ds.oc, 0)::integer AS orders_count,
      COALESCE(dc.c, 0)::integer AS cogs
    FROM daily_sales ds
    FULL OUTER JOIN daily_cogs dc ON ds.d = dc.d
    ORDER BY COALESCE(ds.d, dc.d);
  ELSE
    RETURN QUERY
    SELECT
      (o.created_at AT TIME ZONE _tz)::date AS day,
      COALESCE(SUM(o.subtotal), 0)::integer AS gross_sales,
      COALESCE(SUM(
        CASE
          WHEN o.payment_method::text = 'mixto' THEN o.total - COALESCE(o.payment_runas, 0)
          WHEN pm.counts_as_real_sale = false THEN 0
          ELSE o.total
        END
      ), 0)::integer AS net_sales,
      COALESCE(SUM(o.discount), 0)::integer AS discounts,
      COUNT(*)::integer AS orders_count,
      0::integer AS cogs
    FROM public.orders o
    LEFT JOIN public.payment_methods pm ON pm.name = o.payment_method::text
    WHERE o.created_at >= s 
      AND o.created_at < e
      AND o.status NOT IN ('Cancelado')
    GROUP BY (o.created_at AT TIME ZONE _tz)::date
    ORDER BY (o.created_at AT TIME ZONE _tz)::date;
  END IF;
END;
$function$;