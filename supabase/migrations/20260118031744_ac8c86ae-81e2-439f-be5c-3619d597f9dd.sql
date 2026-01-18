-- =============================================
-- MÓDULO RRHH - Recursos Humanos
-- =============================================

-- 1. Tabla de empleados RRHH
CREATE TABLE public.hr_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NULL,
  phone text NULL,
  rut text NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_employees_user_id ON public.hr_employees(user_id);
CREATE INDEX idx_hr_employees_is_active ON public.hr_employees(is_active);

-- 2. Roles de turno (solo informativo, NO impacta pago)
CREATE TABLE public.hr_shift_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Datos iniciales de roles
INSERT INTO public.hr_shift_roles (name, description) VALUES
  ('Caja', 'Atención al cliente y cobro'),
  ('Cocina', 'Preparación de alimentos'),
  ('Delivery', 'Reparto de pedidos'),
  ('Supervisor', 'Supervisión general del turno');

-- 3. Tipos de turno
CREATE TABLE public.hr_shift_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  default_hours numeric(5,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Datos iniciales de tipos de turno
INSERT INTO public.hr_shift_types (name, default_hours) VALUES
  ('Turno Completo', 7.00),
  ('Medio Turno', 4.00);

-- 4. Reglas de pago (por tipo de turno, NO por rol)
CREATE TABLE public.hr_pay_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_type_id uuid NOT NULL REFERENCES public.hr_shift_types(id) ON DELETE CASCADE,
  pay_per_shift numeric(12,0) NOT NULL,
  tax_percent numeric(5,2) NULL,
  round_policy text NULL CHECK (round_policy IN ('none', '100', '10', '1')) DEFAULT 'none',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique parcial: solo una regla activa por tipo de turno
CREATE UNIQUE INDEX idx_hr_pay_rules_unique_active 
ON public.hr_pay_rules(shift_type_id) 
WHERE is_active = true;

-- Insertar reglas iniciales (vinculando con los tipos de turno creados)
INSERT INTO public.hr_pay_rules (shift_type_id, pay_per_shift)
SELECT id, 25000 FROM public.hr_shift_types WHERE name = 'Turno Completo'
UNION ALL
SELECT id, 15000 FROM public.hr_shift_types WHERE name = 'Medio Turno';

-- 5. Turnos individuales
CREATE TABLE public.hr_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  shift_type_id uuid NOT NULL REFERENCES public.hr_shift_types(id),
  role_id uuid NOT NULL REFERENCES public.hr_shift_roles(id),
  hours_override numeric(5,2) NULL,
  notes text NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'approved', 'paid')),
  created_by uuid NULL REFERENCES public.users(id),
  confirmed_by uuid NULL REFERENCES public.users(id),
  confirmed_at timestamptz NULL,
  approved_by uuid NULL REFERENCES public.users(id),
  approved_at timestamptz NULL,
  paid_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_shifts_shift_date ON public.hr_shifts(shift_date);
CREATE INDEX idx_hr_shifts_employee_id ON public.hr_shifts(employee_id);
CREATE INDEX idx_hr_shifts_status ON public.hr_shifts(status);

-- 6. Ajustes de pago (adelantos, bonos, descuentos)
CREATE TABLE public.hr_pay_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  type text NOT NULL CHECK (type IN ('bonus', 'advance', 'discount')),
  amount numeric(12,0) NOT NULL,
  description text NULL,
  created_by uuid NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_pay_adjustments_employee ON public.hr_pay_adjustments(employee_id);
CREATE INDEX idx_hr_pay_adjustments_period ON public.hr_pay_adjustments(period_start, period_end);

-- 7. Liquidaciones (payroll runs)
CREATE TABLE public.hr_payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'custom')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid')),
  notes text NULL,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL REFERENCES public.users(id),
  issued_by uuid NULL REFERENCES public.users(id),
  issued_at timestamptz NULL,
  paid_by uuid NULL REFERENCES public.users(id),
  paid_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_payroll_runs_period ON public.hr_payroll_runs(period_start, period_end);
CREATE INDEX idx_hr_payroll_runs_status ON public.hr_payroll_runs(status);

