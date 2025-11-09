import { useQuery } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';

export interface Product {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  active: boolean;
  show_in_app: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para obtener TODOS los productos activos (para uso en POS)
 */
export function useAllProducts() {
  return useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const { data, error } = await configuredSupabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
