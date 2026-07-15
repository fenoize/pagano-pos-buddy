 import { useState, useEffect, useCallback, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Order, User, OrderItem } from '@/types';
 import { useCashSession } from './useCashSession';
 import { useDeliverySettings } from './useDeliverySettings';
 import { toast } from 'sonner';
 import { triggerOrderAssignedNotification } from '@/lib/staffNotificationTriggers';
 import { useAuthContext } from '@/contexts/AuthContext';
 
 // Simplified customer type for incoming orders
 export interface IncomingOrderCustomer {
   id: string;
   name?: string;
   nombres?: string;
   apellidos?: string;
   phone?: string;
 }
 
 // Use a separate interface instead of extending Order to avoid type conflicts
 export interface IncomingOrder {
   id: string;
   order_number: number;
   customer_id?: string;
   customer?: IncomingOrderCustomer;
   fulfillment: 'retiro' | 'delivery';
   pickup_mode?: string | null;
   delivery_zone_id?: string;
   delivery_zone_name?: string;
   delivery_address?: string;
   delivery_number?: string;
   delivery_comuna?: string;
   delivery_comuna_id?: string;
   delivery_reference?: string;
   delivery_person_id?: string;
   delivery_person_name?: string;
   delivery_distance?: number;
   delivery_assigned_at?: string;
   delivery_delivered_at?: string;
   items: OrderItem[];
   subtotal: number;
   delivery_fee: number;
   discount: number;
   total: number;
   payment_efectivo: number;
   payment_mp: number;
   payment_pos: number;
   payment_aplicacion: number;
   payment_runas: number;
   payment_method: string;
   status: string;
   notes?: string;
   nombre_resumen?: string;
   created_by_user_id?: string;
   created_at: string;
   updated_at: string;
   source?: string;
 }
 export interface DeliveryPerson {
   id: string;
   full_name: string;
   username: string;
 }
 
 export function useIncomingOrders() {
   const [orders, setOrders] = useState<IncomingOrder[]>([]);
   const [loading, setLoading] = useState(true);
   const [accepting, setAccepting] = useState(false);
   const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
   const { currentSession } = useCashSession();
   const { settings: deliverySettings } = useDeliverySettings();
  const { user } = useAuthContext();

  const [newOrderArrived, setNewOrderArrived] = useState(false);
  const lastAlertedCountRef = useRef(0);
  const latestOrderCountRef = useRef(0);

  const canAcceptAppOrders = currentSession?.accept_app_orders === true;
  const deliveryAssignmentMode = deliverySettings?.assignment_mode || 'pool';
 
   // Fetch delivery persons for assignment
   const fetchDeliveryPersons = useCallback(async () => {
     try {
       const { data, error } = await supabase
         .from('users')
         .select('id, full_name, username')
         .eq('active', true)
         .eq('can_do_delivery', true)
         .order('full_name');
 
       if (error) throw error;
       setDeliveryPersons(data || []);
     } catch (error) {
       console.error('Error fetching delivery persons:', error);
     }
   }, []);
 
   // Fetch pending orders
   const fetchPendingOrders = useCallback(async () => {
     if (!canAcceptAppOrders) {
       setOrders([]);
       setLoading(false);
       return;
     }
 
     try {
       const { data, error } = await supabase
         .from('orders')
         .select(`
           *,
           customer:customers(
             id,
             name,
             nombres,
             apellidos,
             phone
           )
         `)
         .eq('status', 'PendienteAceptacion')
         .order('created_at', { ascending: true });
 
       if (error) throw error;
 
       // Map the data to our IncomingOrder type
       const newOrders: IncomingOrder[] = (data || []).map((order: any) => ({
         ...order,
         items: Array.isArray(order.items) ? order.items : [],
         customer: order.customer || undefined
       }));
       
        setOrders(newOrders);
     } catch (error) {
       console.error('Error fetching pending orders:', error);
     } finally {
       setLoading(false);
     }
   }, [canAcceptAppOrders]);
 
   // Accept an order
   const acceptOrder = useCallback(async (
     orderId: string,
     deliveryPersonId?: string
   ): Promise<boolean> => {
     if (!currentSession || !user?.id) {
       toast.error('No hay sesión de caja activa');
       return false;
     }
 
     const order = orders.find(o => o.id === orderId);
     if (!order) {
       toast.error('Pedido no encontrado');
       return false;
     }
 
     // Validate delivery person for delivery orders in 'assigned' mode
     if (
       order.fulfillment === 'delivery' &&
       deliveryAssignmentMode === 'assigned' &&
       !deliveryPersonId
     ) {
       toast.error('Debes asignar un repartidor para pedidos delivery');
       return false;
     }
 
     setAccepting(true);
 
     try {
       // Prepare update data
       const updateData: any = {
         status: 'Pendiente',
         cash_session_id: currentSession.id
       };
 
       // Add delivery person if provided
       if (deliveryPersonId) {
         const deliveryPerson = deliveryPersons.find(p => p.id === deliveryPersonId);
         updateData.delivery_person_id = deliveryPersonId;
         updateData.delivery_person_name = deliveryPerson?.full_name || deliveryPerson?.username;
         updateData.delivery_assigned_at = new Date().toISOString();
       }
 
       const { error } = await supabase
         .from('orders')
         .update(updateData)
         .eq('id', orderId)
         .eq('status', 'PendienteAceptacion'); // Ensure it's still pending
 
       if (error) throw error;
 
       // Send notification to delivery person if assigned
       if (deliveryPersonId && order.delivery_address) {
         triggerOrderAssignedNotification(
           user.id,
           deliveryPersonId,
           order.order_number,
           order.delivery_address,
           orderId
         ).catch(console.error);
       }
 
       // TODO: Send push notification to customer that order was accepted
       // This will be handled via edge function or trigger
 
       toast.success(`Pedido #${order.order_number} aceptado`);
       
       // Refresh orders list
       await fetchPendingOrders();
       
       return true;
     } catch (error: any) {
       console.error('Error accepting order:', error);
       toast.error(error.message || 'Error al aceptar el pedido');
       return false;
     } finally {
       setAccepting(false);
     }
   }, [currentSession, user, orders, deliveryPersons, deliveryAssignmentMode, fetchPendingOrders]);
 
    // Derived flag: true whenever there are pending orders
    const newOrderArrived = orders.length > 0;
    const clearNewOrderFlag = useCallback(() => {
      // No-op: presence in orders array is the source of truth
    }, []);
 
   // Initial fetch
   useEffect(() => {
     if (canAcceptAppOrders) {
       fetchPendingOrders();
       fetchDeliveryPersons();
     } else {
       setOrders([]);
       setLoading(false);
     }
   }, [canAcceptAppOrders, fetchPendingOrders, fetchDeliveryPersons]);
 
    // Subscribe to realtime updates with auto-reconnect on failure
    useEffect(() => {
      if (!canAcceptAppOrders) return;

      let channel: ReturnType<typeof supabase.channel> | null = null;
      let reconnectTimeout: ReturnType<typeof setTimeout>;

      const setupChannel = () => {
        if (channel) {
          supabase.removeChannel(channel);
        }

        channel = supabase
          .channel('incoming-orders')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: 'status=eq.PendienteAceptacion'
            },
            (payload) => {
              console.log('📬 Incoming order update:', payload.eventType);
              fetchPendingOrders();
            }
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('📡 Channel lost, reconnecting in 5s...');
              reconnectTimeout = setTimeout(setupChannel, 5000);
            }
          });
      };

      setupChannel();

      // Polling backup every 20 seconds (lightweight SELECT, ~1KB response)
      const pollInterval = setInterval(fetchPendingOrders, 20000);

      // Only reconnect channel when tab returns from background (not on every focus)
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          fetchPendingOrders();
          // Only recreate channel if it's not healthy
          if (channel) {
            const state = (channel as any).state;
            if (state !== 'joined' && state !== 'joining') {
              console.log('📡 Tab visible + channel stale, reconnecting');
              setupChannel();
            }
          }
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        if (channel) supabase.removeChannel(channel);
        clearInterval(pollInterval);
        clearTimeout(reconnectTimeout);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }, [canAcceptAppOrders, fetchPendingOrders]);
 
   return {
     orders,
     loading,
     accepting,
     acceptOrder,
     deliveryPersons,
     deliveryAssignmentMode,
     canAcceptAppOrders,
     newOrderArrived,
     clearNewOrderFlag,
     refetch: fetchPendingOrders
   };
 }