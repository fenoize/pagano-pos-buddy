import { supabase } from '@/integrations/supabase/client';
import { StaffNotificationInsert, StaffNotificationType } from '@/types/staffNotifications';
import { formatCurrency } from '@/lib/utils';

/**
 * Create a staff notification (in-app + push)
 * For role-targeted notifications, set role_target
 * For user-specific notifications, set user_id
 */
export async function createStaffNotification(
  notification: StaffNotificationInsert
): Promise<void> {
  try {
    // Insert notification in database (for in-app)
    const { error: insertError } = await supabase
      .from('staff_notifications')
      .insert({
        user_id: notification.user_id || null,
        role_target: notification.role_target || null,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        payload: notification.payload || {}
      });

    if (insertError) {
      console.error('Error inserting staff notification:', insertError);
    }

    // Send push notification via edge function
    const { error: pushError } = await supabase.functions.invoke('send-staff-push', {
      body: {
        user_id: notification.user_id,
        role_target: notification.role_target,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        payload: notification.payload
      }
    });

    if (pushError) {
      console.error('Error sending staff push notification:', pushError);
    }
  } catch (error) {
    console.error('Error creating staff notification:', error);
  }
}

// ==================== TRIGGER FUNCTIONS ====================

/**
 * Trigger notification for cash session open
 */
export async function triggerCashSessionOpenNotification(
  userName: string,
  openingCash: number,
  sessionId: string
): Promise<void> {
  await createStaffNotification({
    role_target: 'Administrador',
    type: 'cash_session_open',
    title: 'Turno Abierto 🔓',
    body: `${userName} abrió turno con ${formatCurrency(openingCash)}`,
    payload: { session_id: sessionId, user_name: userName, opening_cash: openingCash }
  });
}

/**
 * Trigger notification for cash session close
 */
export async function triggerCashSessionCloseNotification(
  userName: string,
  closingCash: number,
  totalSales: number,
  sessionId: string,
  orderCount?: number
): Promise<void> {
  const orderCountText = orderCount !== undefined ? ` | ${orderCount} pedidos` : '';
  await createStaffNotification({
    role_target: 'Administrador',
    type: 'cash_session_close',
    title: 'Turno Cerrado 🔒',
    body: `${userName} cerró turno. Efectivo: ${formatCurrency(closingCash)} | Ventas: ${formatCurrency(totalSales)}${orderCountText}`,
    payload: { session_id: sessionId, user_name: userName, closing_cash: closingCash, total_sales: totalSales, order_count: orderCount }
  });
}

/**
 * Trigger notification for cash movement (ingreso/egreso)
 */
export async function triggerCashMovementNotification(
  userName: string,
  type: 'ingreso' | 'egreso',
  amount: number,
  note?: string
): Promise<void> {
  const isIngreso = type === 'ingreso';
  await createStaffNotification({
    role_target: 'Administrador',
    type: 'cash_movement',
    title: isIngreso ? 'Ingreso en Caja 💵' : 'Egreso de Caja 💸',
    body: `${userName}: ${isIngreso ? '+' : '-'}${formatCurrency(amount)}${note ? ` - ${note}` : ''}`,
    payload: { type, amount, note, user_name: userName }
  });
}

/**
 * Trigger notification for order assigned to delivery person
 */
export async function triggerOrderAssignedNotification(
  deliveryPersonId: string,
  orderNumber: number,
  deliveryAddress: string,
  orderId: string
): Promise<void> {
  await createStaffNotification({
    user_id: deliveryPersonId,
    type: 'order_assigned',
    title: 'Nuevo Pedido Asignado 📦',
    body: `Orden #${orderNumber} - ${deliveryAddress}`,
    payload: { order_id: orderId, order_number: orderNumber, address: deliveryAddress }
  });
}

/**
 * Trigger notification for order delivered (to cashier)
 */
export async function triggerOrderDeliveredNotification(
  cashierUserId: string,
  orderNumber: number,
  deliveryPersonName: string,
  orderId: string
): Promise<void> {
  await createStaffNotification({
    user_id: cashierUserId,
    type: 'order_delivered',
    title: 'Pedido Entregado ✅',
    body: `Orden #${orderNumber} entregada por ${deliveryPersonName}`,
    payload: { order_id: orderId, order_number: orderNumber, delivery_person: deliveryPersonName }
  });
}
