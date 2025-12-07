import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MarketingPushCampaign } from '@/types/notifications';

export function useMarketingPushCampaigns() {
  const [campaigns, setCampaigns] = useState<MarketingPushCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_push_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data as MarketingPushCampaign[]) || []);
    } catch (error) {
      console.error('Error fetching push campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (campaign: Pick<MarketingPushCampaign, 'title' | 'message' | 'segment' | 'send_type' | 'scheduled_at'>) => {
    try {
      const { data, error } = await supabase
        .from('marketing_push_campaigns')
        .insert({
          title: campaign.title,
          message: campaign.message,
          segment: campaign.segment,
          send_type: campaign.send_type,
          scheduled_at: campaign.scheduled_at || null,
          status: campaign.send_type === 'now' ? 'sending' : 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      const newCampaign = data as MarketingPushCampaign;
      
      // If send_type is 'now', immediately send
      if (campaign.send_type === 'now') {
        await sendCampaignNow(newCampaign.id, campaign.title, campaign.message);
      }

      await fetchCampaigns();
      toast.success(campaign.send_type === 'now' ? 'Campaña enviada' : 'Campaña programada');
      return newCampaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Error al crear campaña');
      throw error;
    }
  };

  const sendCampaignNow = async (campaignId: string, title: string, message: string) => {
    try {
      setSending(campaignId);
      
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          action: 'bulk',
          type: 'marketing',
          title,
          body: message,
          campaign_id: campaignId
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Notificación enviada a ${data.sent_count} clientes`);
      } else {
        toast.error(data?.error || 'Error al enviar notificación');
      }

      await fetchCampaigns();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Error al enviar campaña');
    } finally {
      setSending(null);
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketing_push_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success('Campaña eliminada');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Error al eliminar campaña');
    }
  };

  return {
    campaigns,
    loading,
    sending,
    createCampaign,
    deleteCampaign,
    sendCampaignNow,
    refetch: fetchCampaigns
  };
}
