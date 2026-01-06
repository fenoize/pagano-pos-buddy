-- Crear tipo enum para estados de solicitud de compra
CREATE TYPE public.purchase_request_status AS ENUM (
  'draft',
  'pending_approval', 
  'approved',
  'rejected',
  'cancelled'
);

-- Crear tabla de solicitudes de compra
CREATE TABLE public.purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_number TEXT NOT NULL UNIQUE,
  status public.purchase_request_status NOT NULL DEFAULT 'draft',
  warehouse_id UUID REFERENCES public.warehouses(id),
  notes TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de items de solicitud de compra
CREATE TABLE public.purchase_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  qty NUMERIC(12,4) NOT NULL,
  uom_id UUID NOT NULL REFERENCES public.units_of_measure(id),
  estimated_unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_total NUMERIC(12,2) GENERATED ALWAYS AS (qty * estimated_unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar columna request_id a purchase_orders para referenciar la solicitud origen
ALTER TABLE public.purchase_orders 
ADD COLUMN request_id UUID REFERENCES public.purchase_requests(id);

-- Crear secuencia para números de solicitud
CREATE SEQUENCE IF NOT EXISTS public.purchase_request_number_seq START WITH 1;

-- Función para generar número de solicitud automáticamente
CREATE OR REPLACE FUNCTION public.generate_pr_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pr_number IS NULL OR NEW.pr_number = '' THEN
    NEW.pr_number := 'SC-' || LPAD(nextval('purchase_request_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número de solicitud
CREATE TRIGGER tr_generate_pr_number
  BEFORE INSERT ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_pr_number();

-- Trigger para actualizar updated_at
CREATE TRIGGER update_purchase_requests_updated_at
  BEFORE UPDATE ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_request_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para purchase_requests
CREATE POLICY "Allow authenticated users to view purchase_requests"
  ON public.purchase_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert purchase_requests"
  ON public.purchase_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update purchase_requests"
  ON public.purchase_requests FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete purchase_requests"
  ON public.purchase_requests FOR DELETE
  TO authenticated
  USING (status = 'draft');

-- Políticas RLS para purchase_request_items
CREATE POLICY "Allow authenticated users to view purchase_request_items"
  ON public.purchase_request_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert purchase_request_items"
  ON public.purchase_request_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update purchase_request_items"
  ON public.purchase_request_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete purchase_request_items"
  ON public.purchase_request_items FOR DELETE
  TO authenticated
  USING (true);

-- Índices para mejorar rendimiento
CREATE INDEX idx_purchase_requests_status ON public.purchase_requests(status);
CREATE INDEX idx_purchase_requests_created_by ON public.purchase_requests(created_by);
CREATE INDEX idx_purchase_request_items_request_id ON public.purchase_request_items(request_id);
CREATE INDEX idx_purchase_request_items_supplier_id ON public.purchase_request_items(supplier_id);
CREATE INDEX idx_purchase_orders_request_id ON public.purchase_orders(request_id);