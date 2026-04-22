import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';
import { setStaffContext } from '@/lib/dbContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AllianceType = 'empresa_aliada' | 'embajador' | 'convenio' | 'otro';

export interface MarketingAlliance {
  id: string;
  name: string;
  type: AllianceType;
  slug: string;
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  welcome_runas: number;
  coupon_id: string | null;
  free_delivery_first_order: boolean;
  usage_limit: number | null;
  once_per_customer: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MarketingAllianceInput = Omit<MarketingAlliance, 'id' | 'created_at' | 'updated_at'>;

export interface AllianceKpi {
  alliance_id: string;
  name: string;
  type: AllianceType;
  slug: string;
  is_active: boolean;
  views: number;
  signups: number;
  purchases: number;
  revenue: number;
  runas_granted: number;
  rewards_redeemed: number;
}

export const useMarketingAlliances = (range?: { start?: string | null; end?: string | null }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const withContext = async () => {
    if (!user?.id) throw new Error('Usuario no autenticado');
    await setStaffContext(user.id);
  };

  const alliancesQuery = useQuery({
    queryKey: ['marketing-alliances'],
    queryFn: async () => {
      await withContext();
      const { data, error } = await (configuredSupabase as any)
        .from('marketing_alliances')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as MarketingAlliance[];
    },
  });

  const kpisQuery = useQuery({
    queryKey: ['marketing-alliance-kpis', range?.start, range?.end],
    queryFn: async () => {
      await withContext();
      const { data, error } = await configuredSupabase.rpc('get_marketing_alliance_kpis' as any, {
        _start_date: range?.start || null,
        _end_date: range?.end || null,
      });
      if (error) throw error;
      return ((data || []) as unknown) as AllianceKpi[];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ['marketing-alliance-events'],
    queryFn: async () => {
      await withContext();
      const { data, error } = await configuredSupabase
        .from('marketing_alliance_events' as any)
        .select('*, marketing_alliances(name, slug), customers(name, email), orders(order_number, total)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const createAlliance = useMutation({
    mutationFn: async (alliance: MarketingAllianceInput) => {
      await withContext();
      const { data, error } = await configuredSupabase
        .from('marketing_alliances' as any)
        .insert([alliance])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-alliances'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-alliance-kpis'] });
      toast.success('Alianza creada correctamente');
    },
    onError: (error: any) => toast.error('Error al crear alianza: ' + error.message),
  });

  const updateAlliance = useMutation({
    mutationFn: async ({ id, ...alliance }: Partial<MarketingAlliance> & { id: string }) => {
      await withContext();
      const { data, error } = await configuredSupabase
        .from('marketing_alliances' as any)
        .update(alliance)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-alliances'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-alliance-kpis'] });
      toast.success('Alianza actualizada correctamente');
    },
    onError: (error: any) => toast.error('Error al actualizar alianza: ' + error.message),
  });

  const deleteAlliance = useMutation({
    mutationFn: async (id: string) => {
      await withContext();
      const { error } = await configuredSupabase.from('marketing_alliances' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-alliances'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-alliance-kpis'] });
      toast.success('Alianza eliminada correctamente');
    },
    onError: (error: any) => toast.error('Error al eliminar alianza: ' + error.message),
  });

  return {
    alliances: alliancesQuery.data || [],
    kpis: kpisQuery.data || [],
    events: eventsQuery.data || [],
    isLoading: alliancesQuery.isLoading || kpisQuery.isLoading,
    createAlliance: createAlliance.mutateAsync,
    updateAlliance: updateAlliance.mutateAsync,
    deleteAlliance: deleteAlliance.mutateAsync,
  };
};
