
-- La función update_order_status necesita verificar la sesión del usuario actual, no cualquier sesión.
-- El problema es que is_active_staff() solo verifica has_any_active_staff_session() global.
-- Vamos a arreglar update_order_status para que verifique la sesión del usuario específico.

-- Primero, crear una función para verificar si un usuario específico tiene sesión activa
CREATE OR REPLACE FUNCTION public.has_user_active_session(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM staff_sessions
    WHERE user_id = p_user_id
      AND is_active = true
      AND expires_at > NOW()
  );
$$;

-- Ahora recrear update_order_status para usar esta verificación específica
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_order RECORD;
BEGIN
  -- Verificar que el usuario específico tiene una sesión activa
  IF NOT public.has_user_active_session(p_user_id) THEN
    RAISE EXCEPTION 'Usuario no tiene sesión activa para actualizar órdenes';
  END IF;
  
  -- Establecer contexto para triggers/auditoría
  PERFORM set_config('app.user_id', p_user_id::text, true);
  
  -- Actualizar el estado
  UPDATE public.orders
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_updated_order;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;
  
  -- Retornar datos actualizados
  RETURN jsonb_build_object(
    'status', v_updated_order.status,
    'updated_at', v_updated_order.updated_at
  );
END;
$$;

-- También asegurar que la política de UPDATE de orders sea permisiva
-- Ya existe "Allow update access to orders" con USING(true), que es correcto
