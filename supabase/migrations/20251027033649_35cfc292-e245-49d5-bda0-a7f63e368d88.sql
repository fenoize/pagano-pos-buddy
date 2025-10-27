-- Drop existing function
DROP FUNCTION IF EXISTS public.delivery_export_range_with_time(timestamptz, timestamptz, text);

-- Create updated function with delivery person fields
CREATE OR REPLACE FUNCTION public.delivery_export_range_with_time(
  _start timestamptz,
  _end timestamptz,
  _tz text DEFAULT 'America/Santiago',
  _delivery_person_id uuid DEFAULT NULL
)
RETURNS TABLE(
  fecha_hora text,
  numero_orden text,
  direccion text,
  monto_delivery text,
  repartidor_id text,
  repartidor_nombre text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(o.created_at AT TIME ZONE _tz, 'YYYY-MM-DD HH24:MI:SS') AS fecha_hora,
    o.order_number::text AS numero_orden,
    COALESCE(
      o.delivery_address || 
      CASE 
        WHEN o.delivery_number IS NOT NULL THEN ' #' || o.delivery_number 
        ELSE '' 
      END ||
      CASE 
        WHEN o.delivery_comuna IS NOT NULL THEN ', ' || o.delivery_comuna 
        ELSE '' 
      END,
      'Sin dirección'
    ) AS direccion,
    COALESCE(o.delivery_fee, 0)::text AS monto_delivery,
    COALESCE(o.delivery_person_id::text, '') AS repartidor_id,
    COALESCE(o.delivery_person_name, 'Sin asignar') AS repartidor_nombre
  FROM orders o
  WHERE o.fulfillment = 'delivery'
    AND o.created_at >= _start
    AND o.created_at <= _end
    AND (
      _delivery_person_id IS NULL OR
      (_delivery_person_id::text = 'unassigned' AND o.delivery_person_id IS NULL) OR
      o.delivery_person_id = _delivery_person_id
    )
  ORDER BY o.created_at DESC;
END;
$$;