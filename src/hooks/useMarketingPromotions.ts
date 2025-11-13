import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { setStaffContext } from '@/lib/dbContext';
import { useAuth } from '@/hooks/useAuth';

export interface MarketingPromotion {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cta_label: string | null;
  cta_type: 'open_menu' | 'open_cart' | 'open_orders' | 'open_benefits' | 'open_product' | 'open_custom_url' | 'none';
  cta_url: string | null;
  product_id?: string | null;
  image_url: string | null;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MarketingPromotionInput = Omit<MarketingPromotion, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

export const useMarketingPromotions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: promotions = [], isLoading, error } = useQuery({
    queryKey: ['marketing-promotions'],
    queryFn: async () => {
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketingPromotion[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (promo: MarketingPromotionInput) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      // Establecer contexto de staff antes de la operación
      await setStaffContext(user.id);
      
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .insert([promo])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-promotions'] });
      toast.success('Promoción creada correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al crear promoción: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...promo }: Partial<MarketingPromotion> & { id: string }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      // Establecer contexto de staff antes de la operación
      await setStaffContext(user.id);
      
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .update({ ...promo, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-promotions'] });
      toast.success('Promoción actualizada correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al actualizar promoción: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      // Establecer contexto de staff antes de la operación
      await setStaffContext(user.id);
      
      const { error } = await configuredSupabase
        .from('marketing_app_promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-promotions'] });
      toast.success('Promoción eliminada correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al eliminar promoción: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!user?.id) throw new Error('Usuario no autenticado');
      
      // Establecer contexto de staff antes de la operación
      await setStaffContext(user.id);
      
      const { error } = await configuredSupabase
        .from('marketing_app_promotions')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-promotions'] });
      toast.success('Estado actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error('Error al cambiar estado: ' + error.message);
    },
  });

  return {
    promotions,
    isLoading,
    error,
    createPromotion: createMutation.mutateAsync,
    updatePromotion: updateMutation.mutateAsync,
    deletePromotion: deleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
  };
};

// Hook para obtener todas las promociones activas (para app cliente - slider)
export const useActivePromotions = () => {
  return useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const { data, error } = await configuredSupabase
        .from('marketing_app_promotions')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${new Date().toISOString().split('T')[0]}`)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as MarketingPromotion[]) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};
