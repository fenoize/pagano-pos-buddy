import { supabase } from '@/integrations/supabase/client';

interface CampaignResult {
  campaign_id: string;
  title: string;
  runas: number;
}

/**
 * Evalúa campañas activas después de confirmar un pedido
 */
export async function evaluateCampaignsForOrder(
  customerId: string,
  orderId: string
): Promise<CampaignResult[]> {
  try {
    const { data, error } = await supabase.rpc('evaluate_campaigns_for_order', {
      p_customer_id: customerId,
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error evaluating campaigns for order:', error);
      return [];
    }

    return (data as CampaignResult[]) || [];
  } catch (err) {
    console.error('Error evaluating campaigns:', err);
    return [];
  }
}

/**
 * Evalúa campañas de tipo "registro" al crear una cuenta nueva
 */
export async function evaluateRegistrationCampaigns(
  customerId: string
): Promise<CampaignResult[]> {
  try {
    const { data, error } = await supabase.rpc('evaluate_registration_campaigns', {
      p_customer_id: customerId,
    });

    if (error) {
      console.error('Error evaluating registration campaigns:', error);
      return [];
    }

    return (data as CampaignResult[]) || [];
  } catch (err) {
    console.error('Error evaluating registration campaigns:', err);
    return [];
  }
}
