
-- Add is_manufactured flag to raw_materials
ALTER TABLE public.raw_materials
  ADD COLUMN IF NOT EXISTS is_manufactured boolean NOT NULL DEFAULT false;

-- Manufacturing formulas: defines how a manufactured raw material is produced
CREATE TABLE public.manufacturing_formulas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  yield_quantity numeric NOT NULL DEFAULT 1,
  yield_uom_id uuid REFERENCES public.units_of_measure(id),
  preparation_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_formula_per_material UNIQUE (raw_material_id)
);

-- Manufacturing formula ingredients
CREATE TABLE public.manufacturing_formula_ingredients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formula_id uuid NOT NULL REFERENCES public.manufacturing_formulas(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id),
  quantity numeric NOT NULL,
  uom_id uuid REFERENCES public.units_of_measure(id),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manufacturing_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_formula_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS policies (staff access via service role, same pattern as other inventory tables)
CREATE POLICY "Allow all for authenticated users" ON public.manufacturing_formulas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.manufacturing_formula_ingredients
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_mf_raw_material ON public.manufacturing_formulas(raw_material_id);
CREATE INDEX idx_mfi_formula ON public.manufacturing_formula_ingredients(formula_id);
CREATE INDEX idx_mfi_raw_material ON public.manufacturing_formula_ingredients(raw_material_id);
CREATE INDEX idx_raw_materials_manufactured ON public.raw_materials(is_manufactured) WHERE is_manufactured = true;

-- Updated_at triggers
CREATE TRIGGER update_manufacturing_formulas_updated_at
  BEFORE UPDATE ON public.manufacturing_formulas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manufacturing_formula_ingredients_updated_at
  BEFORE UPDATE ON public.manufacturing_formula_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
