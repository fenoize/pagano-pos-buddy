import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCustomerLevel = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['customer-level', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      const { data, error } = await supabase
        .from('customer_levels')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
};
