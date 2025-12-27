-- Agregar política RLS para permitir que clientes inserten transacciones de canje
-- El contexto del cliente se establece via app.customer_id

-- Función helper para obtener el customer_id del contexto actual
CREATE OR REPLACE FUNCTION get_current_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.customer_id', true), '')::uuid;
$$;

-- Política para que clientes puedan insertar transacciones de canje (type = 'canje')
CREATE POLICY "Customers can create redemption transactions"
ON runas_transactions
FOR INSERT
WITH CHECK (
  -- El customer_id del contexto debe coincidir con la transacción
  get_current_customer_id() IS NOT NULL
  AND customer_id = get_current_customer_id()
  AND type = 'canje'
  AND runas < 0  -- Solo pueden descontar runas (valores negativos)
);

-- Política para que clientes puedan ver sus propias transacciones
CREATE POLICY "Customers can view own transactions"
ON runas_transactions
FOR SELECT
USING (
  get_current_customer_id() IS NOT NULL
  AND customer_id = get_current_customer_id()
);