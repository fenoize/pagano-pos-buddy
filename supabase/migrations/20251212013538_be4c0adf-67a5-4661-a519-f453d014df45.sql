
-- =============================================
-- EXPANSIÓN DEL MÓDULO DE PROVEEDORES
-- =============================================

-- 1. Agregar campos de facturación y bancarios a suppliers
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS razon_social TEXT,
ADD COLUMN IF NOT EXISTS giro TEXT,
ADD COLUMN IF NOT EXISTS direccion_fiscal TEXT,
ADD COLUMN IF NOT EXISTS comuna_fiscal TEXT,
ADD COLUMN IF NOT EXISTS ciudad_fiscal TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_type TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
ADD COLUMN IF NOT EXISTS bank_account_holder_rut TEXT,
ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_terms_type TEXT DEFAULT 'contado',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email';

-- 2. Crear tabla de contactos de proveedores
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Datos del contacto
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  
  -- Preferencias
  is_primary BOOLEAN DEFAULT false,
  receive_purchase_orders BOOLEAN DEFAULT false,
  receive_payments BOOLEAN DEFAULT false,
  
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear tabla de cuentas por pagar a proveedores
CREATE TABLE IF NOT EXISTS supplier_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  
  -- Montos
  amount_total NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  
  -- Documento
  document_type TEXT,
  document_number TEXT,
  document_date DATE,
  due_date DATE,
  
  -- Estado
  status TEXT DEFAULT 'pendiente',
  
  -- Tracking
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- 4. Agregar campos de envío a purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_method TEXT,
ADD COLUMN IF NOT EXISTS sent_to_contact_id UUID REFERENCES supplier_contacts(id);

-- 5. Habilitar RLS en las nuevas tablas
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payables ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para supplier_contacts
CREATE POLICY "Staff can view supplier contacts"
ON supplier_contacts FOR SELECT
USING (is_active_staff());

CREATE POLICY "Staff can manage supplier contacts"
ON supplier_contacts FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- 7. Políticas RLS para supplier_payables
CREATE POLICY "Staff can view supplier payables"
ON supplier_payables FOR SELECT
USING (is_active_staff());

CREATE POLICY "Staff can manage supplier payables"
ON supplier_payables FOR ALL
USING (is_active_staff())
WITH CHECK (is_active_staff());

-- 8. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payables_supplier ON supplier_payables(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payables_status ON supplier_payables(status);
CREATE INDEX IF NOT EXISTS idx_supplier_payables_due_date ON supplier_payables(due_date);

-- 9. Trigger para actualizar updated_at en supplier_contacts
CREATE OR REPLACE FUNCTION update_supplier_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_supplier_contacts_updated_at ON supplier_contacts;
CREATE TRIGGER trigger_supplier_contacts_updated_at
BEFORE UPDATE ON supplier_contacts
FOR EACH ROW
EXECUTE FUNCTION update_supplier_contacts_updated_at();

-- 10. Trigger para actualizar updated_at en supplier_payables
CREATE OR REPLACE FUNCTION update_supplier_payables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_supplier_payables_updated_at ON supplier_payables;
CREATE TRIGGER trigger_supplier_payables_updated_at
BEFORE UPDATE ON supplier_payables
FOR EACH ROW
EXECUTE FUNCTION update_supplier_payables_updated_at();

-- 11. Función para calcular el monto pendiente
CREATE OR REPLACE FUNCTION get_supplier_pending_amount(p_supplier_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount_total - amount_paid), 0)
  INTO v_pending
  FROM supplier_payables
  WHERE supplier_id = p_supplier_id
    AND status != 'pagado';
  
  RETURN v_pending;
END;
$$;
