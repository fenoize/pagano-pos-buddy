import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order, OrderStatus } from '@/types';
import { useAuth } from './useAuth';
import { useDeliverySettings } from './useDeliverySettings';

export interface DeliveryOrder extends Omit<Order, 'customer'> {
  customer_name?: string;
  customer_phone?: string;
  minutes_since_created?: number;
  customer?: { name?: string; phone?: string };
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
        .in('status', ['Listo', 'En camino'])
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
        return {
          ...order,
          items: order.items as any,
          customer_name: order.customer?.name,
          customer_phone: order.customer?.phone,
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
      }

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
    refetch: fetchOrders
  };
};
