-- Función para obtener datos diarios (usada en gráficos del dashboard)
CREATE OR REPLACE FUNCTION public.finance_get_daily_data(
  _start date,
  _end date,
  _tz text DEFAULT 'America/Santiago'
)
RETURNS TABLE(
  day date,
  gross_sales integer,
  net_sales integer,
  discounts integer,
  orders_count integer,
  cogs integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s timestamptz;
  e timestamptz;
BEGIN
  -- Normalizar rango
  SELECT ts_start, ts_end INTO s, e 
  FROM public.finance_normalize_range(_start, _end, _tz);

  RETURN QUERY
  WITH daily_sales AS (
    SELECT
      (o.created_at AT TIME ZONE _tz)::date AS day,
      COALESCE(SUM(o.subtotal), 0) AS gross_sales,
      COALESCE(SUM(o.total), 0) AS net_sales,
      COALESCE(SUM(o.discount), 0) AS discounts,
      COUNT(*) AS orders_count
    FROM public.orders o
    WHERE o.created_at >= s 
      AND o.created_at < e
      AND o.status NOT IN ('Cancelado')
    GROUP BY (o.created_at AT TIME ZONE _tz)::date
  ),
  daily_cogs AS (
    SELECT
      (sm.created_at AT TIME ZONE _tz)::date AS day,
      COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)::integer AS cogs
    FROM public.stock_movements sm
    WHERE sm.movement_type = 'SALIDA'
      AND sm.reference_type = 'VENTA'
      AND sm.created_at >= s 
      AND sm.created_at < e
    GROUP BY (sm.created_at AT TIME ZONE _tz)::date
  )
  SELECT
    COALESCE(ds.day, dc.day) AS day,
    COALESCE(ds.gross_sales, 0)::integer AS gross_sales,
    COALESCE(ds.net_sales, 0)::integer AS net_sales,
    COALESCE(ds.discounts, 0)::integer AS discounts,
    COALESCE(ds.orders_count, 0)::integer AS orders_count,
    COALESCE(dc.cogs, 0)::integer AS cogs
  FROM daily_sales ds
  FULL OUTER JOIN daily_cogs dc ON ds.day = dc.day
  ORDER BY COALESCE(ds.day, dc.day);
END;
$$;