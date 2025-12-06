-- Tabla para configurar suscripciones de runas de clientes
CREATE TABLE public.customer_runa_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('monthly', 'weekly', 'birthday')),
  runas_amount INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_execution_date DATE,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  notes TEXT,
  UNIQUE(customer_id, subscription_type)
);

-- Índices para optimizar queries
CREATE INDEX idx_customer_runa_subs_customer ON public.customer_runa_subscriptions(customer_id);
CREATE INDEX idx_customer_runa_subs_active ON public.customer_runa_subscriptions(is_active, subscription_type);
CREATE INDEX idx_customer_runa_subs_next_exec ON public.customer_runa_subscriptions(next_execution_date) WHERE is_active = true;

-- Configuración global de runas automáticas
CREATE TABLE public.runa_auto_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar configuraciones por defecto
INSERT INTO public.runa_auto_config (config_key, config_value) VALUES
  ('birthday_bonus', '{"enabled": true, "runas_amount": 50, "message": "¡Feliz cumpleaños! Te regalamos runas para celebrar contigo."}'),
  ('monthly_subscription', '{"default_runas": 10, "enabled": true}'),
  ('weekly_subscription', '{"default_runas": 5, "enabled": true}');

-- RLS policies
ALTER TABLE public.customer_runa_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runa_auto_config ENABLE ROW LEVEL SECURITY;

-- Staff puede ver y gestionar suscripciones
CREATE POLICY "Staff can view runa subscriptions"
  ON public.customer_runa_subscriptions FOR SELECT
  USING (is_active_staff());

CREATE POLICY "Staff can manage runa subscriptions"
  ON public.customer_runa_subscriptions FOR ALL
  USING (is_active_staff())
  WITH CHECK (is_active_staff());

-- Config acceso público lectura, solo admins escriben
CREATE POLICY "Anyone can view runa config"
  ON public.runa_auto_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage runa config"
  ON public.runa_auto_config FOR ALL
  USING (is_staff_admin())
  WITH CHECK (is_staff_admin());

-- Trigger para actualizar updated_at
CREATE TRIGGER update_customer_runa_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_runa_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Función para procesar runas automáticas (será llamada por cron)
CREATE OR REPLACE FUNCTION public.process_auto_runas()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INTEGER := 0;
  v_birthday_processed INTEGER := 0;
  v_subscription_processed INTEGER := 0;
  v_sub RECORD;
  v_customer RECORD;
  v_birthday_config JSONB;
BEGIN
  -- Obtener config de cumpleaños
  SELECT config_value INTO v_birthday_config
  FROM runa_auto_config WHERE config_key = 'birthday_bonus';

  -- Procesar cumpleaños del día
  IF (v_birthday_config->>'enabled')::boolean THEN
    FOR v_customer IN
      SELECT c.id, c.nombres, c.apellidos, c.fecha_nacimiento
      FROM customers c
      WHERE c.fecha_nacimiento IS NOT NULL
        AND EXTRACT(MONTH FROM c.fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM c.fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE)
        AND c.estado_cliente = 'Activo'
        -- No procesar si ya recibió runas de cumpleaños este año
        AND NOT EXISTS (
          SELECT 1 FROM runas_transactions rt
          WHERE rt.customer_id = c.id
            AND rt.type = 'promo'
            AND rt.motivo LIKE '%cumpleaños%'
            AND EXTRACT(YEAR FROM rt.created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
        )
    LOOP
      -- Crear transacción de runas
      INSERT INTO runas_transactions (customer_id, type, runas, amount, origen, motivo)
      VALUES (
        v_customer.id,
        'promo',
        (v_birthday_config->>'runas_amount')::integer,
        0,
        'Sistema',
        v_birthday_config->>'message'
      );
      
      -- Actualizar saldo del cliente
      UPDATE customers 
      SET cantidad_runas = COALESCE(cantidad_runas, 0) + (v_birthday_config->>'runas_amount')::integer,
          updated_at = now()
      WHERE id = v_customer.id;
      
      v_birthday_processed := v_birthday_processed + 1;
    END LOOP;
  END IF;

  -- Procesar suscripciones activas que toca ejecutar hoy
  FOR v_sub IN
    SELECT crs.*, c.nombres, c.apellidos
    FROM customer_runa_subscriptions crs
    JOIN customers c ON c.id = crs.customer_id
    WHERE crs.is_active = true
      AND crs.next_execution_date <= CURRENT_DATE
      AND c.estado_cliente = 'Activo'
  LOOP
    -- Crear transacción de runas
    INSERT INTO runas_transactions (customer_id, type, runas, amount, origen, motivo)
    VALUES (
      v_sub.customer_id,
      'promo',
      v_sub.runas_amount,
      0,
      'Sistema',
      CASE v_sub.subscription_type
        WHEN 'monthly' THEN 'Suscripción mensual de runas'
        WHEN 'weekly' THEN 'Suscripción semanal de runas'
        ELSE 'Bonificación automática'
      END || COALESCE(' - ' || v_sub.notes, '')
    );
    
    -- Actualizar saldo del cliente
    UPDATE customers 
    SET cantidad_runas = COALESCE(cantidad_runas, 0) + v_sub.runas_amount,
        updated_at = now()
    WHERE id = v_sub.customer_id;
    
    -- Actualizar próxima ejecución
    UPDATE customer_runa_subscriptions
    SET last_executed_at = now(),
        next_execution_date = CASE subscription_type
          WHEN 'monthly' THEN next_execution_date + INTERVAL '1 month'
          WHEN 'weekly' THEN next_execution_date + INTERVAL '1 week'
          ELSE NULL
        END,
        updated_at = now()
    WHERE id = v_sub.id;
    
    v_subscription_processed := v_subscription_processed + 1;
  END LOOP;

  v_processed := v_birthday_processed + v_subscription_processed;
  
  RETURN jsonb_build_object(
    'processed', v_processed,
    'birthday_processed', v_birthday_processed,
    'subscription_processed', v_subscription_processed,
    'executed_at', now()
  );
END;
$$;

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.process_auto_runas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_auto_runas() TO anon;