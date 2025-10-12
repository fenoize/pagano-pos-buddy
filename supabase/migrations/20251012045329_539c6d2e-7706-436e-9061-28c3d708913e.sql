-- ============================================================================
-- FASE 1: MIGRACIÓN SQL - MÓDULO DE INVENTARIO V1
-- ============================================================================

-- ============================================================================
-- 1. ENUMS (Tipos de Datos)
-- ============================================================================

-- Estados de Purchase Orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'po_status') THEN
    CREATE TYPE po_status AS ENUM ('draft', 'sent', 'received', 'rejected');
  END IF;
END $$;

-- Tipos de movimientos de stock
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_move_type') THEN
    CREATE TYPE stock_move_type AS ENUM (
      'purchase',      -- Compra/Recepción
      'sale',          -- Venta (deducción por orden)
      'adjustment',    -- Ajuste manual (+/-)
      'transfer_in',   -- Entrada por traslado
      'transfer_out',  -- Salida por traslado
      'waste'          -- Merma/Pérdida
    );
  END IF;
END $$;

-- ============================================================================
-- 2. TABLA: unit_of_measures (UOM)
-- ============================================================================

CREATE TABLE IF NOT EXISTS unit_of_measures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  base_unit text,
  conversion_factor numeric(14,6),
  is_base boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uom_code ON unit_of_measures(code);
CREATE INDEX IF NOT EXISTS idx_uom_base ON unit_of_measures(base_unit);

