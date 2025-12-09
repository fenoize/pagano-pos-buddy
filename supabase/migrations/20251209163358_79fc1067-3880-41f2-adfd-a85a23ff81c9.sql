-- ==============================================
-- FINANCE SETTINGS AND EXPENSE CATEGORIES SETUP
-- ==============================================

-- 1. Create finance_settings table (singleton for business configuration)
CREATE TABLE public.finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos del negocio y facturación
  razon_social TEXT,
  nombre_fantasia TEXT,
  rut TEXT,
  giro TEXT,
  direccion_tributaria TEXT,
  comuna TEXT,
  ciudad TEXT DEFAULT 'Santiago',
  pais TEXT DEFAULT 'Chile',
  correo_contable TEXT,
  telefono_contable TEXT,
  banco_principal TEXT,
  fecha_inicio_actividades DATE,
  
  -- Parámetros de período y moneda
  moneda TEXT DEFAULT 'CLP',
  aplicar_redondeo BOOLEAN DEFAULT false,
  regla_redondeo TEXT DEFAULT 'entero', -- 'entero', '1_decimal', '2_decimales'
  periodo_cierre TEXT DEFAULT 'manual', -- 'mensual', 'semanal', 'manual'
  dia_corte_mensual INTEGER, -- 1-31
  dia_corte_semanal TEXT, -- 'lunes', 'martes', etc.
  
  -- Reglas de egresos
  monto_min_orden_compra INTEGER DEFAULT 0,
  monto_max_caja_chica INTEGER DEFAULT 0,
  exigir_documento_sobre_monto BOOLEAN DEFAULT false,
  monto_exigir_documento INTEGER DEFAULT 0,
  
  -- Alertas y aprobación OCs
  monto_aprobacion_oc INTEGER DEFAULT 0,
  usuarios_aprobadores_oc UUID[] DEFAULT '{}',
  
  -- Alertas por correo
  alerta_egreso_sobre_monto BOOLEAN DEFAULT false,
  monto_alerta_egreso INTEGER DEFAULT 0,
  alerta_cierre_financiero BOOLEAN DEFAULT false,
  correos_notificacion TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for finance_settings
CREATE POLICY "Staff can view finance settings"
  ON public.finance_settings FOR SELECT
  USING (is_active_staff());

CREATE POLICY "Admins can manage finance settings"
  ON public.finance_settings FOR ALL
  USING (is_staff_admin())
  WITH CHECK (is_staff_admin());

-- 2. Create finance_expense_categories table
CREATE TABLE public.finance_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  include_vat BOOLEAN DEFAULT false,
  requires_document BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.finance_expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense categories
CREATE POLICY "Staff can view expense categories"
  ON public.finance_expense_categories FOR SELECT
  USING (is_active_staff());

CREATE POLICY "Admins can manage expense categories"
  ON public.finance_expense_categories FOR ALL
  USING (is_staff_admin())
  WITH CHECK (is_staff_admin());

-- Insert default categories
INSERT INTO public.finance_expense_categories (name, display_order) VALUES
  ('Insumos', 1),
  ('Arriendo', 2),
  ('Servicios', 3),
  ('Mantención', 4),
  ('Marketing', 5),
  ('Sueldos', 6),
  ('Impuestos', 7),
  ('Otros', 8);

-- 3. Add new columns to payment_methods table
ALTER TABLE public.payment_methods 
  ADD COLUMN IF NOT EXISTS affects_cash_flow BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS internal_only BOOLEAN DEFAULT false;

-- 4. Trigger for updated_at on finance_settings
CREATE OR REPLACE FUNCTION public.set_finance_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_finance_settings_timestamp
  BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_finance_settings_updated_at();

-- 5. Trigger for updated_at on expense_categories
CREATE TRIGGER update_expense_categories_timestamp
  BEFORE UPDATE ON public.finance_expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_timestamp();