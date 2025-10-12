-- ================================================================
-- FASE 2.1: FUNCIONES SQL CORE PARA INVENTARIO
-- ================================================================

-- Función 1: Asegurar que existe un registro de balance de stock
-- Crea o retorna el balance existente para una combinación material/lote/almacén
CREATE OR REPLACE FUNCTION public.ensure_stock_balance(
  p_raw_material_id UUID,
  p_warehouse_id UUID,
  p_lot_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_id UUID;
BEGIN
  -- Buscar balance existente
  SELECT id INTO v_balance_id
  FROM stock_balances
  WHERE raw_material_id = p_raw_material_id
    AND warehouse_id = p_warehouse_id
    AND (lot_id = p_lot_id OR (lot_id IS NULL AND p_lot_id IS NULL));
  
  -- Si no existe, crearlo
  IF v_balance_id IS NULL THEN
    INSERT INTO stock_balances (
      raw_material_id,
      warehouse_id,
      lot_id,
      quantity_base_uom,
      last_cost
    )
    VALUES (
      p_raw_material_id,
      p_warehouse_id,
      p_lot_id,
      0,
      0
    )
    RETURNING id INTO v_balance_id;
  END IF;
  
  RETURN v_balance_id;
END;
$$;

-- Función 2: Obtener la UOM base de un material
CREATE OR REPLACE FUNCTION public.get_material_base_uom(
  p_raw_material_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_uom_id UUID;
BEGIN
  SELECT base_uom_id INTO v_base_uom_id
  FROM raw_materials
  WHERE id = p_raw_material_id;
  
  IF v_base_uom_id IS NULL THEN
    RAISE EXCEPTION 'Material % no tiene UOM base definida', p_raw_material_id;
  END IF;
  
  RETURN v_base_uom_id;
END;
$$;

-- Función 3: Convertir cantidad de una UOM a la UOM base del material
-- Retorna la cantidad convertida a la unidad base
CREATE OR REPLACE FUNCTION public.convert_uom_to_base(
  p_raw_material_id UUID,
  p_from_uom_id UUID,
  p_quantity NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_uom_id UUID;
  v_conversion_factor NUMERIC;
BEGIN
  -- Obtener UOM base del material
  v_base_uom_id := public.get_material_base_uom(p_raw_material_id);
  
  -- Si ya está en UOM base, retornar tal cual
  IF p_from_uom_id = v_base_uom_id THEN
    RETURN p_quantity;
  END IF;
  
  -- Buscar factor de conversión en raw_materials
  SELECT conversion_to_base INTO v_conversion_factor
  FROM raw_materials
  WHERE id = p_raw_material_id;
  
  -- Si no hay factor de conversión, asumir 1:1
  IF v_conversion_factor IS NULL OR v_conversion_factor = 0 THEN
    v_conversion_factor := 1;
  END IF;
  
  -- Retornar cantidad convertida
  RETURN p_quantity * v_conversion_factor;
END;
$$;

-- Comentarios de documentación
COMMENT ON FUNCTION public.ensure_stock_balance IS 'Asegura que existe un registro de balance de stock para la combinación material/almacén/lote especificada';
COMMENT ON FUNCTION public.get_material_base_uom IS 'Obtiene la unidad de medida base de un material dado';
COMMENT ON FUNCTION public.convert_uom_to_base IS 'Convierte una cantidad de cualquier UOM a la UOM base del material usando el factor de conversión';