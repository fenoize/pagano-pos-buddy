-- Actualizar configuración para el nuevo sistema de POS
INSERT INTO config (key, value) VALUES 
('payment_methods', '["Efectivo", "POS", "Transferencia", "Runas"]'::jsonb),
('runa_value', '1000'::jsonb),
('order_timing', '"after_payment"'::jsonb),
('comunas', '["Santiago", "Las Condes", "Providencia", "Ñuñoa", "La Reina", "Vitacura", "Lo Barnechea", "Peñalolén", "La Florida", "Puente Alto", "San Miguel", "San Joaquín", "Pedro Aguirre Cerda", "Lo Espejo", "El Bosque", "La Cisterna", "San Ramón", "La Granja", "La Pintana"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();

-- Actualizar estructura de productos para incluir categorías y variables
UPDATE products SET 
  prices = jsonb_set(
    prices,
    '{category}',
    '"hamburguesas"'::jsonb
  )
WHERE name LIKE '%Burger%' OR name LIKE '%Hamburguesa%';

-- Insertar productos BoxFries si no existen
INSERT INTO products (name, prices, active) VALUES
('BoxFries Medium', '{
  "category": "BoxFries",
  "combo": {"Medium": 3500, "Large": 4500},
  "only": {"Medium": 2500, "Large": 3500}
}'::jsonb, true),
('BoxFries Large', '{
  "category": "BoxFries", 
  "combo": {"Medium": 3500, "Large": 4500},
  "only": {"Medium": 2500, "Large": 3500}
}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Actualizar tabla de clientes para incluir los nuevos campos
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS apellido text,
ADD COLUMN IF NOT EXISTS direccion text,
ADD COLUMN IF NOT EXISTS numeracion text,
ADD COLUMN IF NOT EXISTS comuna text,
ADD COLUMN IF NOT EXISTS ultima_compra timestamp with time zone,
ADD COLUMN IF NOT EXISTS cantidad_runas integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_cliente numeric DEFAULT 0;

-- Crear trigger para actualizar valor_cliente automáticamente
CREATE OR REPLACE FUNCTION update_customer_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar valor_cliente cuando se crea/actualiza una orden
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE customers 
    SET 
      valor_cliente = (
        SELECT COALESCE(AVG(total), 0) 
        FROM orders 
        WHERE customer_id = NEW.customer_id
      ),
      ultima_compra = NEW.created_at
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_customer_value
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.customer_id IS NOT NULL)
  EXECUTE FUNCTION update_customer_value();