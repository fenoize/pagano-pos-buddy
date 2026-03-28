
-- 1. Add puntos fields to customers
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS puntos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puntos_lifetime integer NOT NULL DEFAULT 0;

-- 2. Add points_cost to level definitions  
ALTER TABLE public.customer_level_definitions
  ADD COLUMN IF NOT EXISTS points_cost integer NOT NULL DEFAULT 0;

-- 3. Points log table
CREATE TABLE IF NOT EXISTS public.customer_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('acumulacion', 'consumo')),
  description text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_points_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_points_log' AND policyname = 'Anyone can read points log') THEN
    CREATE POLICY "Anyone can read points log" ON public.customer_points_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_points_log' AND policyname = 'Insert via RPC only') THEN
    CREATE POLICY "Insert via RPC only" ON public.customer_points_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 4. Drop and recreate view
DROP VIEW IF EXISTS public.customer_levels;

CREATE VIEW public.customer_levels
WITH (security_invoker = true)
AS
SELECT c.id AS customer_id,
    c.cantidad_runas,
    c.puntos,
    c.puntos_lifetime,
    cld.level_code,
    cld.level_name,
    cld.min_points,
    cld.points_cost,
    next_level.min_points AS next_level_points,
    next_level.level_name AS next_level_name,
    cld.icon,
    cld.color,
    cld.benefits
   FROM customers c
     CROSS JOIN LATERAL ( SELECT *
           FROM customer_level_definitions
          WHERE c.puntos_lifetime >= customer_level_definitions.min_points 
            AND (customer_level_definitions.max_points IS NULL OR c.puntos_lifetime <= customer_level_definitions.max_points) 
            AND customer_level_definitions.is_active = true
          ORDER BY customer_level_definitions.level_order DESC
         LIMIT 1) cld
     LEFT JOIN LATERAL ( SELECT *
           FROM customer_level_definitions
          WHERE customer_level_definitions.min_points > c.puntos_lifetime 
            AND customer_level_definitions.is_active = true
          ORDER BY customer_level_definitions.level_order
         LIMIT 1) next_level ON true;

-- 5. RPC: accrue_points_for_order
CREATE OR REPLACE FUNCTION public.accrue_points_for_order(
  p_customer_id uuid,
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_real_amount numeric;
  v_points integer;
  v_new_puntos integer;
  v_level RECORD;
  v_leveled_up boolean := false;
  v_new_level_name text;
BEGIN
  SELECT total, payment_runas FROM orders 
  WHERE id = p_order_id AND customer_id = p_customer_id
  INTO v_order;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('points', 0, 'leveled_up', false);
  END IF;

  v_real_amount := GREATEST(0, v_order.total - COALESCE(v_order.payment_runas, 0));
  
  IF v_real_amount <= 0 THEN
    RETURN jsonb_build_object('points', 0, 'leveled_up', false);
  END IF;

  v_points := floor(v_real_amount / 100)::integer;
  IF v_points <= 0 THEN
    RETURN jsonb_build_object('points', 0, 'leveled_up', false);
  END IF;

  UPDATE customers 
  SET puntos = puntos + v_points,
      puntos_lifetime = puntos_lifetime + v_points
  WHERE id = p_customer_id
  RETURNING puntos INTO v_new_puntos;

  INSERT INTO customer_points_log (customer_id, amount, type, description, order_id)
  VALUES (p_customer_id, v_points, 'acumulacion', 
          'Compra por $' || v_real_amount::text, p_order_id);

  FOR v_level IN
    SELECT id, level_name, level_order, min_points, points_cost
    FROM customer_level_definitions
    WHERE is_active = true
      AND points_cost > 0
      AND min_points <= (SELECT puntos_lifetime FROM customers WHERE id = p_customer_id)
    ORDER BY level_order ASC
  LOOP
    IF v_new_puntos >= v_level.points_cost THEN
      IF NOT EXISTS (
        SELECT 1 FROM customer_points_log 
        WHERE customer_id = p_customer_id 
          AND type = 'consumo'
          AND description = 'Nivel: ' || v_level.level_name
      ) THEN
        UPDATE customers 
        SET puntos = puntos - v_level.points_cost
        WHERE id = p_customer_id
        RETURNING puntos INTO v_new_puntos;

        INSERT INTO customer_points_log (customer_id, amount, type, description)
        VALUES (p_customer_id, -v_level.points_cost, 'consumo', 
                'Nivel: ' || v_level.level_name);

        v_leveled_up := true;
        v_new_level_name := v_level.level_name;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'points', v_points, 
    'new_balance', v_new_puntos,
    'leveled_up', v_leveled_up,
    'new_level', COALESCE(v_new_level_name, '')
  );
END;
$$;
