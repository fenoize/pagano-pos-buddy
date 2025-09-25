-- Migración: Limpiar datos y estructura base

-- 1. Agregar columna is_enabled
ALTER TABLE product_variant_options 
ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true;

-- 2. Limpiar duplicados is_default antes de crear índice único
WITH duplicates AS (
  SELECT product_id, 
         ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at) as rn
  FROM product_variant_options 
  WHERE is_default = true
)
UPDATE product_variant_options 
SET is_default = false 
WHERE id IN (
  SELECT pvo.id 
  FROM product_variant_options pvo
  JOIN duplicates d ON pvo.product_id = d.product_id 
  WHERE d.rn > 1 AND pvo.is_default = true
);

-- 3. Crear índice único para is_default
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variant_options_default 
ON product_variant_options(product_id) 
WHERE is_default = true;

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_product_variant_options_product_id 
ON product_variant_options(product_id);

CREATE INDEX IF NOT EXISTS idx_category_variants_category_active_order 
ON category_variants(category_id, active, display_order);

-- 5. Configuración global
INSERT INTO config (key, value) 
VALUES ('inventario_activo', 'false'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = 'false'::jsonb;