
DROP POLICY "Staff can manage campaigns" ON public.loyalty_campaigns;
DROP POLICY "Staff can read campaigns" ON public.loyalty_campaigns;
DROP POLICY "Staff can read claims" ON public.loyalty_campaign_claims;
DROP POLICY "Claims insert via rpc" ON public.loyalty_campaign_claims;

CREATE POLICY "Anyone can read campaigns"
  ON public.loyalty_campaigns FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert campaigns"
  ON public.loyalty_campaigns FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update campaigns"
  ON public.loyalty_campaigns FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete campaigns"
  ON public.loyalty_campaigns FOR DELETE
  USING (true);

CREATE POLICY "Anyone can read claims"
  ON public.loyalty_campaign_claims FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert claims"
  ON public.loyalty_campaign_claims FOR INSERT
  WITH CHECK (true);
