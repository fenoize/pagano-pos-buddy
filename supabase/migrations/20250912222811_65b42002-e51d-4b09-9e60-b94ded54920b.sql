-- Crear tabla para zonas de delivery
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  delivery_fee integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS en la tabla de zonas
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para zonas de delivery
-- Solo administradores pueden gestionar las zonas
CREATE POLICY "Administrators can manage delivery zones"
ON delivery_zones 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Administrador' 
    AND active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'Administrador' 
    AND active = true
  )
);

-- Cajeros pueden ver las zonas para seleccionar en el POS
CREATE POLICY "Cashiers can view delivery zones"
ON delivery_zones 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('Administrador', 'Caja') 
    AND active = true
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Agregar columna para referenciar zona en orders
ALTER TABLE public.orders 
ADD COLUMN delivery_zone_id uuid REFERENCES public.delivery_zones(id);

-- Insertar algunas zonas de ejemplo
INSERT INTO public.delivery_zones (name, description, delivery_fee, active) VALUES
('Zona Centro', 'Centro de la ciudad', 2000, true),
('Zona Norte', 'Sector norte de la ciudad', 2500, true),
('Zona Sur', 'Sector sur de la ciudad', 3000, true),
('Zona Este', 'Sector este de la ciudad', 2800, true),
('Zona Oeste', 'Sector oeste de la ciudad', 3200, true);