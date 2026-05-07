DROP FUNCTION IF EXISTS public.get_customer_alliance_coupons(uuid);

CREATE OR REPLACE FUNCTION public.get_customer_alliance_coupons(_customer_id uuid)
 RETURNS TABLE(coupon_id uuid, coupon_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT b.coupon_id, c.code
  FROM public.marketing_alliance_benefits b
  JOIN public.marketing_alliances a ON a.id = b.alliance_id
  JOIN public.coupons c ON c.id = b.coupon_id
  WHERE b.customer_id = _customer_id
    AND b.benefit_type = 'coupon'
    AND b.coupon_id IS NOT NULL
    AND a.is_active = true
    AND c.is_active = true
    AND (a.starts_at IS NULL OR a.starts_at <= now())
    AND (a.ends_at IS NULL OR a.ends_at >= now())
  UNION
  SELECT DISTINCT c.id, c.code
  FROM public.coupon_allowed_tags cat
  JOIN public.coupons c ON c.id = cat.coupon_id
  JOIN public.customer_tag_assignments cta
    ON cta.tag_id = cat.tag_id AND cta.customer_id = _customer_id
  WHERE c.is_active = true
    AND (c.date_start IS NULL OR c.date_start <= now())
    AND (c.date_end IS NULL OR c.date_end >= now());
$function$;