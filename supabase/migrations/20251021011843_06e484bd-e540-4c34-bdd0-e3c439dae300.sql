-- Actualizar finance_get_kpis para funcionar sin stock_movements
CREATE OR REPLACE FUNCTION public.finance_get_kpis(
  _start date,
  _end date,
  _tz text DEFAULT 'America/Santiago'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Normalizar rango
  SELECT ts_start, ts_end INTO s, e 
  FROM public.finance_normalize_range(_start, _end, _tz);

  -- Verificar si existe la tabla stock_movements
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_movements'
  ) INTO stock_movements_exists;

  -- Obtener ventas
  SELECT
    COUNT(*),
    COALESCE(SUM(o.subtotal), 0),
    COALESCE(SUM(o.discount), 0),
    COALESCE(SUM(o.total), 0),
    COALESCE(SUM(o.delivery_fee), 0),
    COALESCE(SUM(o.payment_runas), 0)
  INTO total_orders, gross_sales, total_discounts, net_sales, delivery_fee, payment_runas
  FROM public.orders o
  WHERE o.created_at >= s 
    AND o.created_at < e
    AND o.status NOT IN ('Cancelado');

  -- Calcular COGS solo si existe la tabla stock_movements
  IF stock_movements_exists THEN
    SELECT COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)::integer
    INTO total_cogs
    FROM public.stock_movements sm
    WHERE sm.movement_type = 'SALIDA'
      AND sm.reference_type = 'VENTA'
      AND sm.created_at >= s 
      AND sm.created_at < e;
  END IF;

  -- Calcular margen bruto
  gross_margin := (net_sales - total_cogs);
  IF net_sales > 0 THEN
    gross_margin_pct := ROUND((gross_margin::numeric / net_sales::numeric) * 100, 2);
  ELSE
    gross_margin_pct := 0;
  END IF;

  -- Calcular AOV
  IF total_orders > 0 THEN
    avg_order_value := ROUND(net_sales::numeric / total_orders::numeric);
  ELSE
    avg_order_value := 0;
  END IF;

  -- Construir resultado
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
$$;

-- Actualizar finance_get_daily_data para funcionar sin stock_movements
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
  stock_movements_exists boolean;
BEGIN
  -- Normalizar rango
  SELECT ts_start, ts_end INTO s, e 
  FROM public.finance_normalize_range(_start, _end, _tz);

  -- Verificar si existe la tabla stock_movements
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_movements'
  ) INTO stock_movements_exists;

  IF stock_movements_exists THEN
    -- Query con COGS
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
  ELSE
    -- Query sin COGS
    RETURN QUERY
    SELECT
      (o.created_at AT TIME ZONE _tz)::date AS day,
      COALESCE(SUM(o.subtotal), 0)::integer AS gross_sales,
      COALESCE(SUM(o.total), 0)::integer AS net_sales,
      COALESCE(SUM(o.discount), 0)::integer AS discounts,
      COUNT(*)::integer AS orders_count,
      0::integer AS cogs
    FROM public.orders o
    WHERE o.created_at >= s 
      AND o.created_at < e
      AND o.status NOT IN ('Cancelado')
    GROUP BY (o.created_at AT TIME ZONE _tz)::date
    ORDER BY (o.created_at AT TIME ZONE _tz)::date;
  END IF;
END;
$$;