CREATE OR REPLACE FUNCTION public.reorder_payment_methods(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_index int := 0;
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  FOREACH v_id IN ARRAY p_ids LOOP
    UPDATE public.payment_methods
       SET display_order = v_index,
           updated_at = now()
     WHERE id = v_id;
    v_index := v_index + 1;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_payment_methods(uuid[]) TO anon, authenticated;