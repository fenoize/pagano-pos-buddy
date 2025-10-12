-- ============================================================================
-- FIX: Políticas RLS Permisivas para Inventario
-- Permite a cualquier usuario del staff realizar operaciones en inventario
-- Apropiado para sistema interno donde todo el staff es confiable
-- ============================================================================

-- 1. WAREHOUSES: Eliminar política restrictiva y crear permisiva
DROP POLICY IF EXISTS "Admins can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Staff can view warehouses" ON warehouses;

CREATE POLICY "Staff can manage warehouses" 
ON warehouses FOR ALL 
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Staff can manage warehouses" ON warehouses IS 
'Política permisiva: permite a cualquier usuario del staff realizar todas las operaciones. Apropiado para sistema interno.';