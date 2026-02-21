
-- Drop the TEXT overload (the one without audit logging)
DROP FUNCTION IF EXISTS public.update_order_status(uuid, text, uuid);

-- Recreate the single version with order_status enum + audit logging
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
  v_old_status text;
BEGIN
  -- Verificar que el usuario tiene una sesión activa
  IF NOT public.has_user_active_session(p_user_id) THEN
    RAISE EXCEPTION 'Usuario no tiene sesión activa para actualizar órdenes';
  END IF;
  
  -- Establecer contexto para triggers/auditoría
  PERFORM set_config('app.user_id', p_user_id::text, true);
  
  -- Obtener estado anterior
  SELECT status INTO v_old_status FROM public.orders WHERE id = p_order_id;
  
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Orden no encontrada';
  END IF;
  
  -- Actualizar el estado
  UPDATE public.orders
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_updated_order;
  
  -- Registrar en order_audits
  INSERT INTO public.order_audits (order_id, user_id, field_name, old_value, new_value, reason)
  VALUES (p_order_id, p_user_id, 'status', v_old_status, p_new_status::text, 'Cambio de estado');
  
  -- Retornar datos actualizados
  RETURN jsonb_build_object(
    'status', v_updated_order.status,
    'updated_at', v_updated_order.updated_at
  );
END;
$$;
