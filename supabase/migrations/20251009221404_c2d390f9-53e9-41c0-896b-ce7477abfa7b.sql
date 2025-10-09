-- Actualizar set_staff_context para persistir durante toda la sesión
CREATE OR REPLACE FUNCTION public.set_staff_context(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, true);
  PERFORM set_config('app.customer_id', '', true);
  PERFORM set_config('app.customer_account_id', '', true);
END;
$function$;

-- También actualizar set_customer_context para consistencia
CREATE OR REPLACE FUNCTION public.set_customer_context(p_account_id uuid, p_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.customer_account_id', p_account_id::text, true);
  PERFORM set_config('app.customer_id', p_customer_id::text, true);
  PERFORM set_config('app.user_id', '', true);
END;
$function$;