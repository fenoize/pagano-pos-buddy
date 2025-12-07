-- =====================================================
-- INTEGRACIÓN ONESIGNAL - NOTIFICACIONES PUSH
-- =====================================================

-- 1. Configuración OneSignal en tabla config
INSERT INTO public.config (key, value)
VALUES 
  ('onesignal_app_id', '""'),
  ('onesignal_web_site_name', '""'),
  ('onesignal_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 2. Configuración global de notificaciones transaccionales
INSERT INTO public.config (key, value)
VALUES 
  ('notify_client_order_status', 'true'),
  ('notify_client_delivery_assigned', 'true'),
  ('notify_client_runas_earned', 'true'),
  ('notify_rider_new_order', 'true')
ON CONFLICT (key) DO NOTHING;

-- 3. Tabla de preferencias de notificación por cliente
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  marketing_push_enabled BOOLEAN NOT NULL DEFAULT true,
  order_push_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_push_enabled BOOLEAN NOT NULL DEFAULT true,
  runas_push_enabled BOOLEAN NOT NULL DEFAULT true,
  onesignal_subscribed BOOLEAN NOT NULL DEFAULT false,
  permission_prompted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_customer_notification_prefs UNIQUE (customer_id)
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_notification_preferences_customer 
ON public.notification_preferences(customer_id);

-- RLS para notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own notification preferences"
ON public.notification_preferences FOR SELECT
USING (customer_id IN (
  SELECT id FROM customers WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Customers can update own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (customer_id IN (
  SELECT id FROM customers WHERE auth_user_id = auth.uid()
))
WITH CHECK (customer_id IN (
  SELECT id FROM customers WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Staff can view all notification preferences"
ON public.notification_preferences FOR SELECT
USING (is_active_staff_with_token());

CREATE POLICY "System can insert notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (true);

-- 4. Tabla de eventos/log de notificaciones
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('order_status', 'delivery_assigned', 'runas_earned', 'marketing', 'rider_new_order')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  channel TEXT NOT NULL DEFAULT 'push',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Índices para notification_events
CREATE INDEX IF NOT EXISTS idx_notification_events_customer ON public.notification_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_status ON public.notification_events(status);
CREATE INDEX IF NOT EXISTS idx_notification_events_type ON public.notification_events(type);
CREATE INDEX IF NOT EXISTS idx_notification_events_created ON public.notification_events(created_at DESC);

-- RLS para notification_events
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all notification events"
ON public.notification_events FOR SELECT
USING (is_active_staff_with_token());

CREATE POLICY "System can insert notification events"
ON public.notification_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update notification events"
ON public.notification_events FOR UPDATE
USING (true)
WITH CHECK (true);

-- 5. Tabla de campañas de marketing push
CREATE TABLE IF NOT EXISTS public.marketing_push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all_customers',
  send_type TEXT NOT NULL DEFAULT 'now' CHECK (send_type IN ('now', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'scheduled', 'error')),
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Índices para marketing_push_campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_push_campaigns_status ON public.marketing_push_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_push_campaigns_created ON public.marketing_push_campaigns(created_at DESC);

-- RLS para marketing_push_campaigns
ALTER TABLE public.marketing_push_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all marketing campaigns"
ON public.marketing_push_campaigns FOR SELECT
USING (is_active_staff_with_token());

CREATE POLICY "Staff can create marketing campaigns"
ON public.marketing_push_campaigns FOR INSERT
WITH CHECK (is_active_staff_with_token());

CREATE POLICY "Staff can update marketing campaigns"
ON public.marketing_push_campaigns FOR UPDATE
USING (is_active_staff_with_token())
WITH CHECK (is_active_staff_with_token());

CREATE POLICY "Staff can delete marketing campaigns"
ON public.marketing_push_campaigns FOR DELETE
USING (is_active_staff_with_token());

-- 6. Trigger para crear preferencias de notificación al registrar cliente
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (customer_id)
  VALUES (NEW.id)
  ON CONFLICT (customer_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON public.customers;
CREATE TRIGGER trigger_create_notification_preferences
AFTER INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_preferences();

-- 7. Función helper para obtener configuración de OneSignal
CREATE OR REPLACE FUNCTION public.get_onesignal_config()
RETURNS TABLE (
  app_id TEXT,
  web_site_name TEXT,
  enabled BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    TRIM(BOTH '"' FROM (SELECT value::text FROM config WHERE key = 'onesignal_app_id')) AS app_id,
    TRIM(BOTH '"' FROM (SELECT value::text FROM config WHERE key = 'onesignal_web_site_name')) AS web_site_name,
    (SELECT value::text FROM config WHERE key = 'onesignal_enabled')::boolean AS enabled;
$$;

-- 8. Función helper para verificar preferencias de notificación
CREATE OR REPLACE FUNCTION public.check_notification_allowed(
  p_customer_id UUID,
  p_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN := false;
  v_global_enabled BOOLEAN := true;
BEGIN
  -- Verificar configuración global
  CASE p_type
    WHEN 'order_status' THEN
      SELECT (value::text)::boolean INTO v_global_enabled 
      FROM config WHERE key = 'notify_client_order_status';
    WHEN 'delivery_assigned' THEN
      SELECT (value::text)::boolean INTO v_global_enabled 
      FROM config WHERE key = 'notify_client_delivery_assigned';
    WHEN 'runas_earned' THEN
      SELECT (value::text)::boolean INTO v_global_enabled 
      FROM config WHERE key = 'notify_client_runas_earned';
    WHEN 'rider_new_order' THEN
      SELECT (value::text)::boolean INTO v_global_enabled 
      FROM config WHERE key = 'notify_rider_new_order';
    WHEN 'marketing' THEN
      v_global_enabled := true; -- Marketing siempre habilitado globalmente
  END CASE;

  IF NOT COALESCE(v_global_enabled, true) THEN
    RETURN false;
  END IF;

  -- Verificar preferencias del cliente
  SELECT 
    CASE p_type
      WHEN 'order_status' THEN order_push_enabled
      WHEN 'delivery_assigned' THEN delivery_push_enabled
      WHEN 'runas_earned' THEN runas_push_enabled
      WHEN 'marketing' THEN marketing_push_enabled
      ELSE true
    END
  INTO v_allowed
  FROM notification_preferences
  WHERE customer_id = p_customer_id;

  RETURN COALESCE(v_allowed, true);
END;
$$;

-- 9. Crear preferencias para clientes existentes
INSERT INTO public.notification_preferences (customer_id)
SELECT id FROM public.customers
WHERE id NOT IN (SELECT customer_id FROM public.notification_preferences)
ON CONFLICT (customer_id) DO NOTHING;