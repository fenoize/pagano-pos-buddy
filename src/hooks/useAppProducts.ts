import { useQuery } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';

export interface AppProduct {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  active: boolean;
  show_in_app: boolean;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
  }[];
}

/**
 * Hook para obtener productos visibles en la app cliente
 */
export function useAppProducts() {
  return useQuery({
    queryKey: ['app-products'],
    queryFn: async () => {
      const { data, error } = await configuredSupabase
        .from('products')
        .select('*, categories(*)')
        .eq('active', true)
        .eq('show_in_app', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as unknown as AppProduct[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
