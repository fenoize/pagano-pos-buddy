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
        .neq('status', 'Entregado')
        .neq('status', 'Cancelado')
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

      if (error) {
        // Si el pedido no existe o no se puede acceder, removerlo del estado local
        console.error('Error fetching order:', error);
        setOrders(prev => prev.filter(order => order.id !== orderId));
        return;
      }

      const orderWithItems = {
        ...data,
        items: data.items as any
      } as Order;

      setOrders(prev => {
        // Si el pedido está Entregado o Cancelado, removerlo del KDS
        if (orderWithItems.status === 'Entregado' || orderWithItems.status === 'Cancelado') {
          console.log(`[KDS] Removing order #${orderWithItems.order_number} from KDS (status: ${orderWithItems.status})`);
          return prev.filter(order => order.id !== orderId);
        }
        
        const existingIndex = prev.findIndex(order => order.id === orderId);
        if (existingIndex >= 0) {
          // Update existing order
          console.log(`[KDS] Updating order #${orderWithItems.order_number} (status: ${orderWithItems.status})`);
          const updated = [...prev];
          updated[existingIndex] = orderWithItems;
          return updated;
        } else {
          // Add new order (solo si NO está Entregado/Cancelado)
          console.log(`[KDS] Adding new order #${orderWithItems.order_number} to KDS (status: ${orderWithItems.status})`);
          return [...prev, orderWithItems];
        }
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      // En caso de error, remover del estado local por seguridad
      setOrders(prev => prev.filter(order => order.id !== orderId));
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    console.log(`[KDS] Updating order ${orderId} to status: ${newStatus}`);
    
    try {
      // Obtener info del pedido para notificaciones
      const order = orders.find(o => o.id === orderId);
      
      // PRIMERO: Si el nuevo estado es Entregado/Cancelado, remover inmediatamente del estado local
      if (['Entregado', 'Cancelado'].includes(newStatus)) {
        console.log(`[KDS] Removing order from local state immediately (status: ${newStatus})`);
        setOrders(prev => prev.filter(order => order.id !== orderId));
      }

      // SEGUNDO: Actualizar en la base de datos
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // TERCERO: Si NO es Entregado/Cancelado, actualizar estado local
      if (!['Entregado', 'Cancelado'].includes(newStatus)) {
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        ));
      }

      // Mostrar notificación
      if (order) {
        if (newStatus === 'Listo') {
          toast({
            title: "¡Pedido Listo!",
            description: `Pedido #${order.order_number} está listo para ${order.fulfillment}`,
          });
        } else if (newStatus === 'Entregado') {
          toast({
            title: "¡Pedido Entregado!",
            description: `Pedido #${order.order_number} ha sido entregado`,
          });
        } else if (newStatus === 'Cancelado') {
          toast({
            title: "Pedido Cancelado",
            description: `Pedido #${order.order_number} ha sido cancelado`,
          });
        } else {
          toast({
            title: "Estado Actualizado",
            description: `Pedido #${order.order_number}: ${newStatus}`,
          });
        }
      }

    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pedido",
        variant: "destructive"
      });
      // Si hay error, recargar desde la BD para tener datos consistentes
      fetchOrders();
    }
  };

  return {
    orders,
    loading,
    updateOrderStatus,
    refetch: fetchOrders
  };
}