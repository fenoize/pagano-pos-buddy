-- ============================================
-- MÓDULO: GASTOS FIJOS (Finance Fixed Expenses)
-- ============================================

-- 1. CREAR TABLA finance_fixed_expenses
CREATE TABLE IF NOT EXISTS public.finance_fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  payment_day integer DEFAULT 1 CHECK (payment_day >= 1 AND payment_day <= 31),
  account_id uuid REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  document_type text,
  notes text,
  is_active boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. CREAR ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_finance_fixed_expenses_active 
  ON public.finance_fixed_expenses(is_active);

CREATE INDEX IF NOT EXISTS idx_finance_fixed_expenses_department 
  ON public.finance_fixed_expenses(department);

CREATE INDEX IF NOT EXISTS idx_finance_fixed_expenses_dates 
  ON public.finance_fixed_expenses(start_date, end_date);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.finance_fixed_expenses ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS

-- SELECT: Staff con permiso finance.view
CREATE POLICY "Active staff can view fixed expenses"
  ON public.finance_fixed_expenses FOR SELECT
  USING (
    has_active_staff_session()
    AND staff_has_permission('finance.view')
  );

-- INSERT: Staff con permiso finance.manage_expenses
CREATE POLICY "Staff can create fixed expenses"
  ON public.finance_fixed_expenses FOR INSERT
  WITH CHECK (
    has_active_staff_session()
    AND staff_has_permission('finance.manage_expenses')
  );

-- UPDATE: Staff con permiso finance.manage_expenses
CREATE POLICY "Staff can update fixed expenses"
  ON public.finance_fixed_expenses FOR UPDATE
  USING (
    has_active_staff_session()
    AND staff_has_permission('finance.manage_expenses')
  )
  WITH CHECK (
    has_active_staff_session()
    AND staff_has_permission('finance.manage_expenses')
  );

-- DELETE: Solo Administradores
CREATE POLICY "Admins can delete fixed expenses"
  ON public.finance_fixed_expenses FOR DELETE
  USING (
    has_active_staff_session()
    AND EXISTS (
      SELECT 1 FROM staff_sessions ss
      INNER JOIN user_roles ur ON ur.user_id = ss.user_id
      WHERE ss.is_active = true
        AND ss.expires_at > NOW()
        AND ur.role = 'Administrador'
    )
  );

-- 5. FUNCIÓN: get_fixed_expenses_for_closure
-- Calcula gastos fijos prorrateados según frecuencia y período
CREATE OR REPLACE FUNCTION public.get_fixed_expenses_for_closure(
  _start date,
  _end date
)
RETURNS TABLE (
  id uuid,
  name text,
  department text,
  category text,
  amount numeric,
  prorated_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  days_in_period integer;
  days_in_month numeric := 30.44; -- Promedio de días por mes
BEGIN
  -- Calcular días del período de cierre
  days_in_period := (_end - _start) + 1;
  
  RETURN QUERY
  SELECT
    ffe.id,
    ffe.name,
    ffe.department,
    ffe.category,
    ffe.amount,
    -- Prorrateo según frecuencia
    CASE
      WHEN ffe.frequency = 'monthly' THEN 
        (ffe.amount / days_in_month) * days_in_period
      WHEN ffe.frequency = 'weekly' THEN 
        (ffe.amount / 7) * days_in_period
      WHEN ffe.frequency = 'yearly' THEN 
        (ffe.amount / 365) * days_in_period
      ELSE ffe.amount
    END AS prorated_amount
  FROM public.finance_fixed_expenses ffe
  WHERE ffe.is_active = true
    AND ffe.start_date <= _end
    AND (ffe.end_date IS NULL OR ffe.end_date >= _start)
  ORDER BY prorated_amount DESC;
END;
$$;

-- 6. MODIFICAR finance_generate_closure_v2
-- Reemplazar lógica de cálculo de egresos para separar fijos y variables
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
  -- Normalizar rango a timestamps con zona horaria
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

  -- 2. CALCULAR MÉTODOS DE PAGO
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

  -- ============================================
  -- 3. CALCULAR EGRESOS (NUEVA LÓGICA)
  -- ============================================
  
  -- 3A. GASTOS VARIABLES (desde finance_expenses)
  SELECT COALESCE(SUM(fe.amount), 0)
  INTO v_variable_expenses
  FROM public.finance_expenses fe
  WHERE fe.expense_date >= _start
    AND fe.expense_date <= _end
    AND fe.expense_type IN ('Variable', 'Inversión', 'Otro');

  -- 3B. GASTOS FIJOS PRORRATEADOS (desde finance_fixed_expenses)
  SELECT COALESCE(SUM(prorated_amount), 0)
  INTO v_fixed_expenses
  FROM public.get_fixed_expenses_for_closure(_start, _end);

  -- 3C. TOTAL DE EGRESOS
  v_total_expenses := v_fixed_expenses + v_variable_expenses;

  -- ============================================
  -- FIN NUEVA LÓGICA DE EGRESOS
  -- ============================================

  -- 4. CALCULAR COGS (si existe la tabla stock_movements)
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stock_movements'
  ) THEN
    SELECT COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)
    INTO v_cogs
    FROM public.stock_movements sm
    WHERE sm.movement_type = 'SALIDA'
      AND sm.reference_type = 'VENTA'
      AND sm.created_at >= s 
      AND sm.created_at < e;
  END IF;

  -- 5. CALCULAR MARGEN
  v_margin_amount := (v_net_sales - v_cogs - v_total_expenses);
  IF v_net_sales > 0 THEN
    v_margin_percent := ROUND((v_margin_amount::numeric / v_net_sales::numeric) * 100, 2);
  ELSE
    v_margin_percent := 0;
  END IF;

  -- 6. BALANCE TOTAL
  v_total_balance := v_net_sales - v_total_expenses - v_cogs;

  -- 7. CONSTRUIR SNAPSHOT JSON
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
    'payment_methods', jsonb_build_object(
      'cash', v_total_cash,
      'pos', v_total_pos,
      'transfer', v_total_transfer,
      'app', v_total_app
    ),
    'expenses', jsonb_build_object(
      'fixed', v_fixed_expenses,
      'variable', v_variable_expenses,
      'total', v_total_expenses
    ),
    'costs', jsonb_build_object(
      'cogs', v_cogs,
      'gross_margin', v_margin_amount,
      'gross_margin_pct', v_margin_percent
    ),
    'balance', v_total_balance
  );

  -- 8. INSERTAR O ACTUALIZAR CIERRE
  INSERT INTO public.financial_closures (
    period_type,
    date_start,
    date_end,
    tz,
    totals,
    is_locked,
    notes,
    created_by,
    -- Columnas de resumen para consultas rápidas
    total_cash,
    total_pos,
    total_transfer,
    total_app,
    total_expenses,
    fixed_expenses,
    variable_expenses,
    margin_amount,
    margin_percent,
    total_balance,
    filters
  )
  VALUES (
    _period_type,
    _start,
    _end,
    _tz,
    snapshot,
    true,
    _notes,
    _created_by,
    v_total_cash,
    v_total_pos,
    v_total_transfer,
    v_total_app,
    v_total_expenses,
    v_fixed_expenses,
    v_variable_expenses,
    v_margin_amount,
    v_margin_percent,
    v_total_balance,
    _filters
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

-- 7. TRIGGER PARA updated_at
CREATE TRIGGER set_finance_fixed_expenses_updated_at
  BEFORE UPDATE ON public.finance_fixed_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp();