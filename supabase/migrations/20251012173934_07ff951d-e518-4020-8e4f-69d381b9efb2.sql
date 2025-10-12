-- ============================================================================
-- FASE 1: Corrección de Base de Datos - Materias Primas y Recetas
-- Crea estructura completa para gestión de inventario y recetas
-- ============================================================================

-- ============================================================================
-- 1. CREAR TABLA units_of_measure (UOM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS units_of_measure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  is_base_unit BOOLEAN NOT NULL DEFAULT false,
  conversion_factor NUMERIC,
  base_unit_id UUID REFERENCES units_of_measure(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para UOM
CREATE INDEX IF NOT EXISTS idx_uom_code ON units_of_measure(code);
CREATE INDEX IF NOT EXISTS idx_uom_active ON units_of_measure(is_active);

-- RLS permisiva para UOM
ALTER TABLE units_of_measure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage units of measure" ON units_of_measure;
CREATE POLICY "Staff can manage units of measure"
ON units_of_measure FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at en UOM
DROP TRIGGER IF EXISTS update_uom_updated_at ON units_of_measure;
CREATE TRIGGER update_uom_updated_at
BEFORE UPDATE ON units_of_measure
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Datos iniciales de unidades de medida
INSERT INTO units_of_measure (code, name, abbreviation, is_base_unit, conversion_factor) VALUES
('KG', 'Kilogramo', 'kg', true, 1),
('GR', 'Gramo', 'gr', false, 0.001),
('L', 'Litro', 'L', true, 1),
('ML', 'Mililitro', 'ml', false, 0.001),
('UN', 'Unidad', 'un', true, 1),
('CJ', 'Caja', 'cj', false, NULL),
('BL', 'Bolsa', 'bl', false, NULL)
ON CONFLICT (code) DO NOTHING;

-- Actualizar relaciones de conversión
UPDATE units_of_measure 
SET base_unit_id = (SELECT id FROM units_of_measure WHERE code = 'KG')
WHERE code = 'GR';

UPDATE units_of_measure 
SET base_unit_id = (SELECT id FROM units_of_measure WHERE code = 'L')
WHERE code = 'ML';

-- ============================================================================
-- 2. REDISEÑAR TABLA recipes (Cabecera + Detalle)
-- ============================================================================

-- 2.1 Renombrar tabla actual como backup
ALTER TABLE IF EXISTS recipes RENAME TO recipes_old_backup;

-- 2.2 Crear nueva tabla recipes (CABECERA)
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_variant_id UUID REFERENCES category_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  yield_quantity NUMERIC NOT NULL DEFAULT 1,
  yield_uom_id UUID REFERENCES units_of_measure(id) ON DELETE SET NULL,
  preparation_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_recipe_per_product_variant 
  UNIQUE(product_id, category_variant_id)
);

-- 2.3 Crear tabla recipe_ingredients (DETALLE)
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  quantity_per_unit NUMERIC NOT NULL CHECK (quantity_per_unit > 0),
  uom_id UUID NOT NULL REFERENCES units_of_measure(id) ON DELETE RESTRICT,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para recipes
CREATE INDEX idx_recipes_product ON recipes(product_id);
CREATE INDEX idx_recipes_variant ON recipes(category_variant_id);
CREATE INDEX idx_recipes_active ON recipes(is_active);

-- Índices para recipe_ingredients
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_material ON recipe_ingredients(raw_material_id);
CREATE INDEX idx_recipe_ingredients_active ON recipe_ingredients(is_active);

-- RLS permisivas para recipes
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage recipes" ON recipes;
CREATE POLICY "Staff can manage recipes" 
ON recipes FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS permisivas para recipe_ingredients
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Staff can manage recipe ingredients" 
ON recipe_ingredients FOR ALL 
USING (true) 
WITH CHECK (true);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at 
BEFORE UPDATE ON recipes
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipe_ingredients_updated_at ON recipe_ingredients;
CREATE TRIGGER update_recipe_ingredients_updated_at 
BEFORE UPDATE ON recipe_ingredients
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ACTUALIZAR TABLA raw_materials
-- ============================================================================

-- Agregar columnas faltantes a raw_materials
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS base_uom_id UUID REFERENCES units_of_measure(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS conversion_to_base NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;

-- Índice para UOM en raw_materials
CREATE INDEX IF NOT EXISTS idx_raw_materials_uom ON raw_materials(base_uom_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_active ON raw_materials(is_active);

-- Actualizar RLS para raw_materials (asegurar que sea permisiva)
DROP POLICY IF EXISTS "Staff can manage raw materials" ON raw_materials;
DROP POLICY IF EXISTS "Allow authenticated all access" ON raw_materials;

CREATE POLICY "Staff can manage raw materials" 
ON raw_materials FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE units_of_measure IS 'Unidades de medida para materias primas y recetas (kg, L, unidades, etc.)';
COMMENT ON TABLE recipes IS 'Cabecera de recetas: vincula productos con sus ingredientes';
COMMENT ON TABLE recipe_ingredients IS 'Detalle de recetas: ingredientes y cantidades necesarias';
COMMENT ON TABLE raw_materials IS 'Materias primas del inventario';

COMMENT ON COLUMN recipes.yield_quantity IS 'Cantidad que produce la receta (ej: 1 hamburguesa)';
COMMENT ON COLUMN recipe_ingredients.quantity_per_unit IS 'Cantidad de materia prima por unidad de producto final';