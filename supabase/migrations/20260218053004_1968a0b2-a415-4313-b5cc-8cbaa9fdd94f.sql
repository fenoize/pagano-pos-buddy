
-- RPC para crear suscripción de descuento (bypass RLS)
CREATE OR REPLACE FUNCTION public.create_discount_subscription(
  p_customer_id uuid,
  p_discount_percent numeric,
  p_is_active boolean DEFAULT true,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_usage_limit integer DEFAULT NULL,
  p_min_spend numeric DEFAULT NULL,
  p_max_spend numeric DEFAULT NULL,
  p_affects_delivery boolean DEFAULT false,
  p_delivery_mode text DEFAULT NULL,
  p_delivery_amount numeric DEFAULT NULL,
  p_apply_to_discounted boolean DEFAULT true,
  p_apply_to_combo_children boolean DEFAULT true,
  p_scope_mode text DEFAULT 'all',
  p_allowed_categories text[] DEFAULT '{}',
  p_excluded_categories text[] DEFAULT '{}',
  p_allowed_products text[] DEFAULT '{}',
  p_excluded_products text[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO customer_discount_subscriptions (
    customer_id, discount_percent, is_active, start_date, end_date, notes,
    usage_limit, usage_count, min_spend, max_spend, affects_delivery,
    delivery_mode, delivery_amount, apply_to_discounted, apply_to_combo_children,
    scope_mode, allowed_categories, excluded_categories, allowed_products, excluded_products
  ) VALUES (
    p_customer_id, p_discount_percent, p_is_active, p_start_date, p_end_date, p_notes,
    p_usage_limit, 0, p_min_spend, p_max_spend, p_affects_delivery,
    p_delivery_mode, p_delivery_amount, p_apply_to_discounted, p_apply_to_combo_children,
    p_scope_mode, p_allowed_categories, p_excluded_categories, p_allowed_products, p_excluded_products
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- RPC para actualizar suscripción de descuento
CREATE OR REPLACE FUNCTION public.update_discount_subscription(
  p_id uuid,
  p_updates jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customer_discount_subscriptions
  SET
    discount_percent = COALESCE((p_updates->>'discount_percent')::numeric, discount_percent),
    is_active = COALESCE((p_updates->>'is_active')::boolean, is_active),
    start_date = CASE WHEN p_updates ? 'start_date' THEN (p_updates->>'start_date')::date ELSE start_date END,
    end_date = CASE WHEN p_updates ? 'end_date' THEN (p_updates->>'end_date')::date ELSE end_date END,
    notes = CASE WHEN p_updates ? 'notes' THEN p_updates->>'notes' ELSE notes END,
    usage_limit = CASE WHEN p_updates ? 'usage_limit' THEN (p_updates->>'usage_limit')::integer ELSE usage_limit END,
    min_spend = CASE WHEN p_updates ? 'min_spend' THEN (p_updates->>'min_spend')::numeric ELSE min_spend END,
    max_spend = CASE WHEN p_updates ? 'max_spend' THEN (p_updates->>'max_spend')::numeric ELSE max_spend END,
    affects_delivery = COALESCE((p_updates->>'affects_delivery')::boolean, affects_delivery),
    delivery_mode = CASE WHEN p_updates ? 'delivery_mode' THEN p_updates->>'delivery_mode' ELSE delivery_mode END,
    delivery_amount = CASE WHEN p_updates ? 'delivery_amount' THEN (p_updates->>'delivery_amount')::numeric ELSE delivery_amount END,
    apply_to_discounted = COALESCE((p_updates->>'apply_to_discounted')::boolean, apply_to_discounted),
    apply_to_combo_children = COALESCE((p_updates->>'apply_to_combo_children')::boolean, apply_to_combo_children),
    scope_mode = COALESCE(p_updates->>'scope_mode', scope_mode),
    allowed_categories = CASE WHEN p_updates ? 'allowed_categories' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'allowed_categories')) ELSE allowed_categories END,
    excluded_categories = CASE WHEN p_updates ? 'excluded_categories' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'excluded_categories')) ELSE excluded_categories END,
    allowed_products = CASE WHEN p_updates ? 'allowed_products' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'allowed_products')) ELSE allowed_products END,
    excluded_products = CASE WHEN p_updates ? 'excluded_products' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'excluded_products')) ELSE excluded_products END,
    updated_at = now()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$;

-- RPC para eliminar suscripción de descuento
CREATE OR REPLACE FUNCTION public.delete_discount_subscription(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM customer_discount_subscriptions WHERE id = p_id;
  RETURN FOUND;
END;
$$;
