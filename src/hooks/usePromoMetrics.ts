import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PromoMetric {
  promo_id: string;
  promo_title: string;
  total_views: number;
  total_clicks: number;
  total_conversions: number;
  click_rate: number;
  conversion_rate: number;
  unique_viewers: number;
  unique_clickers: number;
}

export const usePromoMetrics = () => {
  return useQuery({
    queryKey: ['promo-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_promo_metrics' as any)
        .select('*')
        .order('total_views', { ascending: false });

      if (error) throw error;
      return (data || []) as any as PromoMetric[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
