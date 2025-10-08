-- 1. Agregar campo cash_session_id a tabla orders
ALTER TABLE orders 
ADD COLUMN cash_session_id uuid REFERENCES cash_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_cash_session ON orders(cash_session_id);

-- 2. Crear tabla de auditoría para cierres
CREATE TABLE cash_session_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id uuid NOT NULL REFERENCES cash_sessions(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  changed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  reason text,
  old_totals jsonb,
  new_totals jsonb
);

CREATE INDEX idx_cash_session_audits_session ON cash_session_audits(cash_session_id);
CREATE INDEX idx_cash_session_audits_order ON cash_session_audits(order_id);

-- 3. RLS Policies para cash_session_audits
ALTER TABLE cash_session_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to cash_session_audits"
ON cash_session_audits FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to cash_session_audits"
ON cash_session_audits FOR INSERT
TO public
WITH CHECK (true);

-- 4. Función para asignar pedidos a sesiones (migración de datos históricos)
CREATE OR REPLACE FUNCTION assign_orders_to_sessions()
RETURNS void AS $$
BEGIN
  UPDATE orders o
  SET cash_session_id = cs.id
  FROM cash_sessions cs
  WHERE o.created_at >= cs.opened_at
    AND o.created_at <= COALESCE(cs.closed_at, NOW())
    AND o.created_by_user_id = cs.user_id
    AND o.cash_session_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Ejecutar migración de datos históricos
SELECT assign_orders_to_sessions();