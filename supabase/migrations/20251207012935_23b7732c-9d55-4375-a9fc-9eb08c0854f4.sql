-- =====================================================
-- MIGRACIÓN: Gastos Fijos Recurrentes
-- =====================================================

-- 1. Crear tabla de catálogo de gastos recurrentes
CREATE TABLE IF NOT EXISTS public.finance_recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER set_finance_recurring_expenses_updated_at
  BEFORE UPDATE ON public.finance_recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp();

-- 2. Habilitar RLS y políticas para finance_recurring_expenses
ALTER TABLE public.finance_recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view recurring expenses"
  ON public.finance_recurring_expenses
  FOR SELECT
  USING (has_active_staff_session() AND staff_has_permission('finance.view'));

CREATE POLICY "Staff can manage recurring expenses"
  ON public.finance_recurring_expenses
  FOR INSERT
  WITH CHECK (has_active_staff_session() AND staff_has_permission('finance.manage_expenses'));

CREATE POLICY "Staff can update recurring expenses"
  ON public.finance_recurring_expenses
  FOR UPDATE
  USING (has_active_staff_session() AND staff_has_permission('finance.manage_expenses'))
  WITH CHECK (has_active_staff_session() AND staff_has_permission('finance.manage_expenses'));

CREATE POLICY "Admins can delete recurring expenses"
  ON public.finance_recurring_expenses
  FOR DELETE
  USING (has_active_staff_session() AND is_current_user_admin());

-- 3. Agregar columnas a finance_expenses para vincular a recurrente
ALTER TABLE public.finance_expenses
ADD COLUMN IF NOT EXISTS recurring_id uuid REFERENCES public.finance_recurring_expenses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fixed_subtype text;

-- Agregar constraint para fixed_subtype
ALTER TABLE public.finance_expenses
ADD CONSTRAINT chk_fixed_subtype CHECK (fixed_subtype IS NULL OR fixed_subtype IN ('simple', 'recurrente'));

-- 4. Agregar columnas a financial_closures
ALTER TABLE public.financial_closures
ADD COLUMN IF NOT EXISTS recurring_fixed_expenses numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS non_recurring_fixed_expenses numeric(12,2) DEFAULT 0;

-- 5. Actualizar función finance_generate_closure_v2 para incluir recurrentes
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
  v_recurring_fixed_expenses numeric := 0;
  v_non_recurring_fixed_expenses numeric := 0;
  
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
  -- 3. CALCULAR EGRESOS (NUEVA LÓGICA CON RECURRENTES)
  -- ============================================
  
  -- 3A. GASTOS VARIABLES (desde finance_expenses donde expense_type != 'Fijo')
  SELECT COALESCE(SUM(fe.amount), 0)
  INTO v_variable_expenses
  FROM public.finance_expenses fe
  WHERE fe.expense_date >= _start
    AND fe.expense_date <= _end
    AND fe.expense_type IN ('Variable', 'Inversión', 'Otro');

  -- 3B. GASTOS FIJOS DESDE finance_expenses (expense_type = 'Fijo')
  -- 3B.1 Gastos Fijos Recurrentes (con recurring_id o fixed_subtype = 'recurrente')
  SELECT COALESCE(SUM(fe.amount), 0)
  INTO v_recurring_fixed_expenses
  FROM public.finance_expenses fe
  WHERE fe.expense_date >= _start
    AND fe.expense_date <= _end
    AND fe.expense_type = 'Fijo'
    AND fe.fixed_subtype = 'recurrente';

  -- 3B.2 Gastos Fijos No Recurrentes (simple o NULL)
  SELECT COALESCE(SUM(fe.amount), 0)
  INTO v_non_recurring_fixed_expenses
  FROM public.finance_expenses fe
  WHERE fe.expense_date >= _start
    AND fe.expense_date <= _end
    AND fe.expense_type = 'Fijo'
    AND (fe.fixed_subtype IS NULL OR fe.fixed_subtype = 'simple');

  -- 3C. GASTOS FIJOS PRORRATEADOS (desde finance_fixed_expenses - mantener compatibilidad)
  SELECT COALESCE(SUM(prorated_amount), 0)
  INTO v_fixed_expenses
  FROM public.get_fixed_expenses_for_closure(_start, _end);

  -- 3D. Sumar los gastos fijos desde finance_expenses al total de fijos
  v_fixed_expenses := v_fixed_expenses + v_recurring_fixed_expenses + v_non_recurring_fixed_expenses;

  -- 3E. TOTAL DE EGRESOS
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

  -- 7. CONSTRUIR SNAPSHOT JSON (incluyendo nuevos campos)
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
      'total', v_total_expenses,
      'fixed_recurring', v_recurring_fixed_expenses,
      'fixed_non_recurring', v_non_recurring_fixed_expenses
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
    recurring_fixed_expenses,
    non_recurring_fixed_expenses,
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
    v_recurring_fixed_expenses,
    v_non_recurring_fixed_expenses,
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
    recurring_fixed_expenses = EXCLUDED.recurring_fixed_expenses,
    non_recurring_fixed_expenses = EXCLUDED.non_recurring_fixed_expenses,
    margin_amount = EXCLUDED.margin_amount,
    margin_percent = EXCLUDED.margin_percent,
    total_balance = EXCLUDED.total_balance,
    filters = EXCLUDED.filters,
    updated_at = now()
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 6. Función para obtener top gastos fijos recurrentes del período
CREATE OR REPLACE FUNCTION public.get_top_recurring_expenses_for_closure(
  _start date,
  _end date,
  _limit integer DEFAULT 10
)
RETURNS TABLE (
  recurring_id uuid,
  recurring_name text,
  category text,
  total_amount numeric,
  expense_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    fe.recurring_id,
    COALESCE(fre.name, 'Sin nombre') as recurring_name,
    COALESCE(fre.category, fe.category) as category,
    SUM(fe.amount) as total_amount,
    COUNT(*)::integer as expense_count
  FROM public.finance_expenses fe
  LEFT JOIN public.finance_recurring_expenses fre ON fe.recurring_id = fre.id
  WHERE fe.expense_date >= _start
    AND fe.expense_date <= _end
    AND fe.expense_type = 'Fijo'
    AND fe.fixed_subtype = 'recurrente'
  GROUP BY fe.recurring_id, fre.name, fre.category, fe.category
  ORDER BY total_amount DESC
  LIMIT _limit;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_top_recurring_expenses_for_closure TO authenticated;