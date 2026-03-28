import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import { toast } from 'sonner';

export interface LoyaltyCampaign {
  id: string;
  title: string;
  description: string | null;
  campaign_type: 'registration' | 'product_purchase' | 'accumulated_spend' | 'first_purchase';
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  reward_runas: number;
  conditions: Record<string, any>;
  max_claims: number | null;
  one_per_customer: boolean;
  created_at: string;
}

export interface CampaignClaim {
  id: string;
  campaign_id: string;
  customer_id: string;
  claimed_at: string;
  order_id: string | null;
}

function getStaffId() {
  const id = getStaffUserId();
  if (!id || id === '') throw new Error('No staff context');
  return id;
}

export function useLoyaltyCampaigns() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['loyalty-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LoyaltyCampaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Omit<LoyaltyCampaign, 'id' | 'created_at'>) => {
      const userId = getStaffId();
      let result: any;
      await withStaffContext(userId, async () => {
        const { data, error } = await supabase.rpc('manage_loyalty_campaign', {
          p_action: 'insert',
          p_campaign_data: campaign as any,
        });
        if (error) throw error;
        result = data;
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-campaigns'] });
      toast.success('Campaña creada exitosamente');
    },
    onError: (err: any) => {
      toast.error('Error al crear campaña', { description: err.message });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LoyaltyCampaign> & { id: string }) => {
      const userId = getStaffId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase.rpc('manage_loyalty_campaign', {
          p_action: 'update',
          p_campaign_data: updates as any,
          p_campaign_id: id,
        });
        if (error) throw error;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-campaigns'] });
      toast.success('Campaña actualizada');
    },
    onError: (err: any) => {
      toast.error('Error al actualizar campaña', { description: err.message });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const userId = getStaffId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase.rpc('manage_loyalty_campaign', {
          p_action: 'toggle',
          p_campaign_data: { is_active } as any,
          p_campaign_id: id,
        });
        if (error) throw error;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-campaigns'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const userId = getStaffId();
      await withStaffContext(userId, async () => {
        const { error } = await supabase.rpc('manage_loyalty_campaign', {
          p_action: 'delete',
          p_campaign_id: id,
        });
        if (error) throw error;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-campaigns'] });
      toast.success('Campaña eliminada');
    },
    onError: (err: any) => {
      toast.error('Error al eliminar', { description: err.message });
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    toggleActive,
    deleteCampaign,
  };
}

export function useCampaignClaims(campaignId: string | null) {
  return useQuery({
    queryKey: ['campaign-claims', campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_campaign_claims')
        .select('*, customers(name, email, phone)')
        .eq('campaign_id', campaignId!)
        .order('claimed_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