-- 8. Items de liquidación (detalle por empleado)
CREATE TABLE public.hr_payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id uuid NOT NULL REFERENCES public.hr_payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id),
  shifts_count int NOT NULL DEFAULT 0,
  base_amount numeric(12,0) NOT NULL DEFAULT 0,
  bonuses numeric(12,0) NOT NULL DEFAULT 0,
  advances numeric(12,0) NOT NULL DEFAULT 0,
  discounts numeric(12,0) NOT NULL DEFAULT 0,
  net_pay numeric(12,0) NOT NULL DEFAULT 0,
  tax_estimated numeric(12,0) NOT NULL DEFAULT 0,
  gross_reference numeric(12,0) NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_payroll_items_payroll ON public.hr_payroll_items(payroll_id);
CREATE INDEX idx_hr_payroll_items_employee ON public.hr_payroll_items(employee_id);

-- 9. Agregar columna hr_payroll_id a finance_expenses para vincular liquidaciones
ALTER TABLE public.finance_expenses 
ADD COLUMN IF NOT EXISTS hr_payroll_id uuid NULL REFERENCES public.hr_payroll_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_expenses_hr_payroll ON public.finance_expenses(hr_payroll_id) WHERE hr_payroll_id IS NOT NULL;

-- 10. Enable RLS en todas las tablas HR
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_shift_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_pay_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_pay_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll_items ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS (acceso para staff autenticado via app.current_user_id)
CREATE POLICY "Staff can view hr_employees" ON public.hr_employees
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_employees" ON public.hr_employees
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can view hr_shift_roles" ON public.hr_shift_roles
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_shift_roles" ON public.hr_shift_roles
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can view hr_shift_types" ON public.hr_shift_types
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_shift_types" ON public.hr_shift_types
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can view hr_pay_rules" ON public.hr_pay_rules
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_pay_rules" ON public.hr_pay_rules
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can view hr_shifts" ON public.hr_shifts
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_shifts" ON public.hr_shifts
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can view hr_pay_adjustments" ON public.hr_pay_adjustments
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_pay_adjustments" ON public.hr_pay_adjustments
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can view hr_payroll_runs" ON public.hr_payroll_runs
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_payroll_runs" ON public.hr_payroll_runs
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can view hr_payroll_items" ON public.hr_payroll_items
  FOR SELECT USING (current_setting('app.current_user_id', true) IS NOT NULL);

CREATE POLICY "Staff can manage hr_payroll_items" ON public.hr_payroll_items
  FOR ALL USING (current_setting('app.current_user_id', true) IS NOT NULL);

-- 12. Triggers para updated_at
CREATE OR REPLACE FUNCTION public.hr_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_hr_employees_updated_at BEFORE UPDATE ON public.hr_employees
  FOR EACH ROW EXECUTE FUNCTION public.hr_update_updated_at();

CREATE TRIGGER tr_hr_shift_roles_updated_at BEFORE UPDATE ON public.hr_shift_roles
  FOR EACH ROW EXECUTE FUNCTION public.hr_update_updated_at();

CREATE TRIGGER tr_hr_shift_types_updated_at BEFORE UPDATE ON public.hr_shift_types
  FOR EACH ROW EXECUTE FUNCTION public.hr_update_updated_at();

CREATE TRIGGER tr_hr_pay_rules_updated_at BEFORE UPDATE ON public.hr_pay_rules
  FOR EACH ROW EXECUTE FUNCTION public.hr_update_updated_at();

CREATE TRIGGER tr_hr_shifts_updated_at BEFORE UPDATE ON public.hr_shifts
  FOR EACH ROW EXECUTE FUNCTION public.hr_update_updated_at();

CREATE TRIGGER tr_hr_payroll_runs_updated_at BEFORE UPDATE ON public.hr_payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.hr_update_updated_at();

