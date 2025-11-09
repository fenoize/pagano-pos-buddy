-- Políticas RLS para online_order_settings
-- Solo staff admins pueden ver y modificar configuración de pedidos online

-- Permitir SELECT a staff activo
CREATE POLICY "Staff can view online order settings"
ON public.online_order_settings
FOR SELECT
USING (public.is_active_staff_with_token());

-- Permitir UPDATE a admins activos
CREATE POLICY "Admins can update online order settings"
ON public.online_order_settings
FOR UPDATE
USING (public.is_active_staff_with_token())
WITH CHECK (public.is_active_staff_with_token());

-- Permitir INSERT a admins activos (para crear configuración inicial)
CREATE POLICY "Admins can insert online order settings"
ON public.online_order_settings
FOR INSERT
WITH CHECK (public.is_active_staff_with_token());