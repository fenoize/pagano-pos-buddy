-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This ensures queries run with the permissions of the querying user, not the view owner

-- Drop and recreate delivery_orders view with security_invoker = true
DROP VIEW IF EXISTS public.delivery_orders;

CREATE VIEW public.delivery_orders
WITH (security_invoker = true)
AS
SELECT 
  o.id,
  o.order_number,
  o.customer_id,
  o.fulfillment,
  o.items,
  o.subtotal,
  o.delivery_fee,
  o.discount,
  o.total,
  o.payment_method,
  o.status,
  o.created_at,
  o.updated_at,
  o.delivery_zone_id,
  o.delivery_zone_name,
  o.delivery_address,
  o.delivery_number,
  o.delivery_comuna_id,
  o.delivery_comuna,
  o.delivery_reference,
  o.delivery_person_id,
  o.delivery_person_name,
  o.delivery_distance,
  o.delivery_assigned_at,
  o.delivery_delivered_at,
  o.notes,
  o.nombre_resumen,
  c.name AS customer_name,
  c.phone AS customer_phone,
  EXTRACT(epoch FROM now() - o.created_at) / 60::numeric AS minutes_since_created
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE o.fulfillment = 'delivery'::fulfillment_type 
  AND o.status NOT IN ('Cancelado'::order_status, 'Entregado'::order_status);

-- Drop and recreate marketing_promo_metrics view with security_invoker = true
DROP VIEW IF EXISTS public.marketing_promo_metrics;

CREATE VIEW public.marketing_promo_metrics
WITH (security_invoker = true)
AS
SELECT 
  p.id AS promo_id,
  p.title AS promo_title,
  p.is_active,
  count(DISTINCT CASE WHEN pa.event_type = 'view'::text THEN pa.id ELSE NULL::uuid END) AS total_views,
  count(DISTINCT CASE WHEN pa.event_type = 'click'::text THEN pa.id ELSE NULL::uuid END) AS total_clicks,
  count(DISTINCT CASE WHEN pa.event_type = 'conversion'::text THEN pa.id ELSE NULL::uuid END) AS total_conversions,
  count(DISTINCT CASE WHEN pa.event_type = 'click'::text THEN pa.customer_id ELSE NULL::uuid END) AS unique_clickers,
  count(DISTINCT CASE WHEN pa.event_type = 'conversion'::text THEN pa.customer_id ELSE NULL::uuid END) AS unique_converters,
  round(
    CASE
      WHEN count(DISTINCT CASE WHEN pa.event_type = 'click'::text THEN pa.id ELSE NULL::uuid END) > 0 
      THEN count(DISTINCT CASE WHEN pa.event_type = 'conversion'::text THEN pa.id ELSE NULL::uuid END)::numeric 
           / count(DISTINCT CASE WHEN pa.event_type = 'click'::text THEN pa.id ELSE NULL::uuid END)::numeric * 100::numeric
      ELSE 0::numeric
    END, 2) AS conversion_rate,
  round(
    CASE
      WHEN count(DISTINCT CASE WHEN pa.event_type = 'view'::text THEN pa.id ELSE NULL::uuid END) > 0 
      THEN count(DISTINCT CASE WHEN pa.event_type = 'click'::text THEN pa.id ELSE NULL::uuid END)::numeric 
           / count(DISTINCT CASE WHEN pa.event_type = 'view'::text THEN pa.id ELSE NULL::uuid END)::numeric * 100::numeric
      ELSE 0::numeric
    END, 2) AS ctr,
  COALESCE(sum(
    CASE
      WHEN pa.event_type = 'conversion'::text 
      THEN (pa.metadata ->> 'order_total'::text)::integer
      ELSE NULL::integer
    END), 0::bigint) AS total_revenue,
  min(pa.created_at) AS first_event,
  max(pa.created_at) AS last_event
FROM marketing_app_promotions p
LEFT JOIN marketing_promo_analytics pa ON pa.promo_id = p.id
GROUP BY p.id, p.title, p.is_active;