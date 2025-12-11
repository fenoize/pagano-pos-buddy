import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useKDSHistory } from '@/hooks/useKDSHistory';
import { triggerOrderStatusNotification } from '@/lib/notificationTriggers';

export function useKitchenOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { addToHistory, isInHistory, removeFromHistory } = useKDSHistory();

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time updates con manejo robusto de errores
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
          try {
            console.log('[KDS] Order change:', payload.eventType, payload);
            
            // Validar estructura del payload
            if (!payload || !payload.eventType) {
              console.error('[KDS] Invalid payload structure:', payload);
              return;
            }
            
            if (payload.eventType === 'INSERT') {
              // Validar que new existe
              if (!payload.new || !payload.new.id) {
                console.error('[KDS] INSERT event missing required data:', payload);
                return;
              }
              
              // Fetch the complete order with customer data
              fetchOrderById(payload.new.id);
              
              // Show notification for new orders
              toast({
                title: "¡Nuevo Pedido!",
                description: `Pedido #${payload.new.order_number} recibido`,
              });
            } else if (payload.eventType === 'UPDATE') {
              // Validar que new existe
              if (!payload.new || !payload.new.id) {
                console.error('[KDS] UPDATE event missing required data:', payload);
                return;
              }
              
              // Update existing order
              fetchOrderById(payload.new.id);
            } else if (payload.eventType === 'DELETE') {
              // Validar que old existe
              if (!payload.old || !payload.old.id) {
                console.error('[KDS] DELETE event missing required data:', payload);
                return;
              }
              
              // Remove deleted order
              setOrders(prev => prev.filter(order => order.id !== payload.old.id));
            }
          } catch (error) {
            console.error('[KDS] Error handling realtime event:', error);
            toast({
              title: "Error de sincronización",
              description: "Hubo un problema al actualizar los pedidos. Intenta refrescar.",
              variant: "destructive"
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[KDS] Subscription status:', status);
        
        if (status === 'CHANNEL_ERROR') {
          console.error('[KDS] Channel error, attempting to reconnect...');
          toast({
            title: "Error de conexión",
            description: "Reconectando en tiempo real...",
            variant: "destructive"
          });
        } else if (status === 'SUBSCRIBED') {
          console.log('[KDS] Successfully subscribed to realtime updates');
        }
      });

    return () => {
      console.log('[KDS] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper: determinar si un pedido delivery debe ocultarse del KDS
  const shouldHideDeliveryOrder = (order: Order) => {
    // Los pedidos delivery se ocultan del KDS cuando están "Listo" o "En camino"
    // porque ya pasaron a responsabilidad del repartidor
    if (order.fulfillment === 'delivery' && ['Listo', 'En camino'].includes(order.status)) {
      return true;
    }
    return false;
  };

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
        .neq('status', 'PendientePago' as any)
        .neq('status', 'Entregado')
        .neq('status', 'Cancelado')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filtrar órdenes que están en history (no mostrar si están en cache reciente)
      const ordersWithItems = (data || []).map(order => ({
        ...order,
        items: order.items as any
      })) as Order[];
      
      // Filtrar: no mostrar si está en history O si es delivery y ya está "Listo"/"En camino"
      const filtered = ordersWithItems.filter(order => {
        if (isInHistory(order.id)) return false;
        if (shouldHideDeliveryOrder(order)) return false;
        return true;
      });
      
      console.log(`[KDS] Loaded ${ordersWithItems.length} orders, showing ${filtered.length} (filtered: history + delivery ready)`);
      
      setOrders(filtered);
    } catch (error) {
      console.error('[KDS] Error fetching orders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderById = async (orderId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 segundo
    
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
        console.error(`[KDS] Error fetching order (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
        
        // Retry con backoff exponencial
        if (retryCount < MAX_RETRIES && error.code !== 'PGRST116') { // PGRST116 = not found
          console.log(`[KDS] Retrying in ${RETRY_DELAY * (retryCount + 1)}ms...`);
          setTimeout(() => {
            fetchOrderById(orderId, retryCount + 1);
          }, RETRY_DELAY * (retryCount + 1));
          return;
        }
        
        // Si agotamos los reintentos o el pedido no existe, remover
        setOrders(prev => prev.filter(order => order.id !== orderId));
        return;
      }

      const orderWithItems = {
        ...data,
        items: data.items as any
      } as Order;

      // Revisar si el pedido cambió de estado final a activo (debe volver al KDS)
      const wasInHistory = isInHistory(orderId);
      const isNowActive = !['Entregado', 'Cancelado', 'PendientePago'].includes(orderWithItems.status);

      if (wasInHistory && isNowActive) {
        console.log(`[KDS] Order #${orderWithItems.order_number} changed from final to active status (${orderWithItems.status}), removing from history`);
        removeFromHistory(orderId);
      }

      // Si después de esto el pedido está en history Y en estado final, filtrarlo
      if (isInHistory(orderId) && ['Entregado', 'Cancelado'].includes(orderWithItems.status)) {
        console.log(`[KDS] Order ${orderId} is in history and in final state, filtering out`);
        setOrders(prev => prev.filter(order => order.id !== orderId));
        return;
      }

      setOrders(prev => {
        // Si el pedido está Entregado o Cancelado, agregarlo a history y removerlo del KDS
        if (orderWithItems.status === 'Entregado' || orderWithItems.status === 'Cancelado') {
          console.log(`[KDS] Order #${orderWithItems.order_number} marked as ${orderWithItems.status}, adding to history`);
          addToHistory(orderId);
          return prev.filter(order => order.id !== orderId);
        }
        
        // Si es un pedido delivery y está "Listo" o "En camino", ocultarlo del KDS
        if (shouldHideDeliveryOrder(orderWithItems)) {
          console.log(`[KDS] Delivery order #${orderWithItems.order_number} is ${orderWithItems.status}, hiding from KDS`);
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
          // Add new order (solo si NO está Entregado/Cancelado y NO está en history)
          console.log(`[KDS] Adding new order #${orderWithItems.order_number} to KDS (status: ${orderWithItems.status})`);
          return [...prev, orderWithItems];
        }
      });
    } catch (error) {
      console.error(`[KDS] Unexpected error fetching order (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      
      // Retry en caso de error inesperado
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          fetchOrderById(orderId, retryCount + 1);
        }, RETRY_DELAY * (retryCount + 1));
      } else {
        // En caso de error, remover del estado local por seguridad
        setOrders(prev => prev.filter(order => order.id !== orderId));
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    console.log(`[KDS] Updating order ${orderId} to status: ${newStatus}`);
    
    // Guardar estado anterior para rollback
    const previousOrder = orders.find(o => o.id === orderId);
    if (!previousOrder) {
      console.error('[KDS] Order not found in local state');
      return;
    }

    try {
      // PASO 1: Marcar como "updating" para deshabilitar botones
      setUpdatingOrders(prev => new Set(prev).add(orderId));

      // PASO 2: UPDATE OPTIMISTA - Actualizar UI inmediatamente
      console.log(`[KDS] Optimistic update to status: ${newStatus}`);
      
      if (['Entregado', 'Cancelado'].includes(newStatus)) {
        // Agregar a history y remover inmediatamente si es final
        addToHistory(orderId);
        setOrders(prev => prev.filter(order => order.id !== orderId));
      } else {
        // Actualizar estado local
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        ));
      }

      // PASO 3: UPDATE EN BD (segundo plano)
      // Obtener usuario actual
      const storedUser = localStorage.getItem('paganos_staff_user');
      if (!storedUser) {
        throw new Error('No hay usuario autenticado en el KDS');
      }
      
      const currentUser = JSON.parse(storedUser);
      if (!currentUser?.id) {
        throw new Error('Usuario sin ID válido');
      }
      
      // Usar RPC que establece contexto dentro de la transacción
      console.log(`[KDS] Updating order in database (status: ${newStatus})`);
      const { error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus as any,
        p_user_id: currentUser.id
      });

      if (error) {
        console.error('[KDS] Database update error:', error);
        throw error;
      }
      
      console.log(`[KDS] Order ${orderId} successfully updated to ${newStatus} in database`);

      // PASO 4: Disparar notificación push al cliente (fire and forget)
      if (['En preparación', 'Listo', 'En camino', 'Entregado'].includes(newStatus)) {
        triggerOrderStatusNotification(
          previousOrder.customer_id || null,
          previousOrder.order_number,
          newStatus,
          previousOrder.fulfillment as 'pickup' | 'delivery'
        ).catch(err => console.error('[KDS] Push notification error:', err));
      }

      // PASO 5: Mostrar notificación de éxito local
      if (newStatus === 'Listo') {
        toast({
          title: "¡Pedido Listo!",
          description: `Pedido #${previousOrder.order_number} está listo para ${previousOrder.fulfillment}`,
        });
      } else if (newStatus === 'Entregado') {
        toast({
          title: "¡Pedido Entregado!",
          description: `Pedido #${previousOrder.order_number} ha sido entregado`,
        });
      } else if (newStatus === 'Cancelado') {
        toast({
          title: "Pedido Cancelado",
          description: `Pedido #${previousOrder.order_number} ha sido cancelado`,
        });
      } else {
        toast({
          title: "Estado Actualizado",
          description: `Pedido #${previousOrder.order_number}: ${newStatus}`,
        });
      }

    } catch (error) {
      console.error('[KDS] Error updating order status:', error);
      
      // ROLLBACK: Restaurar estado anterior
      console.log('[KDS] Rolling back to previous state');
      setOrders(prev => {
        // Si el pedido fue removido, agregarlo de vuelta
        const exists = prev.find(o => o.id === orderId);
        if (!exists) {
          return [...prev, previousOrder];
        }
        // Si existe, restaurar estado anterior
        return prev.map(order => 
          order.id === orderId ? previousOrder : order
        );
      });
      
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del pedido. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      // PASO 5: Remover de "updating"
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  return {
    orders,
    loading,
    updatingOrders,
    updateOrderStatus,
    refetch: fetchOrders
  };
}