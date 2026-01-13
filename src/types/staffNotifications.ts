// Staff notification types for in-app and push notifications

export type StaffNotificationType = 
  | 'cash_session_open'
  | 'cash_session_close'
  | 'cash_movement'
  | 'order_assigned'
  | 'order_delivered';

export interface StaffNotification {
  id: string;
  user_id: string | null;
  role_target: string | null;
  type: StaffNotificationType;
  title: string;
  body: string;
  payload: Record<string, any>;
  read_at: string | null;
  created_at: string;
}

export interface StaffNotificationInsert {
  user_id?: string | null;
  role_target?: string | null;
  type: StaffNotificationType;
  title: string;
  body: string;
  payload?: Record<string, any>;
}

// Notification type metadata for UI
export const NOTIFICATION_TYPE_CONFIG: Record<StaffNotificationType, {
  icon: string;
  color: string;
  category: string;
}> = {
  cash_session_open: {
    icon: 'Unlock',
    color: 'text-green-600',
    category: 'Turno'
  },
  cash_session_close: {
    icon: 'Lock',
    color: 'text-amber-600',
    category: 'Turno'
  },
  cash_movement: {
    icon: 'DollarSign',
    color: 'text-blue-600',
    category: 'Caja'
  },
  order_assigned: {
    icon: 'Truck',
    color: 'text-primary',
    category: 'Pedido'
  },
  order_delivered: {
    icon: 'CheckCircle',
    color: 'text-green-600',
    category: 'Pedido'
  }
};
