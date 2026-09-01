import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LevelBenefit {
  found: boolean;
  coupon_id?: string;
  coupon_code?: string;
  coupon_type?: string;
  coupon_amount?: number;
  coupon_description?: string;
  affects_products?: boolean;
  affects_delivery?: boolean;
  label?: string;
  level_code?: string;
  level_name?: string;
  level_icon?: string;
  level_color?: string;
}

export function useLevelBenefit(customerId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['level-benefit', customerId],
    enabled: Boolean(customerId),
    staleTime: 60_000,
    queryFn: async (): Promise<LevelBenefit | null> => {
      const { data, error } = await supabase.rpc('get_level_benefit_coupon' as any, {
        p_customer_id: customerId,
      });
      if (error) throw error;
      const result = data as unknown as LevelBenefit | null;
      if (!result || !result.found) return null;
      return result;
    },
  });

  return { data: query.data ?? null, isLoading: query.isLoading, refetch: query.refetch };
}
