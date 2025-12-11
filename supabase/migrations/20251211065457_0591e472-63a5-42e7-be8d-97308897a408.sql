-- =============================================
-- PARTE 1: Tabla para control de efectivo de repartidores
-- =============================================

CREATE TABLE public.delivery_cash_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_person_id UUID NOT NULL,
  order_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deposited_at TIMESTAMPTZ,
  deposited_to_session_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT delivery_cash_pending_status_check CHECK (status IN ('pendiente', 'depositado', 'ajustado'))
);

-- Índices para consultas frecuentes
CREATE INDEX idx_delivery_cash_pending_person ON delivery_cash_pending(delivery_person_id);
CREATE INDEX idx_delivery_cash_pending_status ON delivery_cash_pending(status);
CREATE INDEX idx_delivery_cash_pending_order ON delivery_cash_pending(order_id);

-- RLS
ALTER TABLE delivery_cash_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view delivery cash pending"
  ON delivery_cash_pending FOR SELECT
  USING (is_active_staff());

CREATE POLICY "Staff can insert delivery cash pending"
  ON delivery_cash_pending FOR INSERT
  WITH CHECK (is_active_staff());

CREATE POLICY "Staff can update delivery cash pending"
  ON delivery_cash_pending FOR UPDATE
  USING (is_active_staff())
  WITH CHECK (is_active_staff());

-- =============================================
-- PARTE 2: Agregar campos a finance_expenses para vinculación
-- =============================================

ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS cash_movement_id UUID REFERENCES cash_movements(id),
ADD COLUMN IF NOT EXISTS cash_session_id UUID REFERENCES cash_sessions(id);

-- Índice para búsqueda por movimiento de caja
CREATE INDEX IF NOT EXISTS idx_finance_expenses_cash_movement ON finance_expenses(cash_movement_id);

-- =============================================
-- PARTE 3: Agregar campos a cash_movements para mejor tracking
-- =============================================

ALTER TABLE cash_movements
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES finance_accounts(id),
ADD COLUMN IF NOT EXISTS synced_to_finance BOOLEAN DEFAULT false;

-- =============================================
-- PARTE 4: Trigger para actualizar updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_delivery_cash_pending_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_delivery_cash_pending_updated_at
  BEFORE UPDATE ON delivery_cash_pending
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_cash_pending_updated_at();