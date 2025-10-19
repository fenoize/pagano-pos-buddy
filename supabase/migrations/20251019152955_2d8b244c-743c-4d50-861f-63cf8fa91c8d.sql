-- =====================================================
-- MÓDULO FINANZAS V1 - PAGANO'S BURGER
-- =====================================================

-- 1. Tabla de Cierres Financieros
CREATE TABLE IF NOT EXISTS public.financial_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL CHECK (period_type IN ('weekly','monthly','custom')),
  date_start date NOT NULL,
  date_end date NOT NULL,
  tz text NOT NULL DEFAULT 'America/Santiago',
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_locked boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (period_type, date_start, date_end)
);

CREATE INDEX IF NOT EXISTS idx_fin_closures_range 
  ON public.financial_closures(date_start, date_end);

CREATE INDEX IF NOT EXISTS idx_fin_closures_period 
  ON public.financial_closures(period_type, date_start);

-- Trigger para updated_at
CREATE TRIGGER update_financial_closures_updated_at
  BEFORE UPDATE ON public.financial_closures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Vista para Exportación de Deliveries
CREATE OR REPLACE VIEW public.delivery_export_v AS
SELECT
  o.id AS order_id,
  o.order_number::text,
  (o.created_at AT TIME ZONE 'America/Santiago') AS created_at_cl,
  TRIM(CONCAT(
    COALESCE(o.delivery_address,''), ' ',
    COALESCE(o.delivery_number,''), ', ',
    COALESCE(o.delivery_comuna,'')
  )) AS direccion_completa,
  COALESCE(o.delivery_fee, 0) AS monto_delivery
FROM public.orders o
WHERE o.fulfillment = 'delivery'
  AND o.status NOT IN ('Cancelado');

