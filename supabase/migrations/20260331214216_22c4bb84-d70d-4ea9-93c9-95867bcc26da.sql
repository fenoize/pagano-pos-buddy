
CREATE OR REPLACE FUNCTION public.get_mapbox_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mapbox_token FROM delivery_settings LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_mapbox_token() TO anon, authenticated;
