
-- ============================================================
-- FASE 1: Solicitud simplificada (supplier_id y estimated_unit_cost opcionales)
-- ============================================================

-- Hacer supplier_id nullable
ALTER TABLE public.purchase_request_items ALTER COLUMN supplier_id DROP NOT NULL;

-- estimated_unit_cost ya tiene default 0, solo necesitamos que sea nullable
ALTER TABLE public.purchase_request_items ALTER COLUMN estimated_unit_cost DROP NOT NULL;
ALTER TABLE public.purchase_request_items ALTER COLUMN estimated_unit_cost SET DEFAULT 0;

-- ============================================================
-- FASE 2: Gestión por logística
-- ============================================================

-- Nuevo enum para modalidad de abastecimiento
CREATE TYPE public.procurement_mode AS ENUM ('proveedor_despacha', 'retiro_proveedor', 'compra_directa');

-- Agregar estado "en_proceso" y "completada" al enum de status de solicitud
ALTER TYPE public.purchase_request_status ADD VALUE IF NOT EXISTS 'en_proceso' AFTER 'approved';
ALTER TYPE public.purchase_request_status ADD VALUE IF NOT EXISTS 'completada' AFTER 'en_proceso';

-- Nuevas columnas en purchase_request_items para gestión de logística
ALTER TABLE public.purchase_request_items
  ADD COLUMN IF NOT EXISTS procurement_mode public.procurement_mode,
  ADD COLUMN IF NOT EXISTS actual_supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS actual_unit_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.users(id);

-- ============================================================
-- FASE 3: Presentaciones de compra (UOM de compra vs UOM de uso)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.material_purchase_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  name text NOT NULL,
  purchase_uom_id uuid NOT NULL REFERENCES public.units_of_measure(id),
  content_qty numeric NOT NULL CHECK (content_qty > 0),
  content_uom_id uuid NOT NULL REFERENCES public.units_of_measure(id),
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice para búsqueda rápida por material
CREATE INDEX IF NOT EXISTS idx_mpp_raw_material ON public.material_purchase_presentations(raw_material_id);

-- RLS
ALTER TABLE public.material_purchase_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver presentaciones" ON public.material_purchase_presentations
  FOR SELECT USING (true);
CREATE POLICY "Staff puede insertar presentaciones" ON public.material_purchase_presentations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff puede actualizar presentaciones" ON public.material_purchase_presentations
  FOR UPDATE USING (true);
CREATE POLICY "Staff puede eliminar presentaciones" ON public.material_purchase_presentations
  FOR DELETE USING (true);

-- Agregar referencia a presentación en purchase_request_items
ALTER TABLE public.purchase_request_items
  ADD COLUMN IF NOT EXISTS presentation_id uuid REFERENCES public.material_purchase_presentations(id);

-- ============================================================
-- FASE 4: Cotizaciones
-- ============================================================

CREATE TABLE IF NOT EXISTS public.purchase_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_item_id uuid NOT NULL REFERENCES public.purchase_request_items(id) ON DELETE CASCADE,
  supplier_name text,
  supplier_id uuid REFERENCES public.suppliers(id),
  unit_price numeric NOT NULL DEFAULT 0,
  presentation_id uuid REFERENCES public.material_purchase_presentations(id),
  notes text,
  quoted_at timestamptz DEFAULT now(),
  is_selected boolean DEFAULT false,
  quoted_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pq_request_item ON public.purchase_quotations(request_item_id);

-- RLS
ALTER TABLE public.purchase_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver cotizaciones" ON public.purchase_quotations
  FOR SELECT USING (true);
CREATE POLICY "Staff puede insertar cotizaciones" ON public.purchase_quotations
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff puede actualizar cotizaciones" ON public.purchase_quotations
  FOR UPDATE USING (true);
CREATE POLICY "Staff puede eliminar cotizaciones" ON public.purchase_quotations
  FOR DELETE USING (true);

-- Trigger updated_at para material_purchase_presentations
CREATE OR REPLACE TRIGGER update_mpp_updated_at
  BEFORE UPDATE ON public.material_purchase_presentations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