-- 3. Función: Normalizar Rango de Fechas
CREATE OR REPLACE FUNCTION public.finance_normalize_range(
  _start date, 
  _end date, 
  _tz text DEFAULT 'America/Santiago'
)
RETURNS TABLE (ts_start timestamptz, ts_end timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (_start::text || ' 00:00:00')::timestamptz AT TIME ZONE _tz AS ts_start,
    ((_end + 1)::text || ' 00:00:00')::timestamptz AT TIME ZONE _tz AS ts_end
$$;

-- 4. Función: Calcular KPIs Financieros
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
  v_ventas_brutas integer;
  v_descuentos integer;
  v_ventas_netas integer;
  v_delivery_cobrado integer;
  v_payment_runas integer;
  v_orders integer;
  v_aov integer;
  v_cogs numeric(14,2);
  v_margen numeric(14,2);
  v_margen_pct numeric(6,2);
BEGIN
  -- Normalizar rango
  SELECT ts_start, ts_end INTO s, e 
  FROM public.finance_normalize_range(_start, _end, _tz);

  -- Calcular ventas y descuentos
  SELECT
    COALESCE(SUM(o.subtotal), 0),
    COALESCE(SUM(o.discount), 0),
    COALESCE(SUM(o.total), 0),
    COALESCE(SUM(o.delivery_fee), 0),
    COALESCE(SUM(o.payment_runas), 0),
    COUNT(*)
  INTO 
    v_ventas_brutas, 
    v_descuentos, 
    v_ventas_netas, 
    v_delivery_cobrado,
    v_payment_runas,
    v_orders
  FROM public.orders o
  WHERE o.created_at >= s 
    AND o.created_at < e
    AND o.status NOT IN ('Cancelado');

  -- AOV (Average Order Value)
  v_aov := CASE 
    WHEN v_orders > 0 THEN ROUND(v_ventas_netas::numeric / v_orders, 0)::integer
    ELSE 0 
  END;

  -- COGS (Cost of Goods Sold) desde stock_movements
  SELECT COALESCE(SUM(ABS(sm.quantity_base_uom) * COALESCE(sm.unit_cost, 0)), 0)
  INTO v_cogs
  FROM public.stock_movements sm
  WHERE sm.movement_type = 'SALIDA'
    AND sm.reference_type = 'VENTA'
    AND sm.created_at >= s 
    AND sm.created_at < e;

  -- Margen bruto
  v_margen := v_ventas_netas - v_cogs;
  v_margen_pct := CASE 
    WHEN v_ventas_netas > 0 THEN ROUND(100.0 * v_margen / v_ventas_netas, 2)
    ELSE 0 
  END;

  -- Retornar JSON con todos los KPIs
  RETURN jsonb_build_object(
    'period', jsonb_build_object(
      'start', _start, 
      'end', _end, 
      'tz', _tz
    ),
    'orders', v_orders,
    'sales', jsonb_build_object(
      'gross', v_ventas_brutas,
      'discounts', v_descuentos,
      'net', v_ventas_netas,
      'delivery_fee', v_delivery_cobrado,
      'payment_runas', v_payment_runas,
      'aov', v_aov
    ),
    'costs', jsonb_build_object(
      'cogs', ROUND(v_cogs, 0)::integer,
      'gross_margin', ROUND(v_margen, 0)::integer,
      'gross_margin_pct', v_margen_pct
    )
  );
END;
$$;

-- 5. Función: Generar Cierre Financiero
CREATE OR REPLACE FUNCTION public.finance_generate_closure(
  _period_type text,
  _start date,
  _end date,
  _notes text,
  _created_by uuid,
  _tz text DEFAULT 'America/Santiago'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot jsonb;
  new_id uuid;
BEGIN
  -- Validar period_type
  IF _period_type NOT IN ('weekly','monthly','custom') THEN
    RAISE EXCEPTION 'period_type debe ser: weekly, monthly o custom';
  END IF;

  -- Obtener snapshot de KPIs
  snapshot := public.finance_get_kpis(_start, _end, _tz);

  -- Insertar o actualizar cierre
  INSERT INTO public.financial_closures (
    period_type, date_start, date_end, tz, totals, is_locked, notes, created_by
  )
  VALUES (
    _period_type, _start, _end, _tz, snapshot, true, _notes, _created_by
  )
  ON CONFLICT (period_type, date_start, date_end)
  DO UPDATE SET 
    totals = EXCLUDED.totals, 
    notes = EXCLUDED.notes, 
    tz = EXCLUDED.tz,
    updated_at = now()
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 6. Función: Exportar Deliveries por Rango
CREATE OR REPLACE FUNCTION public.delivery_export_range(
  _start date,
  _end date,
  _tz text DEFAULT 'America/Santiago'
)
RETURNS TABLE(
  fecha_hora text,
  numero_orden text,
  direccion text,
  monto_delivery text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH r AS (
    SELECT ts_start, ts_end 
    FROM public.finance_normalize_range(_start, _end, _tz)
  )
  SELECT
    to_char(d.created_at_cl, 'DD/MM/YYYY HH24:MI:SS') AS fecha_hora,
    d.order_number,
    d.direccion_completa,
    d.monto_delivery::text
  FROM public.delivery_export_v d, r
  WHERE d.created_at_cl >= r.ts_start 
    AND d.created_at_cl < r.ts_end
  ORDER BY d.created_at_cl;
$$;

-- 7. RLS para financial_closures
ALTER TABLE public.financial_closures ENABLE ROW LEVEL SECURITY;

-- Política de lectura (requiere finance.view)
CREATE POLICY "Finance viewers can read closures"
  ON public.financial_closures
  FOR SELECT
  USING (
    public.has_permission(public.get_current_staff_user_id(), 'finance.view')
  );

-- Política de creación (requiere finance.manage_closures)
CREATE POLICY "Finance managers can create closures"
  ON public.financial_closures
  FOR INSERT
  WITH CHECK (
    public.has_permission(public.get_current_staff_user_id(), 'finance.manage_closures')
  );

-- Política de actualización (requiere finance.manage_closures)
CREATE POLICY "Finance managers can update closures"
  ON public.financial_closures
  FOR UPDATE
  USING (
    public.has_permission(public.get_current_staff_user_id(), 'finance.manage_closures')
  )
  WITH CHECK (
    public.has_permission(public.get_current_staff_user_id(), 'finance.manage_closures')
  );

-- Política de eliminación (requiere finance.manage_closures)
CREATE POLICY "Finance managers can delete closures"
  ON public.financial_closures
  FOR DELETE
  USING (
    public.has_permission(public.get_current_staff_user_id(), 'finance.manage_closures')
  );

-- 8. Seed de Permisos
INSERT INTO public.role_permissions (role, permission, description) VALUES
  ('Administrador', 'finance.view', 'Ver módulo de finanzas y KPIs'),
  ('Administrador', 'finance.manage_closures', 'Generar y gestionar cierres financieros'),
  ('Administrador', 'finance.export', 'Exportar reportes financieros'),
  ('Cajero', 'finance.view', 'Ver módulo de finanzas (solo lectura)'),
  ('Cajero', 'finance.export', 'Exportar reportes básicos')
ON CONFLICT (role, permission) DO NOTHING;