-- Semillas iniciales
INSERT INTO unit_of_measures (code, name, is_base, base_unit, conversion_factor) VALUES
  ('kg', 'Kilogramo', true, NULL, NULL),
  ('g', 'Gramo', false, 'kg', 1000),
  ('lt', 'Litro', true, NULL, NULL),
  ('ml', 'Mililitro', false, 'lt', 1000),
  ('un', 'Unidad', true, NULL, NULL),
  ('bolsa', 'Bolsa', true, NULL, NULL),
  ('caja', 'Caja', true, NULL, NULL),
  ('paquete', 'Paquete', true, NULL, NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. TABLA: warehouses (Bodegas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_default ON warehouses(is_default) WHERE is_default = true;

-- Bodega inicial
INSERT INTO warehouses (name, code, is_default, is_active) VALUES
  ('Bodega Principal', 'MAIN', true, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. TABLA: raw_materials (Materia Prima)
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  description text,
  uom_id uuid REFERENCES unit_of_measures(id) ON DELETE RESTRICT,
  min_stock numeric(14,3) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rm_code ON raw_materials(code);
CREATE INDEX IF NOT EXISTS idx_rm_uom ON raw_materials(uom_id);
CREATE INDEX IF NOT EXISTS idx_rm_active ON raw_materials(is_active);

-- ============================================================================
-- 5. TABLA: suppliers (Proveedores)
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rut text,
  email text,
  phone text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_active ON suppliers(is_active);

-- ============================================================================
-- 6. TABLA: purchase_orders (Órdenes de Compra)
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  status po_status NOT NULL DEFAULT 'draft',
  notes text,
  subtotal numeric(14,2) DEFAULT 0,
  tax numeric(14,2) DEFAULT 0,
  total numeric(14,2) DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_warehouse ON purchase_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_created ON purchase_orders(created_at);

-- ============================================================================
-- 7. TABLA: purchase_items (Items de PO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  raw_material_id uuid REFERENCES raw_materials(id) ON DELETE RESTRICT,
  qty numeric(14,3) NOT NULL CHECK (qty > 0),
  uom_id uuid REFERENCES unit_of_measures(id) ON DELETE RESTRICT,
  unit_cost numeric(14,4) NOT NULL CHECK (unit_cost >= 0),
  total_cost numeric(14,2) GENERATED ALWAYS AS (qty * unit_cost) STORED,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_pi_material ON purchase_items(raw_material_id);

-- ============================================================================
-- 8. TABLA: purchase_order_status_history (Historial de Estados PO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  old_status po_status,
  new_status po_status NOT NULL,
  changed_by uuid REFERENCES users(id),
  notes text,
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posh_purchase ON purchase_order_status_history(purchase_id, changed_at);

-- ============================================================================
-- 9. TABLA: stock_lots (Lotes - Preparado para FIFO V2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id uuid REFERENCES raw_materials(id) ON DELETE RESTRICT,
  lot_code text,
  exp_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lot_material ON stock_lots(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_lot_code ON stock_lots(lot_code);

-- ============================================================================
-- 10. TABLA: stock_moves (Kardex - Libro Mayor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  move_type stock_move_type NOT NULL,
  raw_material_id uuid REFERENCES raw_materials(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT,
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  related_purchase_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  related_lot_id uuid REFERENCES stock_lots(id) ON DELETE SET NULL,
  qty_in numeric(14,3) NOT NULL DEFAULT 0 CHECK (qty_in >= 0),
  qty_out numeric(14,3) NOT NULL DEFAULT 0 CHECK (qty_out >= 0),
  uom_id uuid REFERENCES unit_of_measures(id) ON DELETE RESTRICT,
  unit_cost numeric(14,4),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_material_wh ON stock_moves(raw_material_id, warehouse_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sm_type ON stock_moves(move_type);
CREATE INDEX IF NOT EXISTS idx_sm_order ON stock_moves(related_order_id) WHERE related_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sm_purchase ON stock_moves(related_purchase_id) WHERE related_purchase_id IS NOT NULL;

-- ============================================================================
-- 11. TABLA: stock_balances (Saldos y Costo Promedio)
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_balances (
  raw_material_id uuid REFERENCES raw_materials(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  qty_on_hand numeric(14,3) NOT NULL DEFAULT 0,
  avg_cost numeric(14,4) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY(raw_material_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS idx_sb_material ON stock_balances(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_sb_warehouse ON stock_balances(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_sb_negative ON stock_balances(qty_on_hand) WHERE qty_on_hand < 0;

-- ============================================================================
-- 12. TABLA: recipes (Recetas por Variante)
-- ============================================================================

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variant_options(id) ON DELETE CASCADE,
  raw_material_id uuid REFERENCES raw_materials(id) ON DELETE RESTRICT,
  qty_required numeric(14,3) NOT NULL CHECK (qty_required > 0),
  uom_id uuid REFERENCES unit_of_measures(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, variant_id, raw_material_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_product ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_variant ON recipes(variant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_material ON recipes(raw_material_id);

-- ============================================================================
-- 13. RLS POLICIES
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE unit_of_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- UOM: lectura pública para dropdowns del POS
CREATE POLICY "Anyone can view active UOMs" 
ON unit_of_measures FOR SELECT 
USING (true);

-- Resto: solo staff con sesión activa
CREATE POLICY "Staff can view warehouses" 
ON warehouses FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view raw materials" 
ON raw_materials FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view suppliers" 
ON suppliers FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view purchase orders" 
ON purchase_orders FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view purchase items" 
ON purchase_items FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view PO history" 
ON purchase_order_status_history FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view stock lots" 
ON stock_lots FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view stock moves" 
ON stock_moves FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view stock balances" 
ON stock_balances FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

CREATE POLICY "Staff can view recipes" 
ON recipes FOR SELECT 
USING (get_current_staff_user_id() IS NOT NULL);

-- Políticas de Modificación
CREATE POLICY "Admins can manage warehouses" 
ON warehouses FOR ALL 
USING (has_permission(get_current_staff_user_id(), 'inventory.manage_warehouses'))
WITH CHECK (has_permission(get_current_staff_user_id(), 'inventory.manage_warehouses'));

CREATE POLICY "Authorized users can manage raw materials" 
ON raw_materials FOR ALL 
USING (has_permission(get_current_staff_user_id(), 'inventory.manage_raw_materials'))
WITH CHECK (has_permission(get_current_staff_user_id(), 'inventory.manage_raw_materials'));

CREATE POLICY "Authorized users can manage suppliers" 
ON suppliers FOR ALL 
USING (has_permission(get_current_staff_user_id(), 'inventory.manage_suppliers'))
WITH CHECK (has_permission(get_current_staff_user_id(), 'inventory.manage_suppliers'));

CREATE POLICY "Authorized users can manage POs" 
ON purchase_orders FOR ALL 
USING (has_permission(get_current_staff_user_id(), 'inventory.purchase'))
WITH CHECK (has_permission(get_current_staff_user_id(), 'inventory.purchase'));

CREATE POLICY "Authorized users can manage PO items" 
ON purchase_items FOR ALL 
USING (has_permission(get_current_staff_user_id(), 'inventory.purchase'))
WITH CHECK (has_permission(get_current_staff_user_id(), 'inventory.purchase'));

CREATE POLICY "System can insert PO history" 
ON purchase_order_status_history FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authorized users can create stock moves" 
ON stock_moves FOR INSERT 
WITH CHECK (
  has_permission(get_current_staff_user_id(), 'inventory.adjust') OR
  has_permission(get_current_staff_user_id(), 'inventory.transfer') OR
  has_permission(get_current_staff_user_id(), 'inventory.purchase')
);

CREATE POLICY "No direct writes to stock balances" 
ON stock_balances FOR INSERT 
WITH CHECK (false);

CREATE POLICY "No direct updates to stock balances" 
ON stock_balances FOR UPDATE 
USING (false);

CREATE POLICY "Authorized users can manage recipes" 
ON recipes FOR ALL 
USING (has_permission(get_current_staff_user_id(), 'inventory.manage_recipes'))
WITH CHECK (has_permission(get_current_staff_user_id(), 'inventory.manage_recipes'));

-- ============================================================================
-- 14. PERMISOS (role_permissions)
-- ============================================================================

INSERT INTO public.role_permissions (role, permission, description) VALUES
  ('Administrador', 'inventory.view', 'Ver módulo de inventario'),
  ('Cajero', 'inventory.view', 'Ver módulo de inventario'),
  ('Administrador', 'inventory.manage_uom', 'Gestionar unidades de medida'),
  ('Administrador', 'inventory.manage_warehouses', 'Gestionar bodegas'),
  ('Administrador', 'inventory.manage_raw_materials', 'Gestionar materia prima'),
  ('Administrador', 'inventory.manage_suppliers', 'Gestionar proveedores'),
  ('Administrador', 'inventory.purchase', 'Crear y gestionar órdenes de compra'),
  ('Administrador', 'inventory.adjust', 'Realizar ajustes de inventario'),
  ('Administrador', 'inventory.transfer', 'Realizar traslados entre bodegas'),
  ('Administrador', 'inventory.manage_recipes', 'Gestionar recetas de productos')
ON CONFLICT (role, permission) DO NOTHING;

-- ============================================================================
-- 15. TRIGGERS
-- ============================================================================

CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON warehouses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_raw_materials_updated_at
BEFORE UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON recipes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_balances_updated_at
BEFORE UPDATE ON stock_balances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();