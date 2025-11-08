-- Corrección de función finance_generate_closure_v2
-- Fix: Conversión correcta de date a timestamp con zona horaria

CREATE OR REPLACE FUNCTION public.finance_generate_closure_v2(
  _period_type text,
  _start date,
  _end date,
  _notes text DEFAULT NULL,
  _created_by uuid DEFAULT NULL,
  _tz text DEFAULT 'America/Santiago',
  _filters jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  snapshot jsonb;
  new_id uuid;
  s timestamptz;
  e timestamptz;
  
  -- Variables para cálculos
  v_total_orders integer := 0;
  v_gross_sales numeric := 0;
  v_discounts numeric := 0;
  v_net_sales numeric := 0;
  v_delivery_fee numeric := 0;
  v_payment_runas numeric := 0;
  v_avg_ticket numeric := 0;
  
  -- Métodos de pago
  v_total_cash numeric := 0;
  v_total_pos numeric := 0;
  v_total_transfer numeric := 0;
  v_total_app numeric := 0;
  
  -- Egresos
  v_total_expenses numeric := 0;
  v_fixed_expenses numeric := 0;
  v_variable_expenses numeric := 0;
  
  -- Margen
  v_margin_amount numeric := 0;
  v_margin_percent numeric := 0;
  v_total_balance numeric := 0;
  
  -- COGS
  v_cogs numeric := 0;
BEGIN
  -- Normalizar rango a timestamps con zona horaria (CORREGIDO)
  s := _start::timestamp AT TIME ZONE _tz;
  e := (_end::date + interval '1 day')::timestamp AT TIME ZONE _tz;
  
  -- 1. CALCULAR VENTAS (excluyendo cancelados)
  SELECT
    COUNT(*),
    COALESCE(SUM(o.subtotal + COALESCE(o.delivery_fee, 0)), 0),
    COALESCE(SUM(o.discount), 0),
    COALESCE(SUM(o.total), 0),
    COALESCE(SUM(o.delivery_fee), 0),
    COALESCE(SUM(o.payment_runas), 0)
  INTO v_total_orders, v_gross_sales, v_discounts, v_net_sales, v_delivery_fee, v_payment_runas
  FROM public.orders o
  WHERE o.created_at >= s 
    AND o.created_at < e
    AND o.status != 'Cancelado';
  
  -- Calcular AOV (Average Order Value)
  IF v_total_orders > 0 THEN
    v_avg_ticket := ROUND(v_net_sales / v_total_orders, 0);
  END IF;
  
  -- 2. CALCULAR MÉTODOS DE PAGO (excluyendo cancelados)
  SELECT
    COALESCE(SUM(o.payment_efectivo), 0),
    COALESCE(SUM(o.payment_pos), 0),
    COALESCE(SUM(o.payment_mp), 0),
    COALESCE(SUM(o.payment_aplicacion), 0)
  INTO v_total_cash, v_total_pos, v_total_transfer, v_total_app
  FROM public.orders o
  WHERE o.created_at >= s 
    AND o.created_at < e
    AND o.status != 'Cancelado';
  
  -- 3. CALCULAR EGRESOS (desde finance_expenses)
  SELECT
    COALESCE(SUM(fe.amount), 0),
    COALESCE(SUM(CASE WHEN fe.expense_type = 'Fijo' THEN fe.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fe.expense_type = 'Variable' THEN fe.amount ELSE 0 END), 0)
  INTO v_total_expenses, v_fixed_expenses, v_variable_expenses
  FROM public.finance_expenses fe
  WHERE fe.expense_date >= _start
    AND fe.expense_date <= _end;
  
  -- 4. CALCULAR COGS (si existe tabla stock_movements)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    SELECT COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)
    INTO v_cogs
    FROM public.stock_movements sm
    WHERE sm.movement_type = 'SALIDA'
      AND sm.reference_type = 'VENTA'
      AND sm.created_at >= s 
      AND sm.created_at < e;
  END IF;
  
  -- 5. CALCULAR MARGEN
  v_margin_amount := v_net_sales - v_total_expenses - v_cogs;
  IF v_net_sales > 0 THEN
    v_margin_percent := ROUND((v_margin_amount / v_net_sales) * 100, 2);
  END IF;
  v_total_balance := v_margin_amount;
  
  -- 6. CONSTRUIR SNAPSHOT JSONB (mantener compatibilidad con estructura anterior)
  snapshot := jsonb_build_object(
    'period', jsonb_build_object(
      'start', _start,
      'end', _end,
      'tz', _tz
    ),
    'orders', v_total_orders,
    'sales', jsonb_build_object(
      'gross', v_gross_sales,
      'discounts', v_discounts,
      'net', v_net_sales,
      'delivery_fee', v_delivery_fee,
      'payment_runas', v_payment_runas,
      'aov', v_avg_ticket
    ),
    'costs', jsonb_build_object(
      'cogs', v_cogs,
      'expenses', v_total_expenses,
      'gross_margin', v_margin_amount,
      'gross_margin_pct', v_margin_percent
    ),
    'payment_methods', jsonb_build_object(
      'cash', v_total_cash,
      'pos', v_total_pos,
      'transfer', v_total_transfer,
      'app', v_total_app
    )
  );
  
  -- 7. INSERTAR O ACTUALIZAR CIERRE
  INSERT INTO public.financial_closures (
    period_type, date_start, date_end, tz, 
    totals, is_locked, notes, created_by,
    total_cash, total_pos, total_transfer, total_app,
    total_expenses, fixed_expenses, variable_expenses,
    margin_amount, margin_percent, total_balance,
    total_tax, filters
  )
  VALUES (
    _period_type, _start, _end, _tz,
    snapshot, true, _notes, _created_by,
    v_total_cash, v_total_pos, v_total_transfer, v_total_app,
    v_total_expenses, v_fixed_expenses, v_variable_expenses,
    v_margin_amount, v_margin_percent, v_total_balance,
    0, _filters
  )
  ON CONFLICT (period_type, date_start, date_end)
  DO UPDATE SET 
    totals = EXCLUDED.totals,
    notes = EXCLUDED.notes,
    tz = EXCLUDED.tz,
    total_cash = EXCLUDED.total_cash,
    total_pos = EXCLUDED.total_pos,
    total_transfer = EXCLUDED.total_transfer,
    total_app = EXCLUDED.total_app,
    total_expenses = EXCLUDED.total_expenses,
    fixed_expenses = EXCLUDED.fixed_expenses,
    variable_expenses = EXCLUDED.variable_expenses,
    margin_amount = EXCLUDED.margin_amount,
    margin_percent = EXCLUDED.margin_percent,
    total_balance = EXCLUDED.total_balance,
    filters = EXCLUDED.filters,
    updated_at = now()
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;