-- 13. RPC: Generar liquidación
CREATE OR REPLACE FUNCTION public.hr_generate_payroll_run_v1(
  p_period_type text,
  p_start_date date,
  p_end_date date,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payroll_id uuid;
  v_user_id uuid;
  v_employee record;
  v_shift record;
  v_base_amount numeric(12,0);
  v_bonuses numeric(12,0);
  v_advances numeric(12,0);
  v_discounts numeric(12,0);
  v_net_pay numeric(12,0);
  v_shifts_count int;
  v_shift_ids uuid[];
  v_snapshot jsonb;
  v_totals jsonb;
  v_total_employees int := 0;
  v_total_shifts int := 0;
  v_total_base numeric(12,0) := 0;
  v_total_bonuses numeric(12,0) := 0;
  v_total_advances numeric(12,0) := 0;
  v_total_discounts numeric(12,0) := 0;
  v_total_net numeric(12,0) := 0;
BEGIN
  -- Obtener usuario actual
  v_user_id := current_setting('app.current_user_id', true)::uuid;
  
  -- Validar que no exista liquidación superpuesta (issued o paid)
  IF EXISTS (
    SELECT 1 FROM hr_payroll_runs
    WHERE status IN ('issued', 'paid')
    AND period_start <= p_end_date
    AND period_end >= p_start_date
  ) THEN
    RAISE EXCEPTION 'Ya existe una liquidación emitida o pagada que se superpone con este período';
  END IF;
  
  -- Crear el payroll run
  INSERT INTO hr_payroll_runs (period_type, period_start, period_end, notes, created_by, status)
  VALUES (p_period_type, p_start_date, p_end_date, p_notes, v_user_id, 'draft')
  RETURNING id INTO v_payroll_id;
  
  -- Procesar cada empleado activo
  FOR v_employee IN 
    SELECT id, full_name FROM hr_employees WHERE is_active = true
  LOOP
    v_base_amount := 0;
    v_shifts_count := 0;
    v_shift_ids := ARRAY[]::uuid[];
    v_snapshot := '{"shifts": []}'::jsonb;
    
    -- Obtener turnos aprobados NO pagados en el rango
    FOR v_shift IN
      SELECT s.id, s.shift_date, s.shift_type_id, st.name as shift_type_name, 
             COALESCE(pr.pay_per_shift, 0) as pay_per_shift
      FROM hr_shifts s
      JOIN hr_shift_types st ON st.id = s.shift_type_id
      LEFT JOIN hr_pay_rules pr ON pr.shift_type_id = s.shift_type_id AND pr.is_active = true
      WHERE s.employee_id = v_employee.id
        AND s.status = 'approved'
        AND s.shift_date BETWEEN p_start_date AND p_end_date
    LOOP
      v_base_amount := v_base_amount + v_shift.pay_per_shift;
      v_shifts_count := v_shifts_count + 1;
      v_shift_ids := array_append(v_shift_ids, v_shift.id);
      v_snapshot := jsonb_set(
        v_snapshot,
        '{shifts}',
        (v_snapshot->'shifts') || jsonb_build_object(
          'id', v_shift.id,
          'date', v_shift.shift_date,
          'type', v_shift.shift_type_name,
          'amount', v_shift.pay_per_shift
        )
      );
    END LOOP;
    
    -- Si tiene turnos, calcular ajustes y crear item
    IF v_shifts_count > 0 THEN
      -- Obtener ajustes del período
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'bonus' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'advance' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'discount' THEN amount ELSE 0 END), 0)
      INTO v_bonuses, v_advances, v_discounts
      FROM hr_pay_adjustments
      WHERE employee_id = v_employee.id
        AND period_start <= p_end_date
        AND period_end >= p_start_date;
      
      -- Calcular neto
      v_net_pay := v_base_amount + v_bonuses - v_advances - v_discounts;
      
      -- Agregar info de ajustes al snapshot
      v_snapshot := v_snapshot || jsonb_build_object(
        'shift_ids', v_shift_ids,
        'employee_name', v_employee.full_name
      );
      
      -- Insertar item de liquidación
      INSERT INTO hr_payroll_items (
        payroll_id, employee_id, shifts_count, base_amount,
        bonuses, advances, discounts, net_pay, snapshot
      ) VALUES (
        v_payroll_id, v_employee.id, v_shifts_count, v_base_amount,
        v_bonuses, v_advances, v_discounts, v_net_pay, v_snapshot
      );
      
      -- Acumular totales
      v_total_employees := v_total_employees + 1;
      v_total_shifts := v_total_shifts + v_shifts_count;
      v_total_base := v_total_base + v_base_amount;
      v_total_bonuses := v_total_bonuses + v_bonuses;
      v_total_advances := v_total_advances + v_advances;
      v_total_discounts := v_total_discounts + v_discounts;
      v_total_net := v_total_net + v_net_pay;
    END IF;
  END LOOP;
  
  -- Actualizar totales globales
  v_totals := jsonb_build_object(
    'employees_count', v_total_employees,
    'shifts_count', v_total_shifts,
    'base_total', v_total_base,
    'bonuses_total', v_total_bonuses,
    'advances_total', v_total_advances,
    'discounts_total', v_total_discounts,
    'net_total', v_total_net
  );
  
  UPDATE hr_payroll_runs SET totals = v_totals WHERE id = v_payroll_id;
  
  RETURN v_payroll_id;
