import { useQuery } from '@tanstack/react-query';
import { getConfiguredSupabase } from '@/lib/supabaseClient';

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
      console.log('[useAllProducts] Fetching products...');
      const supabase = getConfiguredSupabase();
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('[useAllProducts] Error fetching products:', error);
        throw error;
      }
      
      console.log('[useAllProducts] Products fetched:', data?.length || 0);
      return data as Product[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
