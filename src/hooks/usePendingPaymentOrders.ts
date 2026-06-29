 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useCashSession } from '@/hooks/useCashSession';
 import { useAuthContext } from '@/contexts/AuthContext';
 import { setStaffContext } from '@/lib/dbContext';
import { toast } from "sonner";

// ID único para la suscripción compartida
let globalSubscriptionId = 0;
const listeners = new Set<() => void>();
let globalChannel: any = null;

// Función para notificar a todos los listeners
const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Inicializar suscripción global si no existe
const initGlobalSubscription = () => {
  if (globalChannel) return;
  
  globalChannel = supabase
    .channel('pending-payments-global')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders'
      },
      () => {
        notifyListeners();
      }
    )
    .subscribe();
};
 
 export interface PendingPaymentOrder {
   id: string;
   order_number: number;
   total: number;
   customer_name?: string;
   customer_phone?: string;
   fulfillment: string;
   pickup_mode?: string;
   created_at: string;
   cash_session_id: string | null;
   items: any[];
   nombre_resumen?: string;
   notes?: string;
   delivery_address?: string;
 }
 
 export interface PaymentCollectionEntry {
   methodName: string;
   displayName: string;
   amount: number;
   cashGiven?: number;
   receiptNumber?: string;
   operationNumber?: string;
   salesChannelSlug?: string;
   externalOrderId?: string;
 }
 
 export function usePendingPaymentOrders() {
   const [pendingOrders, setPendingOrders] = useState<PendingPaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
   const { currentSession } = useCashSession();
   const { user } = useAuthContext();
   const fetchPendingOrders = useCallback(async () => {
     try {
      setLoading(true);
       // Obtener pedidos con payment_status = 'unpaid'
       // Incluir: del turno actual + huérfanos (sin cash_session_id o con sesión cerrada)
       const { data, error } = await supabase
         .from('orders')
         .select(`
           id,
           order_number,
           total,
          nombre_resumen,
           fulfillment,
           pickup_mode,
           created_at,
           cash_session_id,
           notes,
           delivery_address,
          items,
          customer_id
         `)
         .eq('payment_status', 'unpaid')
         .not('status', 'eq', 'Cancelado')
         .order('created_at', { ascending: false });
 
       if (error) throw error;
 
      const orders: PendingPaymentOrder[] = (data || []).map((order: any) => ({
         id: order.id,
         order_number: order.order_number,
         total: order.total,
        customer_name: order.nombre_resumen,
        customer_phone: undefined,
         fulfillment: order.fulfillment,
         pickup_mode: order.pickup_mode,
         created_at: order.created_at,
         cash_session_id: order.cash_session_id,
        items: Array.isArray(order.items) ? order.items : [],
         nombre_resumen: order.nombre_resumen,
         notes: order.notes,
         delivery_address: order.delivery_address
       }));
 
       setPendingOrders(orders);
     } catch (error) {
       console.error('Error fetching pending payment orders:', error);
     } finally {
       setLoading(false);
     }
   }, []);
 
    // Cobrar un pedido pendiente (soporta múltiples métodos / pago mixto)
    const collectPayment = async (
      orderId: string,
      entries: PaymentCollectionEntry[]
    ): Promise<boolean> => {
      if (!user) return false;
      if (!entries || entries.length === 0) return false;

      try {
        await setStaffContext(user.id);

        // Acumular montos por bucket
        const totals = { efectivo: 0, pos: 0, mp: 0, aplicacion: 0 };
        let cashGivenTotal = 0;
        let receiptNumber: string | undefined;
        let operationNumber: string | undefined;
        let salesChannelSlug: string | undefined;
        let externalOrderId: string | undefined;

        for (const e of entries) {
          const name = (e.methodName || '').toLowerCase();
          if (name === 'efectivo') {
            totals.efectivo += e.amount;
            cashGivenTotal += e.cashGiven ?? e.amount;
          } else if (name === 'pos') {
            totals.pos += e.amount;
          } else if (name === 'transferencia' || name === 'mp') {
            totals.mp += e.amount;
          } else if (name === 'aplicacion') {
            totals.aplicacion += e.amount;
            if (e.salesChannelSlug) salesChannelSlug = e.salesChannelSlug;
            if (e.externalOrderId) externalOrderId = e.externalOrderId;
          } else {
            // Catch-all (colacion, canje, pluxee, edenred, etc.)
            totals.aplicacion += e.amount;
          }
          if (e.receiptNumber && !receiptNumber) receiptNumber = e.receiptNumber;
          if (e.operationNumber && !operationNumber) operationNumber = e.operationNumber;
        }

        const paymentMethod =
          entries.length === 1
            ? (entries[0].methodName || 'efectivo').toLowerCase()
            : 'mixto';

        const updates: Record<string, any> = {
          payment_status: 'paid',
          payment_method: paymentMethod as any,
          payment_efectivo: totals.efectivo,
          payment_pos: totals.pos,
          payment_mp: totals.mp,
          payment_aplicacion: totals.aplicacion,
          cash_given: cashGivenTotal,
        };

        if (receiptNumber) updates.receipt_number = receiptNumber;
        if (operationNumber) updates.operation_number = operationNumber;
        if (salesChannelSlug) updates.sales_channel_slug = salesChannelSlug;
        if (externalOrderId) updates.external_order_id = externalOrderId;

        // Si hay sesión activa, vincular el pedido a ella
        if (currentSession?.id) {
          updates.cash_session_id = currentSession.id;
        }

        const { error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', orderId);


 
       if (error) throw error;
 
       toast.success('✅ Pago registrado', { description: 'El pedido ha sido cobrado correctamente' });
 
       // Refrescar lista
       await fetchPendingOrders();
       return true;
     } catch (error: any) {
       console.error('Error collecting payment:', error);
       toast.error('Error', { description: error.message || 'No se pudo registrar el pago' });
       return false;
     }
   };
 
   // Suscripción realtime + evento local para refrescos inmediatos
   useEffect(() => {
     fetchPendingOrders();

    listeners.add(fetchPendingOrders);
    initGlobalSubscription();

    const handler = () => { fetchPendingOrders(); };
    window.addEventListener('pending-payments-updated', handler);

     return () => {
      listeners.delete(fetchPendingOrders);
      window.removeEventListener('pending-payments-updated', handler);
     };
   }, [fetchPendingOrders]);
 
   // Separar pedidos del turno actual vs heredados
   const currentSessionOrders = pendingOrders.filter(
     o => o.cash_session_id === currentSession?.id
   );
   const inheritedOrders = pendingOrders.filter(
     o => o.cash_session_id !== currentSession?.id
   );
 
   const count = pendingOrders.length;
   const totalAmount = pendingOrders.reduce((sum, o) => sum + o.total, 0);
 
   return {
     pendingOrders,
     currentSessionOrders,
     inheritedOrders,
     count,
     totalAmount,
     loading,
     collectPayment,
     refetch: fetchPendingOrders
   };
 }