-- Add new status values to po_status enum
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'partial';
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add received quantities tracking to purchase_items
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS qty_received numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_pending numeric GENERATED ALWAYS AS (qty - COALESCE(qty_received, 0)) STORED;

-- Add expected and received dates to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS expected_date date,
ADD COLUMN IF NOT EXISTS received_date timestamptz,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Create RLS policies for purchase tables
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_status_history ENABLE ROW LEVEL SECURITY;

-- Policies for purchase_orders
DROP POLICY IF EXISTS "Staff can view purchase orders" ON purchase_orders;
CREATE POLICY "Staff can view purchase orders" 
ON purchase_orders FOR SELECT 
USING (has_active_staff_session());

DROP POLICY IF EXISTS "Staff can create purchase orders" ON purchase_orders;
CREATE POLICY "Staff can create purchase orders" 
ON purchase_orders FOR INSERT 
WITH CHECK (has_active_staff_session());

DROP POLICY IF EXISTS "Staff can update purchase orders" ON purchase_orders;
CREATE POLICY "Staff can update purchase orders" 
ON purchase_orders FOR UPDATE 
USING (has_active_staff_session());

DROP POLICY IF EXISTS "Admins can delete purchase orders" ON purchase_orders;
CREATE POLICY "Admins can delete purchase orders" 
ON purchase_orders FOR DELETE 
USING (is_staff_admin());

-- Policies for purchase_items
DROP POLICY IF EXISTS "Staff can manage purchase items" ON purchase_items;
CREATE POLICY "Staff can manage purchase items" 
ON purchase_items FOR ALL 
USING (has_active_staff_session());

-- Policies for purchase_order_status_history
DROP POLICY IF EXISTS "Staff can view purchase history" ON purchase_order_status_history;
CREATE POLICY "Staff can view purchase history" 
ON purchase_order_status_history FOR SELECT 
USING (has_active_staff_session());

DROP POLICY IF EXISTS "Staff can insert purchase history" ON purchase_order_status_history;
CREATE POLICY "Staff can insert purchase history" 
ON purchase_order_status_history FOR INSERT 
WITH CHECK (has_active_staff_session());

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM purchase_orders
  WHERE created_at >= date_trunc('year', CURRENT_DATE);
  
  v_number := 'OC-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
  
  RETURN v_number;
END;
$$;

-- Trigger to auto-generate PO number
CREATE OR REPLACE FUNCTION set_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := generate_po_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_po_number ON purchase_orders;
CREATE TRIGGER trigger_set_po_number
  BEFORE INSERT ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_po_number();

-- Function to record status change
CREATE OR REPLACE FUNCTION record_po_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO purchase_order_status_history (purchase_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, get_current_staff_user_id());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_record_po_status ON purchase_orders;
CREATE TRIGGER trigger_record_po_status
  AFTER UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION record_po_status_change();