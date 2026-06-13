
CREATE OR REPLACE FUNCTION public.lia_execute_select(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  normalized text;
  final_query text;
BEGIN
  normalized := lower(btrim(query_text));

  -- Must start with select or with
  IF normalized !~ '^(select|with)\s' THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;

  -- Reject dangerous keywords (word boundary)
  IF normalized ~ '\y(insert|update|delete|drop|truncate|alter|create|grant|revoke|comment|vacuum|reindex|copy|do|call|merge|replace)\y' THEN
    RAISE EXCEPTION 'Forbidden keyword detected';
  END IF;

  -- No semicolons mid-query (allow trailing)
  IF position(';' in btrim(query_text, E' \t\n;')) > 0 THEN
    RAISE EXCEPTION 'Multiple statements not allowed';
  END IF;

  -- Wrap with limit 100
  final_query := 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' 
                 || btrim(query_text, E' \t\n;') 
                 || ' LIMIT 100) t';

  EXECUTE final_query INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.lia_execute_select(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lia_execute_select(text) TO service_role;
