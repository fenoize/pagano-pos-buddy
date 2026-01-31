import { getStaffSupabaseClient } from '@/lib/supabaseClient';
import { StaffNotificationInsert, StaffNotificationType } from '@/types/staffNotifications';
import { formatCurrency } from '@/lib/utils';

/**
 * Create a staff notification (in-app + push)
 * Uses staff client with x-staff-token header for RLS compliance
 */
export async function createStaffNotification(
  actorUserId: string,
  notification: StaffNotificationInsert
): Promise<void> {
  try {
    // Use staff client which sends x-staff-token header
    const staff = getStaffSupabaseClient();

    // Insert notification in database (for in-app)
    const { error: insertError } = await staff
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

    // Send push notification via edge function (best-effort)
    const { error: pushError } = await staff.functions.invoke('send-staff-push', {
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
  actorUserId: string,
  userName: string,
  openingCash: number,
  sessionId: string
): Promise<void> {
  await createStaffNotification(actorUserId, {
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
  actorUserId: string,
  userName: string,
  closingCash: number,
  totalSales: number,
  sessionId: string,
  orderCount?: number
): Promise<void> {
  const orderCountText = orderCount !== undefined ? ` | ${orderCount} pedidos` : '';
  await createStaffNotification(actorUserId, {
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
  actorUserId: string,
  userName: string,
  type: 'ingreso' | 'egreso',
  amount: number,
  note?: string
): Promise<void> {
  const isIngreso = type === 'ingreso';
  await createStaffNotification(actorUserId, {
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
  actorUserId: string,
  deliveryPersonId: string,
  orderNumber: number,
  deliveryAddress: string,
  orderId: string
): Promise<void> {
  await createStaffNotification(actorUserId, {
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
  actorUserId: string,
  cashierUserId: string,
  orderNumber: number,
  deliveryPersonName: string,
  orderId: string
): Promise<void> {
  await createStaffNotification(actorUserId, {
    user_id: cashierUserId,
    type: 'order_delivered',
    title: 'Pedido Entregado ✅',
    body: `Orden #${orderNumber} entregada por ${deliveryPersonName}`,
    payload: { order_id: orderId, order_number: orderNumber, delivery_person: deliveryPersonName }
  });
}

// ==================== SHIFT NOTIFICATION TRIGGERS ====================

/**
 * Trigger notification when a shift is assigned to an employee
 */
export async function triggerShiftAssignedNotification(
  actorUserId: string,
  employeeUserId: string,
  shiftDate: string,
  scheduleName: string | null,
  shiftId: string
): Promise<void> {
  const scheduleText = scheduleName ? ` (${scheduleName})` : '';
  await createStaffNotification(actorUserId, {
    user_id: employeeUserId,
    type: 'shift_assigned',
    title: 'Nuevo Turno Asignado 📅',
    body: `Te asignaron un turno el ${shiftDate}${scheduleText}. Revisa tu calendario.`,
    payload: { shift_id: shiftId, shift_date: shiftDate, schedule_name: scheduleName }
  });
}

/**
 * Trigger notification when an employee accepts a shift (to admins)
 */
export async function triggerShiftAcceptedNotification(
  actorUserId: string,
  employeeName: string,
  shiftDate: string,
  shiftId: string
): Promise<void> {
  await createStaffNotification(actorUserId, {
    role_target: 'Administrador',
    type: 'shift_accepted',
    title: 'Turno Aceptado ✅',
    body: `${employeeName} aceptó el turno del ${shiftDate}`,
    payload: { shift_id: shiftId, shift_date: shiftDate, employee_name: employeeName }
  });
}

/**
 * Trigger notification when an employee rejects a shift (to admins)
 */
export async function triggerShiftRejectedNotification(
  actorUserId: string,
  employeeName: string,
  shiftDate: string,
  rejectReason: string | null,
  shiftId: string
): Promise<void> {
  const reasonText = rejectReason ? ` - Motivo: ${rejectReason}` : '';
  await createStaffNotification(actorUserId, {
    role_target: 'Administrador',
    type: 'shift_rejected',
    title: 'Turno Rechazado ❌',
    body: `${employeeName} rechazó el turno del ${shiftDate}${reasonText}`,
    payload: { shift_id: shiftId, shift_date: shiftDate, employee_name: employeeName, reason: rejectReason }
  });
}
