import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useKitchenOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the complete order with customer data
            fetchOrderById(payload.new.id);
            
            // Show notification for new orders
            toast({
              title: "¡Nuevo Pedido!",
              description: `Pedido #${payload.new.order_number} recibido`,
            });
          } else if (payload.eventType === 'UPDATE') {
            // Update existing order
            fetchOrderById(payload.new.id);
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted order
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (
            id,
            nombres,
            apellidos,
            name,
            apellido,
            phone,
            rut,
            email,
            cantidad_runas,
            valor_cliente,
            estado_cliente,
            created_at,
            updated_at
          )
        `)
        .not('status', 'in', '("Entregado","Cancelado")')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setOrders(data.map(order => ({
        ...order,
        items: order.items as any
      })) as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderById = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (
            id,
            nombres,
            apellidos,
            name,
            apellido,
            phone,
            rut,
            email,
            cantidad_runas,
            valor_cliente,
            estado_cliente,
            created_at,
            updated_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      const orderWithItems = {
        ...data,
        items: data.items as any
      } as Order;

      setOrders(prev => {
        const existingIndex = prev.findIndex(order => order.id === orderId);
        if (existingIndex >= 0) {
          // Update existing order
          const updated = [...prev];
          updated[existingIndex] = orderWithItems;
          return updated;
        } else {
          // Add new order
          return [...prev, orderWithItems];
        }
      });
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      // Show notification for status changes
      const order = orders.find(o => o.id === orderId);
      if (order) {
        if (newStatus === 'Listo') {
          toast({
            title: "¡Pedido Listo!",
            description: `Pedido #${order.order_number} está listo para ${order.fulfillment}`,
          });
        } else {
          toast({
            title: "Estado Actualizado",
            description: `Pedido #${order.order_number}: ${newStatus}`,
          });
        }
      }

      // Remove from kitchen view if delivered or cancelled
      if (['Entregado', 'Cancelado'].includes(newStatus)) {
        setOrders(prev => prev.filter(order => order.id !== orderId));
      }

    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pedido",
        variant: "destructive"
      });
    }
  };

  return {
    orders,
    loading,
    updateOrderStatus,
    refetch: fetchOrders
  };
}