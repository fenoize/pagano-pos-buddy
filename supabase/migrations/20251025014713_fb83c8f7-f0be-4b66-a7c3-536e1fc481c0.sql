-- Fase 2: Funciones de badges mejoradas

-- Función mejorada para otorgar insignias
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
  v_already_has BOOLEAN;
BEGIN
  -- Obtener ID de la insignia
  SELECT id INTO v_badge_id
  FROM customer_badges
  WHERE code = p_badge_code AND is_active = true;
  
  IF v_badge_id IS NULL THEN
    RAISE NOTICE 'Badge code % not found or inactive', p_badge_code;
    RETURN FALSE;
  END IF;
  
  -- Verificar si ya tiene la insignia
  SELECT EXISTS(
    SELECT 1 FROM customer_badges_awarded
    WHERE customer_id = p_customer_id AND badge_id = v_badge_id
  ) INTO v_already_has;
  
  IF v_already_has THEN
    RETURN FALSE; -- Ya tiene la insignia
  END IF;
  
  -- Otorgar insignia
  INSERT INTO customer_badges_awarded (customer_id, badge_id, awarded_at)
  VALUES (p_customer_id, v_badge_id, NOW())
  ON CONFLICT (customer_id, badge_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error awarding badge: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Función para verificar 4 semanas consecutivas
CREATE OR REPLACE FUNCTION public.has_orders_in_last_4_weeks(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_count INTEGER := 0;
  v_week_start DATE;
BEGIN
  -- Verificar las últimas 4 semanas
  FOR v_week_count IN 1..4 LOOP
    v_week_start := DATE_TRUNC('week', NOW() - (v_week_count || ' weeks')::INTERVAL)::DATE;
    
    -- Verificar si hay al menos un pedido en esta semana
    IF NOT EXISTS (
      SELECT 1 FROM orders
      WHERE customer_id = p_customer_id
        AND status NOT IN ('Cancelado')
        AND created_at >= v_week_start
        AND created_at < v_week_start + INTERVAL '7 days'
    ) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error checking consecutive weeks: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Asegurar clave primaria en customer_badges_awarded
ALTER TABLE customer_badges_awarded
DROP CONSTRAINT IF EXISTS customer_badges_awarded_pkey;

ALTER TABLE customer_badges_awarded
ADD PRIMARY KEY (customer_id, badge_id);

-- Permitir a funciones DEFINER insertar insignias
DROP POLICY IF EXISTS "Allow function insert badges" ON customer_badges_awarded;
CREATE POLICY "Allow function insert badges"
  ON customer_badges_awarded
  FOR INSERT
  WITH CHECK (true);