
-- 1. Add delivery coordinates to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat double precision;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng double precision;

-- 2. Create delivery_tracking table (last-known-position only, no history in V1)
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL UNIQUE,
  delivery_person_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision,
  accuracy double precision,
  tracking_active boolean DEFAULT true,
  near_destination_notified boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. RLS
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Customers can read tracking for their own orders
CREATE POLICY "Customers read own order tracking"
  ON delivery_tracking FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM orders WHERE customer_id = (select auth.uid())));

-- Staff can read all tracking
CREATE POLICY "Staff read all tracking"
  ON delivery_tracking FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()));

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_tracking;

-- 5. RPC: upsert_delivery_tracking (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION upsert_delivery_tracking(
  p_order_id uuid,
  p_driver_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_heading double precision DEFAULT NULL,
  p_accuracy double precision DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dest_lat double precision;
  v_dest_lng double precision;
  v_dist_m double precision;
  v_already_notified boolean;
  v_should_notify boolean := false;
BEGIN
  -- Get destination from orders
  SELECT delivery_lat, delivery_lng INTO v_dest_lat, v_dest_lng
  FROM orders WHERE id = p_order_id;

  -- Upsert tracking row
  INSERT INTO delivery_tracking (order_id, delivery_person_id, latitude, longitude, heading, accuracy, updated_at)
  VALUES (p_order_id, p_driver_id, p_lat, p_lng, p_heading, p_accuracy, now())
  ON CONFLICT (order_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    accuracy = EXCLUDED.accuracy,
    tracking_active = true,
    updated_at = now();

  -- Calculate distance if destination exists (Haversine)
  IF v_dest_lat IS NOT NULL AND v_dest_lng IS NOT NULL THEN
    v_dist_m := 6371000 * 2 * asin(sqrt(
      power(sin(radians(v_dest_lat - p_lat) / 2), 2) +
      cos(radians(p_lat)) * cos(radians(v_dest_lat)) *
      power(sin(radians(v_dest_lng - p_lng) / 2), 2)
    ));

    SELECT near_destination_notified INTO v_already_notified
    FROM delivery_tracking WHERE order_id = p_order_id;

    IF v_dist_m <= 500 AND NOT COALESCE(v_already_notified, false) THEN
      UPDATE delivery_tracking SET near_destination_notified = true WHERE order_id = p_order_id;
      v_should_notify := true;
    END IF;
  END IF;

  RETURN jsonb_build_object('should_notify_near', v_should_notify, 'distance_m', COALESCE(v_dist_m, -1));
END;
$$;

-- 6. RPC: stop_delivery_tracking (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION stop_delivery_tracking(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE delivery_tracking SET tracking_active = false, updated_at = now()
  WHERE order_id = p_order_id;
END;
$$;
