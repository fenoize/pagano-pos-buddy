
CREATE OR REPLACE FUNCTION public.notify_admin_disconnection(
  branch_name text,
  cashier_name text,
  disconnected_at text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_id text;
  v_api_key text;
BEGIN
  SELECT trim(both '"' from value::text) INTO v_app_id FROM public.config WHERE key = 'onesignal_app_id';
  SELECT trim(both '"' from value::text) INTO v_api_key FROM public.config WHERE key = 'onesignal_api_key';

  IF v_app_id IS NULL OR v_api_key IS NULL OR v_app_id = '' OR v_api_key = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://onesignal.com/api/v1/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Basic ' || v_api_key
    ),
    body := jsonb_build_object(
      'app_id', v_app_id,
      'filters', jsonb_build_array(
        jsonb_build_object('field', 'tag', 'key', 'role', 'relation', '=', 'value', 'Administrador')
      ),
      'headings', jsonb_build_object('es', '⚠ Conexión perdida en el POS'),
      'contents', jsonb_build_object(
        'es', 'Sucursal ' || branch_name || ' — Cajero ' || cashier_name || ' perdió conexión a las ' || disconnected_at || '. Verificar estado.'
      ),
      'priority', 10
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_admin_disconnection(text, text, text) TO anon, authenticated;
