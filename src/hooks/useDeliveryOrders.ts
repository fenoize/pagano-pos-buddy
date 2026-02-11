import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order, OrderStatus } from '@/types';
import { useAuth } from './useAuth';
import { useDeliverySettings } from './useDeliverySettings';
import { triggerOrderStatusNotification, triggerDeliveryAssignedNotification } from '@/lib/notificationTriggers';
import { triggerOrderAssignedNotification, triggerOrderDeliveredNotification } from '@/lib/staffNotificationTriggers';

export interface DeliveryOrder extends Omit<Order, 'customer'> {
  customer_name?: string;
  customer_phone?: string;
  minutes_since_created?: number;
  customer?: { name?: string; phone?: string };
  delivery_payment_amount?: number;
  user_id?: string; // Cajero que creó el pedido
}

export const useDeliveryOrders = () => {
  const { user } = useAuth();
  const { settings } = useDeliverySettings();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!user || !settings) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .eq('fulfillment', 'delivery')
        .in('status', ['En preparación', 'Listo', 'En camino'])
        .order('created_at', { ascending: true });

      // Filtrar según modo de asignación
      if (settings.assignment_mode === 'assigned') {
        // Solo pedidos asignados al repartidor actual
        query = query.eq('delivery_person_id', user.id);
      } else {
        // Modo pool: mostrar pedidos sin asignar O asignados al usuario actual
        query = query.or(`delivery_person_id.is.null,delivery_person_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transformar datos agregando campos calculados
      const ordersWithExtras: DeliveryOrder[] = (data || []).map(order => {
        const minutesSince = (Date.now() - new Date(order.created_at).getTime()) / 1000 / 60;
        
        // Extraer nombre del cliente
        // Prioridad: 1) customer.name del join, 2) nombre_resumen de la orden
        let customerName = 'Cliente sin nombre';
        if (order.customer && typeof order.customer === 'object' && (order.customer as any).name) {
          customerName = (order.customer as any).name;
        } else if (order.nombre_resumen) {
          customerName = order.nombre_resumen;
        }
        
        // Extraer teléfono del cliente
        let customerPhone = undefined;
        if (order.customer && typeof order.customer === 'object') {
          customerPhone = (order.customer as any).phone;
        }
        
        return {
          ...order,
          items: order.items as any,
          customer_name: customerName,
          customer_phone: customerPhone,
          minutes_since_created: Math.floor(minutesSince),
          payment_runas: order.payment_runas || 0
        };
      });

      setOrders(ordersWithExtras);
    } catch (error: any) {
      console.error('Error fetching delivery orders:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [user, settings]);

  const markAsOnTheWay = async (orderId: string) => {
    if (!user) return false;

    try {
      setUpdatingOrders(prev => new Set(prev).add(orderId));

      // Actualizar estado y asignar repartidor si aún no está asignado
      const order = orders.find(o => o.id === orderId);
      const updates: any = {
        p_order_id: orderId,
        p_new_status: 'En camino' as OrderStatus,
        p_user_id: user.id
      };

      const { error } = await supabase.rpc('update_order_status', updates);

      if (error) throw error;

      // Si el pedido no tenía repartidor asignado, asignarlo ahora
      if (!order?.delivery_person_id) {
        const { error: assignError } = await supabase
          .from('orders')
          .update({
            delivery_person_id: user.id,
            delivery_person_name: user.full_name || user.username,
            delivery_assigned_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (assignError) throw assignError;

        // Notificar al cliente que se asignó repartidor
        triggerDeliveryAssignedNotification(
          order?.customer_id || null,
          orderId,
          order?.order_number || 0,
          user.full_name || user.username || 'Repartidor'
        ).catch(err => console.error('[Delivery] Push notification error:', err));

        // Notificar al repartidor (staff notification in-app + push)
        triggerOrderAssignedNotification(
          user.id,
          user.id,
          order?.order_number || 0,
          order?.delivery_address || 'Sin dirección',
          orderId
        ).catch(err => console.error('[Delivery] Staff notification error:', err));
      }

      // Notificar cambio de estado "En camino"
      triggerOrderStatusNotification(
        order?.customer_id || null,
        orderId,
        order?.order_number || 0,
        'En camino',
        'delivery'
      ).catch(err => console.error('[Delivery] Push notification error:', err));

      toast.success('Pedido marcado como "En camino"');
      await fetchOrders();
      return true;
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar pedido');
      return false;
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const markAsDelivered = async (orderId: string) => {
    if (!user) return false;

    try {
      setUpdatingOrders(prev => new Set(prev).add(orderId));

      const updates: any = {
        p_order_id: orderId,
        p_new_status: 'Entregado' as OrderStatus,
        p_user_id: user.id
      };

      const { error } = await supabase.rpc('update_order_status', updates);

      if (error) throw error;

      // Setear delivery_delivered_at y asegurar que el repartidor está asignado
      const order = orders.find(o => o.id === orderId);
      const deliveryPersonId = order?.delivery_person_id || user.id;
      
      const deliveryUpdates: any = {
        delivery_delivered_at: new Date().toISOString()
      };

      if (!order?.delivery_person_id) {
        deliveryUpdates.delivery_person_id = user.id;
        deliveryUpdates.delivery_person_name = user.full_name || user.username;
        deliveryUpdates.delivery_assigned_at = new Date().toISOString();
      }

      const { error: deliveryError } = await supabase
        .from('orders')
        .update(deliveryUpdates)
        .eq('id', orderId);

      if (deliveryError) throw deliveryError;

      // Si el pedido tiene pago en efectivo, crear registro de efectivo pendiente
      const cashAmount = order?.payment_efectivo || 0;
      if (cashAmount > 0) {
        const { error: pendingCashError } = await supabase
          .from('delivery_cash_pending')
          .insert({
            order_id: orderId,
            delivery_person_id: deliveryPersonId,
            amount: cashAmount,
            status: 'pendiente',
            collected_at: new Date().toISOString()
          });

        if (pendingCashError) {
          console.error('Error creating pending cash record:', pendingCashError);
          // No bloquear la entrega por este error
        } else {
          console.log(`[Delivery] Efectivo pendiente registrado: $${cashAmount} para repartidor ${deliveryPersonId}`);
        }
      }

      // Crear registro de pago pendiente para el repartidor
      // El monto base es delivery_payment_amount (configurado por zona) o delivery_fee si no está configurado
      const basePaymentAmount = order?.delivery_payment_amount || order?.delivery_fee || 0;
      if (basePaymentAmount > 0) {
        const { error: paymentError } = await supabase
          .from('delivery_payments')
          .insert({
            order_id: orderId,
            delivery_person_id: deliveryPersonId,
            base_amount: basePaymentAmount,
            gross_amount: basePaymentAmount,
            net_amount: basePaymentAmount,
            status: 'pending'
          });

        if (paymentError) {
          console.error('Error creating delivery payment record:', paymentError);
          // No bloquear la entrega por este error
        } else {
          console.log(`[Delivery] Pago pendiente registrado: $${basePaymentAmount} para repartidor ${deliveryPersonId}`);
        }
      }

      // Notificar cambio de estado "Entregado" al cliente
      triggerOrderStatusNotification(
        order?.customer_id || null,
        orderId,
        order?.order_number || 0,
        'Entregado',
        'delivery'
      ).catch(err => console.error('[Delivery] Push notification error:', err));

      // Notificar al cajero que creó el pedido (staff notification)
      if (order?.user_id) {
        triggerOrderDeliveredNotification(
          user.id,
          order.user_id,
          order?.order_number || 0,
          user.full_name || user.username || 'Repartidor',
          orderId
        ).catch(err => console.error('[Delivery] Staff notification error:', err));
      }

      toast.success('Pedido marcado como entregado');
      await fetchOrders();
      return true;
    } catch (error: any) {
      console.error('Error marking order as delivered:', error);
      toast.error('Error al marcar como entregado');
      return false;
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  /**
   * Cobrar pedido con pago pendiente y marcar como entregado
   */
  const collectAndDeliver = async (orderId: string, paymentMethodUsed: string, cashGiven?: number): Promise<boolean> => {
    if (!user) return false;

    try {
      setUpdatingOrders(prev => new Set(prev).add(orderId));

      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('Pedido no encontrado');

      const total = order.total || 0;
      const methodLower = paymentMethodUsed.toLowerCase();

      // Build payment fields based on selected method
      const paymentFields: Record<string, any> = {
        payment_method: paymentMethodUsed,
        payment_status: 'paid',
        payment_efectivo: 0,
        payment_mp: 0,
        payment_pos: 0,
        payment_aplicacion: 0,
      };

      if (methodLower === 'efectivo') {
        paymentFields.payment_efectivo = cashGiven || total;
      } else if (['mp', 'mercadopago', 'transferencia'].includes(methodLower)) {
        paymentFields.payment_mp = total;
      } else if (methodLower === 'pos') {
        paymentFields.payment_pos = total;
      } else if (methodLower === 'aplicacion') {
        paymentFields.payment_aplicacion = total;
      } else {
        // Fallback: set as mp
        paymentFields.payment_mp = total;
      }

      // Update order payment info
      const { error: payError } = await supabase
        .from('orders')
        .update(paymentFields)
        .eq('id', orderId);

      if (payError) throw payError;

      // Now mark as delivered using existing flow
      const result = await markAsDelivered(orderId);

      // If cash was collected, the markAsDelivered already handles delivery_cash_pending
      // But we need to ensure it uses the correct cash amount from our payment
      // markAsDelivered reads payment_efectivo from the order, which we just updated

      return result;
    } catch (error: any) {
      console.error('Error collecting payment and delivering:', error);
      toast.error('Error al cobrar y entregar pedido');
      return false;
    } finally {
      setUpdatingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchOrders();

    // Suscripción a cambios en tiempo real
    const subscription = supabase
      .channel('delivery_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'fulfillment=eq.delivery'
        },
        (payload) => {
          console.log('[DeliveryOrders] Real-time update:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrders]);

  return {
    orders,
    loading,
    updatingOrders,
    markAsOnTheWay,
    markAsDelivered,
    collectAndDeliver,
    refetch: fetchOrders
  };
};