END;
$$;

-- 14. RPC: Emitir liquidación
CREATE OR REPLACE FUNCTION public.hr_issue_payroll(p_payroll_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
BEGIN
  v_user_id := current_setting('app.current_user_id', true)::uuid;
  
  SELECT status INTO v_status FROM hr_payroll_runs WHERE id = p_payroll_id;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Liquidación no encontrada';
  END IF;
  
  IF v_status != 'draft' THEN
    RAISE EXCEPTION 'Solo se pueden emitir liquidaciones en estado draft. Estado actual: %', v_status;
  END IF;
  
  UPDATE hr_payroll_runs 
  SET status = 'issued', issued_by = v_user_id, issued_at = now(), updated_at = now()
  WHERE id = p_payroll_id;
END;
$$;

-- 15. RPC: Marcar liquidación como pagada
CREATE OR REPLACE FUNCTION public.hr_mark_payroll_paid(
  p_payroll_id uuid,
  p_payment_method text,
  p_account_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_payroll record;
  v_item record;
  v_shift_id uuid;
BEGIN
  v_user_id := current_setting('app.current_user_id', true)::uuid;
  
  -- Obtener info de la liquidación
  SELECT * INTO v_payroll FROM hr_payroll_runs WHERE id = p_payroll_id;
  
  IF v_payroll IS NULL THEN
    RAISE EXCEPTION 'Liquidación no encontrada';
  END IF;
  
  IF v_payroll.status != 'issued' THEN
    RAISE EXCEPTION 'Solo se pueden pagar liquidaciones emitidas. Estado actual: %', v_payroll.status;
  END IF;
  
  -- Marcar la liquidación como pagada
  UPDATE hr_payroll_runs 
  SET status = 'paid', paid_by = v_user_id, paid_at = now(), updated_at = now()
  WHERE id = p_payroll_id;
  
  -- Marcar todos los turnos incluidos como pagados
  FOR v_item IN SELECT * FROM hr_payroll_items WHERE payroll_id = p_payroll_id
  LOOP
    IF v_item.snapshot ? 'shift_ids' THEN
      FOR v_shift_id IN SELECT jsonb_array_elements_text(v_item.snapshot->'shift_ids')::uuid
      LOOP
        UPDATE hr_shifts 
        SET status = 'paid', paid_at = now(), updated_at = now()
        WHERE id = v_shift_id AND status != 'paid';
      END LOOP;
    END IF;
  END LOOP;
  
  -- Crear egreso en finanzas
  INSERT INTO finance_expenses (
    account_id,
    amount,
    category,
    expense_type,
    expense_date,
    notes,
    payment_method,
    hr_payroll_id,
    registered_by
  ) VALUES (
    p_account_id,
    (v_payroll.totals->>'net_total')::numeric,
    'Sueldos',
    'Variable',
    now()::date,
    format('Liquidación RRHH período %s a %s', v_payroll.period_start, v_payroll.period_end),
    p_payment_method,
    p_payroll_id,
    v_user_id
  );
END;
$$;

-- 16. Insertar permisos HR para el rol Administrador (usando columna 'role' tipo text/enum)
INSERT INTO public.role_permissions (role, permission, description)
VALUES 
  ('Administrador', 'hr.view', 'Ver módulo RRHH'),
  ('Administrador', 'hr.manage_shifts', 'Gestionar turnos'),
  ('Administrador', 'hr.approve_shifts', 'Aprobar turnos'),
  ('Administrador', 'hr.manage_payroll', 'Gestionar liquidaciones'),
  ('Administrador', 'hr.export_payroll', 'Exportar liquidaciones'),
  ('Administrador', 'hr.manage_config', 'Configurar RRHH')
ON CONFLICT (role, permission) DO NOTHING;