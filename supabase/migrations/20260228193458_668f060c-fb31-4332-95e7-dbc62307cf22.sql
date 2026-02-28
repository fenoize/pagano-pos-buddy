
CREATE OR REPLACE FUNCTION public.get_suppliers_by_ids(p_ids uuid[])
RETURNS TABLE(id uuid, name text, phone text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.phone, s.email
  FROM suppliers s
  WHERE s.id = ANY(p_ids);
$$;
