DROP POLICY IF EXISTS "Admins manage marketing alliances" ON public.marketing_alliances;
CREATE POLICY "Admins manage marketing alliances" ON public.marketing_alliances
FOR ALL
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = public.get_current_staff_user_id() AND u.role = 'Administrador' AND u.active = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = public.get_current_staff_user_id() AND u.role = 'Administrador' AND u.active = true));

DROP POLICY IF EXISTS "Admins view alliance events" ON public.marketing_alliance_events;
CREATE POLICY "Admins view alliance events" ON public.marketing_alliance_events
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = public.get_current_staff_user_id() AND u.role = 'Administrador' AND u.active = true));

DROP POLICY IF EXISTS "Admins view alliance attributions" ON public.marketing_alliance_attributions;
CREATE POLICY "Admins view alliance attributions" ON public.marketing_alliance_attributions
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = public.get_current_staff_user_id() AND u.role = 'Administrador' AND u.active = true));

DROP POLICY IF EXISTS "Admins view alliance benefits" ON public.marketing_alliance_benefits;
CREATE POLICY "Admins view alliance benefits" ON public.marketing_alliance_benefits
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = public.get_current_staff_user_id() AND u.role = 'Administrador' AND u.active = true));

CREATE OR REPLACE FUNCTION public.get_marketing_alliance_kpis(_start_date TIMESTAMPTZ DEFAULT NULL, _end_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (alliance_id UUID, name TEXT, type TEXT, slug TEXT, is_active BOOLEAN, views BIGINT, signups BIGINT, purchases BIGINT, revenue NUMERIC, runas_granted NUMERIC, rewards_redeemed BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ma.id, ma.name, ma.type, ma.slug, ma.is_active,
    count(*) FILTER (WHERE e.event_type = 'view') AS views,
    count(*) FILTER (WHERE e.event_type = 'signup') AS signups,
    count(*) FILTER (WHERE e.event_type = 'purchase') AS purchases,
    COALESCE(sum(e.amount) FILTER (WHERE e.event_type = 'purchase'), 0) AS revenue,
    COALESCE(sum(e.amount) FILTER (WHERE e.event_type = 'reward_granted' AND e.metadata->>'benefit_type' = 'runas'), 0) AS runas_granted,
    count(*) FILTER (WHERE e.event_type = 'reward_redeemed') AS rewards_redeemed
  FROM public.marketing_alliances ma
  LEFT JOIN public.marketing_alliance_events e ON e.alliance_id = ma.id AND (_start_date IS NULL OR e.created_at >= _start_date) AND (_end_date IS NULL OR e.created_at <= _end_date)
  WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.id = public.get_current_staff_user_id() AND u.role = 'Administrador' AND u.active = true)
  GROUP BY ma.id, ma.name, ma.type, ma.slug, ma.is_active
  ORDER BY ma.created_at DESC;
$$;