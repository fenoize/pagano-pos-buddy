-- Función RPC que establece el contexto y actualiza el estado de la orden
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status order_status,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_updated_order RECORD;
BEGIN
  -- Establecer contexto dentro de la transacción
  PERFORM set_config('app.user_id', p_user_id::text, false);
  PERFORM set_config('app.customer_id', '', false);
  PERFORM set_config('app.customer_account_id', '', false);
  
  -- Verificar que el usuario es staff activo
  IF NOT is_active_staff() THEN
    RAISE EXCEPTION 'Usuario no tiene permisos para actualizar órdenes';
  END IF;
  
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
$function$;

COMMENT ON FUNCTION public.update_order_status IS 
'Actualiza el estado de una orden con el contexto de usuario establecido dentro de la transacción';