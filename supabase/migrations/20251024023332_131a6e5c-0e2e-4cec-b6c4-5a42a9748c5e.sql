-- Función para exportar deliveries con filtro de fecha y hora
CREATE OR REPLACE FUNCTION public.delivery_export_range_with_time(
  _start timestamptz,
  _end timestamptz,
  _tz text DEFAULT 'America/Santiago'
)
RETURNS TABLE(
  fecha_hora text,
  numero_orden text,
  direccion text,
  monto_delivery text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_char(o.created_at AT TIME ZONE _tz, 'DD/MM/YYYY HH24:MI:SS') AS fecha_hora,
    o.order_number::text AS numero_orden,
    COALESCE(
      o.delivery_address || ' ' || o.delivery_number || 
      CASE WHEN o.delivery_comuna IS NOT NULL THEN ', ' || o.delivery_comuna ELSE '' END,
      'Sin dirección'
    ) AS direccion,
    COALESCE(o.delivery_fee, 0)::text AS monto_delivery
  FROM public.orders o
  WHERE o.fulfillment = 'delivery'
    AND o.created_at >= _start
    AND o.created_at <= _end
    AND o.status NOT IN ('Cancelado')
  ORDER BY o.created_at DESC;
$$;