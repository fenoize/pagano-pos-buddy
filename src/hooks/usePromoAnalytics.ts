import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'promo_session_id';
const LAST_PROMO_CLICK_KEY = 'last_promo_click';
const CLICK_EXPIRY_HOURS = 24;

// Get or create a session ID for this browser
const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

// Track promo view
export const trackPromoView = async (promoId: string, customerId?: string) => {
  try {
    const sessionId = getSessionId();
    await supabase
      .from('marketing_promo_analytics' as any)
      .insert({
        promo_id: promoId,
        event_type: 'view',
        customer_id: customerId || null,
        session_id: sessionId,
        metadata: { timestamp: new Date().toISOString() }
      });
  } catch (error) {
    console.error('Error tracking promo view:', error);
  }
};

// Track promo click
export const trackPromoClick = async (promoId: string, ctaType: string, customerId?: string) => {
  try {
    const sessionId = getSessionId();
    await supabase
      .from('marketing_promo_analytics' as any)
      .insert({
        promo_id: promoId,
        event_type: 'click',
        customer_id: customerId || null,
        session_id: sessionId,
        metadata: { 
          timestamp: new Date().toISOString(),
          cta_type: ctaType 
        }
      });

    // Store last clicked promo for conversion attribution
    localStorage.setItem(LAST_PROMO_CLICK_KEY, JSON.stringify({
      promoId,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error tracking promo click:', error);
  }
};

// Track conversion (order completed)
export const trackPromoConversion = async (orderId: string, customerId?: string) => {
  try {
    // Get last clicked promo within expiry window
    const lastClickData = localStorage.getItem(LAST_PROMO_CLICK_KEY);
    if (!lastClickData) return;

    const { promoId, timestamp } = JSON.parse(lastClickData);
    const clickTime = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const hoursPassed = (now - clickTime) / (1000 * 60 * 60);

    // Only attribute if click was within expiry window
    if (hoursPassed > CLICK_EXPIRY_HOURS) {
      localStorage.removeItem(LAST_PROMO_CLICK_KEY);
      return;
    }

    const sessionId = getSessionId();
    await supabase
      .from('marketing_promo_analytics' as any)
      .insert({
        promo_id: promoId,
        event_type: 'conversion',
        customer_id: customerId || null,
        session_id: sessionId,
        order_id: orderId,
        metadata: { 
          timestamp: new Date().toISOString(),
          hours_since_click: hoursPassed.toFixed(2)
        }
      });

    // Clear after successful conversion tracking
    localStorage.removeItem(LAST_PROMO_CLICK_KEY);
  } catch (error) {
    console.error('Error tracking promo conversion:', error);
  }
};

// Get last clicked promo (for debugging)
export const getLastClickedPromo = () => {
  const lastClickData = localStorage.getItem(LAST_PROMO_CLICK_KEY);
  return lastClickData ? JSON.parse(lastClickData) : null;
};
