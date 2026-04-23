import { supabase } from '@/integrations/supabase/client';

const ALLIANCE_SLUG_KEY = 'paganos_alliance_slug';
const ALLIANCE_SESSION_KEY = 'paganos_alliance_session_id';

export const getAllianceSessionId = () => {
  let sessionId = localStorage.getItem(ALLIANCE_SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(ALLIANCE_SESSION_KEY, sessionId);
  }
  return sessionId;
};

export const saveAllianceAttribution = (slug: string) => {
  localStorage.setItem(ALLIANCE_SLUG_KEY, slug);
  getAllianceSessionId();
};

export const getAllianceAttribution = () => ({
  slug: localStorage.getItem(ALLIANCE_SLUG_KEY),
  sessionId: getAllianceSessionId(),
});

export const clearAllianceAttribution = () => {
  localStorage.removeItem(ALLIANCE_SLUG_KEY);
};

export const claimAllianceSignup = async (customerId: string) => {
  const { slug, sessionId } = getAllianceAttribution();
  if (!slug || !customerId) return false;

  const { data, error } = await supabase.rpc('claim_marketing_alliance_signup' as any, {
    _slug: slug,
    _session_id: sessionId,
    _customer_id: customerId,
  });

  if (error) {
    console.error('Error claiming alliance signup:', error);
    return false;
  }

  return Boolean(data);
};

export const trackAlliancePurchase = async (customerId: string, orderId: string, amount: number, metadata: Record<string, unknown> = {}) => {
  if (!customerId || !orderId) return false;

  const { data, error } = await supabase.rpc('track_marketing_alliance_purchase' as any, {
    _customer_id: customerId,
    _order_id: orderId,
    _amount: amount,
    _metadata: metadata,
  });

  if (error) {
    console.error('Error tracking alliance purchase:', error);
    return false;
  }

  return Boolean(data);
};

export interface AllianceFreeDeliveryBenefit {
  benefitId: string;
  freeFirstOrder: boolean;
  addresses: string[];
}

export const normalizeAllianceAddress = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();

export const getPendingAllianceFreeDeliveryBenefit = async (customerId: string): Promise<AllianceFreeDeliveryBenefit | null> => {
  if (!customerId) return null;

  const { data, error } = await (supabase as any)
    .from('marketing_alliance_benefits')
    .select('id, metadata')
    .eq('customer_id', customerId)
    .eq('benefit_type', 'free_delivery')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const metadata = (data.metadata || {}) as { free_delivery_first_order?: boolean; addresses?: unknown };
  return {
    benefitId: data.id,
    freeFirstOrder: Boolean(metadata.free_delivery_first_order),
    addresses: Array.isArray(metadata.addresses) ? metadata.addresses.filter((address): address is string => typeof address === 'string') : [],
  };
};
