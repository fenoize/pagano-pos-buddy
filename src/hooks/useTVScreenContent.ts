import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { setStaffContext } from '@/lib/dbContext';
import { useAuth } from '@/hooks/useAuth';
import { MarketingPromotion } from './useMarketingPromotions';

export interface TVScreenContent {
  id: string;
  tv_screen_config_id: string;
  promotion_id: string;
  display_order: number;
  created_at: string;
  promotion?: MarketingPromotion;
}

// Hook para obtener el contenido asignado a una pantalla específica
export const useTVScreenContent = (screenConfigId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: content = [], isLoading, error } = useQuery({
    queryKey: ['tv-screen-content', screenConfigId],
    queryFn: async () => {
      if (!screenConfigId) return [];
      
      const { data, error } = await configuredSupabase
        .from('tv_screen_content')
        .select(`
          *,
          promotion:marketing_app_promotions(*)
        `)
        .eq('tv_screen_config_id', screenConfigId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as (TVScreenContent & { promotion: MarketingPromotion })[];
    },
    enabled: !!screenConfigId,
  });

  // Obtener todas las promociones de TV disponibles
  const { data: availablePromotions = [] } = useQuery({
    queryKey: ['available-tv-promotions'],
    queryFn: async () => {
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .select('*')
        .eq('cta_type', 'none') // Solo contenido TV
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) throw error;
      return data as MarketingPromotion[];
    },
  });

  const addContentMutation = useMutation({
    mutationFn: async ({ promotionId, order }: { promotionId: string; order?: number }) => {
      if (!screenConfigId) throw new Error('No screen config ID');
      if (user?.id) await setStaffContext(user.id);

      const { data, error } = await configuredSupabase
        .from('tv_screen_content')
        .insert([{
          tv_screen_config_id: screenConfigId,
          promotion_id: promotionId,
          display_order: order ?? content.length,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-screen-content', screenConfigId] });
      toast.success('Contenido agregado');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const removeContentMutation = useMutation({
    mutationFn: async (contentId: string) => {
      if (user?.id) await setStaffContext(user.id);

      const { error } = await configuredSupabase
        .from('tv_screen_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-screen-content', screenConfigId] });
      toast.success('Contenido eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const reorderContentMutation = useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      if (user?.id) await setStaffContext(user.id);

      for (const item of items) {
        const { error } = await configuredSupabase
          .from('tv_screen_content')
          .update({ display_order: item.display_order })
          .eq('id', item.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-screen-content', screenConfigId] });
    },
    onError: (error: Error) => {
      toast.error('Error al reordenar: ' + error.message);
    },
  });

  // Promociones de TV activas que cumplen con fechas
  const promotions = content
    .filter(c => c.promotion)
    .map(c => c.promotion!)
    .filter(p => {
      const now = new Date().toISOString().split('T')[0];
      const startOk = !p.start_date || p.start_date <= now;
      const endOk = !p.end_date || p.end_date >= now;
      return startOk && endOk && p.is_active;
    });

  return {
    content,
    promotions,
    availablePromotions,
    isLoading,
    error,
    addContent: addContentMutation.mutateAsync,
    removeContent: removeContentMutation.mutateAsync,
    reorderContent: reorderContentMutation.mutateAsync,
  };
};

// Hook para obtener contenido activo por screen ID (para uso en TV)
export const useActiveTVScreenContent = (screenConfigId?: string) => {
  return useQuery({
    queryKey: ['active-tv-screen-content', screenConfigId],
    queryFn: async () => {
      if (!screenConfigId) {
        // Si no hay screen específica, devolver todo el contenido TV activo
        const { data, error } = await configuredSupabase
          .from('marketing_app_promotions')
          .select('*')
          .eq('is_active', true)
          .eq('cta_type', 'none')
          .or(`start_date.is.null,start_date.lte.${new Date().toISOString().split('T')[0]}`)
          .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)
          .order('priority', { ascending: true });

        if (error) throw error;
        return data as MarketingPromotion[];
      }

      // Obtener contenido específico de la pantalla
      const { data, error } = await configuredSupabase
        .from('tv_screen_content')
        .select(`
          *,
          promotion:marketing_app_promotions(*)
        `)
        .eq('tv_screen_config_id', screenConfigId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Filtrar solo promociones activas y dentro de fechas
      const now = new Date().toISOString().split('T')[0];
      return (data as (TVScreenContent & { promotion: MarketingPromotion })[])
        .filter(c => c.promotion && c.promotion.is_active)
        .filter(c => {
          const p = c.promotion!;
          const startOk = !p.start_date || p.start_date <= now;
          const endOk = !p.end_date || p.end_date >= now;
          return startOk && endOk;
        })
        .map(c => c.promotion!);
    },
    staleTime: 5 * 60 * 1000,
  });
};
