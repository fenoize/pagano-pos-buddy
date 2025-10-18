-- Agregar configuraciones de restricciones de runas
INSERT INTO config (key, value) VALUES
  ('runas_exclude_if_paid_with_runas', 'true'::jsonb),
  ('runas_exclude_if_discounted', 'true'::jsonb),
  ('runas_min_eligible_amount', '1000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Función para verificar y otorgar insignias
CREATE OR REPLACE FUNCTION public.check_and_award_badge(
  p_customer_id UUID,
  p_badge_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge_id UUID;
  v_already_awarded BOOLEAN;
BEGIN
  -- Obtener ID de la insignia activa
  SELECT id INTO v_badge_id
  FROM customer_badges
  WHERE code = p_badge_code
    AND is_active = true;
  
  IF v_badge_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si ya la tiene
  SELECT EXISTS(
    SELECT 1 FROM customer_badges_awarded
    WHERE customer_id = p_customer_id
      AND badge_id = v_badge_id
  ) INTO v_already_awarded;
  
  IF v_already_awarded THEN
    RETURN FALSE;
  END IF;
  
  -- Otorgar insignia
  INSERT INTO customer_badges_awarded (customer_id, badge_id)
  VALUES (p_customer_id, v_badge_id);
  
  RETURN TRUE;
END;
$$;

-- Función para verificar pedidos en las últimas 4 semanas consecutivas
CREATE OR REPLACE FUNCTION public.has_orders_in_last_4_weeks(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_count INTEGER := 0;
  v_current_week DATE;
  v_week INTEGER;
BEGIN
  -- Verificar cada una de las últimas 4 semanas
  FOR v_week IN 0..3 LOOP
    v_current_week := CURRENT_DATE - (v_week * 7);
    
    IF EXISTS (
      SELECT 1 FROM orders
      WHERE customer_id = p_customer_id
        AND created_at >= v_current_week - INTERVAL '7 days'
        AND created_at < v_current_week
        AND status != 'Cancelado'
    ) THEN
      v_week_count := v_week_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_week_count >= 4;
END;
$$;