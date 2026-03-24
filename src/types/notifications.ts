// Notification Preferences for customers
export interface NotificationPreferences {
  id: string;
  customer_id: string;
  marketing_push_enabled: boolean;
  order_push_enabled: boolean;
  delivery_push_enabled: boolean;
  runas_push_enabled: boolean;
  onesignal_subscribed: boolean;
  permission_prompted_at: string | null;
  created_at: string;
  updated_at: string;
}

// Notification Event (log entry)
export interface NotificationEvent {
  id: string;
  customer_id?: string;
  user_id?: string;
  type: 'order_status' | 'delivery_assigned' | 'runas_earned' | 'marketing' | 'rider_new_order' | 'delivery_near';
  title: string;
  body: string;
  payload: Record<string, any>;
  channel: string;
  status: 'pending' | 'sent' | 'error' | 'skipped';
  error_message?: string;
  created_at: string;
  sent_at?: string;
}

// Marketing Push Campaign
export interface MarketingPushCampaign {
  id: string;
  title: string;
  message: string;
  segment: string;
  send_type: 'now' | 'scheduled';
  scheduled_at?: string;
  status: 'draft' | 'sending' | 'sent' | 'scheduled' | 'error';
  recipients_count: number;
  sent_count: number;
  error_count: number;
  created_at: string;
  sent_at?: string;
  created_by?: string;
}

// OneSignal Settings
export interface OneSignalSettings {
  app_id: string;
  web_site_name: string;
  enabled: boolean;
}

// Global Notification Settings
export interface GlobalNotificationSettings {
  notify_client_order_status: boolean;
  notify_client_delivery_assigned: boolean;
  notify_client_runas_earned: boolean;
  notify_rider_new_order: boolean;
}

// Notification Messages by Order Status
export const ORDER_STATUS_MESSAGES: Record<string, { title: string; body: (orderNumber: number) => string }> = {
  'En preparación': {
    title: 'Tu pedido está en preparación 🔥',
    body: (orderNumber) => `La orden #${orderNumber} se está preparando en la cocina del Clan Paganos.`
  },
  'Listo': {
    title: '¡Tu pedido está listo! ✅',
    body: (orderNumber) => `La orden #${orderNumber} está lista. ${''}`
  },
  'En camino': {
    title: 'Tu pedido va en camino 🛵',
    body: (orderNumber) => `La orden #${orderNumber} está en camino a tu ubicación.`
  },
  'Entregado': {
    title: '¡Pedido entregado! 🍔',
    body: (orderNumber) => `La orden #${orderNumber} ha sido entregada. ¡Buen provecho!`
  }
};
