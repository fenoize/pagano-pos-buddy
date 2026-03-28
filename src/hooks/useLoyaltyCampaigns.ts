import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      const { data, error } = await supabase
        .from('loyalty_campaigns')
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('loyalty_campaigns')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
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
      const { error } = await supabase
        .from('loyalty_campaigns')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-campaigns'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('loyalty_campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
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
