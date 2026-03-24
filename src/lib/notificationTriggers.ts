import { supabase } from '@/integrations/supabase/client';
import { ORDER_STATUS_MESSAGES } from '@/types/notifications';

/**
 * Trigger notification for order status change
 * Call this after successfully updating order status in kitchen/delivery
 */
export async function triggerOrderStatusNotification(
  customerId: string | null,
  orderId: string,
  orderNumber: number,
  newStatus: string,
  fulfillment: 'pickup' | 'delivery'
): Promise<void> {
  if (!customerId) {
    console.log('No customer ID, skipping order status notification');
    return;
  }

  const messageConfig = ORDER_STATUS_MESSAGES[newStatus];
  if (!messageConfig) {
    console.log('No message config for status:', newStatus);
    return;
  }

  let body = messageConfig.body(orderNumber);
  
  // Customize message based on fulfillment type
  if (newStatus === 'Listo') {
    body = fulfillment === 'pickup' 
      ? `La orden #${orderNumber} está lista para retirar en tienda. ¡Te esperamos!`
      : `La orden #${orderNumber} está lista y será despachada pronto.`;
  } else if (newStatus === 'En camino') {
    body = `La orden #${orderNumber} está en camino a tu ubicación.`;
  } else if (newStatus === 'Entregado') {
    body = fulfillment === 'pickup'
      ? `La orden #${orderNumber} fue entregada. ¡Buen provecho!`
      : `La orden #${orderNumber} ha sido entregada en tu dirección. ¡Buen provecho!`;
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        customer_id: customerId,
        type: 'order_status',
        title: messageConfig.title,
        body,
        payload: { order_id: orderId, order_number: orderNumber, status: newStatus }
      }
    });

    if (error) {
      console.error('Error sending order status notification:', error);
    } else {
      console.log('Order status notification sent:', data);
    }
  } catch (error) {
    console.error('Error triggering order status notification:', error);
  }
}

/**
 * Trigger notification for delivery assignment
 * Call this when a delivery person is assigned to an order
 */
export async function triggerDeliveryAssignedNotification(
  customerId: string | null,
  orderId: string,
  orderNumber: number,
  deliveryPersonName: string
): Promise<void> {
  if (!customerId) {
    console.log('No customer ID, skipping delivery assigned notification');
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        customer_id: customerId,
        type: 'delivery_assigned',
        title: '¡Repartidor asignado! 🛵',
        body: `${deliveryPersonName} llevará tu orden #${orderNumber}.`,
        payload: { order_id: orderId, order_number: orderNumber, delivery_person: deliveryPersonName }
      }
    });

    if (error) {
      console.error('Error sending delivery assigned notification:', error);
    } else {
      console.log('Delivery assigned notification sent:', data);
    }
  } catch (error) {
    console.error('Error triggering delivery assigned notification:', error);
  }
}

/**
 * Trigger notification for new order assigned to rider
 * Call this when a rider gets a new order
 */
export async function triggerRiderNewOrderNotification(
  riderUserId: string,
  orderId: string,
  orderNumber: number,
  deliveryAddress: string
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: riderUserId,
        type: 'rider_new_order',
        title: '¡Nuevo pedido asignado! 📦',
        body: `Orden #${orderNumber} - ${deliveryAddress}`,
        payload: { order_id: orderId, order_number: orderNumber, address: deliveryAddress }
      }
    });

    if (error) {
      console.error('Error sending rider notification:', error);
    } else {
      console.log('Rider notification sent:', data);
    }
  } catch (error) {
    console.error('Error triggering rider notification:', error);
  }
}

/**
 * Trigger notification for runas earned
 * Call this after successfully crediting runas to a customer
 */
/**
 * Trigger notification when delivery rider is near destination (500m)
 */
export async function triggerDeliveryNearNotification(
  customerId: string,
  orderId: string,
  orderNumber: number
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        customer_id: customerId,
        type: 'delivery_near',
        title: '¡Tu pedido está muy cerca! 📍',
        body: `Prepárate, tu repartidor llegará en minutos. Orden #${orderNumber}`,
        payload: { order_id: orderId, order_number: orderNumber }
      }
    });

    if (error) {
      console.error('Error sending delivery near notification:', error);
    } else {
      console.log('Delivery near notification sent:', data);
    }
  } catch (error) {
    console.error('Error triggering delivery near notification:', error);
  }
}

/**
 * Trigger notification for runas earned
 * Call this after successfully crediting runas to a customer
 */
export async function triggerRunasEarnedNotification(
  customerId: string,
  runasAmount: number
): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        customer_id: customerId,
        type: 'runas_earned',
        title: '¡Ganaste Runas! ✨',
        body: `Sumaste ${runasAmount} Runas en tu compra. ¡Revisa tus beneficios en la app!`,
        payload: { runas_amount: runasAmount }
      }
    });

    if (error) {
      console.error('Error sending runas earned notification:', error);
    } else {
      console.log('Runas earned notification sent:', data);
    }
  } catch (error) {
    console.error('Error triggering runas earned notification:', error);
  }
}
