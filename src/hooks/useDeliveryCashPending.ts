import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { setStaffContext, withStaffContext } from '@/lib/dbContext';

export interface DeliveryCashPending {
  id: string;
  delivery_person_id: string;
  order_id: string;
  amount: number;
  status: 'pendiente' | 'depositado' | 'ajustado';
  collected_at: string;
  deposited_at: string | null;
  deposited_to_session_id: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  delivery_person?: { id: string; full_name: string; username: string };
  order?: { order_number: number; customer_id: string | null };
}

export interface DeliveryPersonPendingCash {
  delivery_person_id: string;
  delivery_person_name: string;
  total_pending: number;
  pending_count: number;
  pending_items: DeliveryCashPending[];
}

export function useDeliveryCashPending() {
  const { user } = useAuth();
  const [pendingCash, setPendingCash] = useState<DeliveryCashPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingByPerson, setPendingByPerson] = useState<DeliveryPersonPendingCash[]>([]);

  const fetchPendingCash = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await setStaffContext(user.id);

      // Fetch pending cash records
      const { data: pendingData, error: pendingError } = await supabase
        .from('delivery_cash_pending')
        .select('*')
        .eq('status', 'pendiente')
        .order('collected_at', { ascending: false });

      if (pendingError) throw pendingError;

      // Get unique delivery person IDs and order IDs
      const deliveryPersonIds = [...new Set((pendingData || []).map(p => p.delivery_person_id))];
      const orderIds = [...new Set((pendingData || []).map(p => p.order_id))];

      // Fetch delivery persons
      const { data: usersData } = deliveryPersonIds.length > 0 
        ? await supabase.from('users').select('id, full_name, username').in('id', deliveryPersonIds)
        : { data: [] };

      // Fetch orders
      const { data: ordersData } = orderIds.length > 0
        ? await supabase.from('orders').select('id, order_number, customer_id').in('id', orderIds)
        : { data: [] };

      // Create lookup maps
      const usersMap = new Map((usersData || []).map(u => [u.id, u]));
      const ordersMap = new Map((ordersData || []).map(o => [o.id, o]));

      // Enrich pending cash data
      const enrichedData: DeliveryCashPending[] = (pendingData || []).map(item => ({
        ...item,
        status: item.status as 'pendiente' | 'depositado' | 'ajustado',
        delivery_person: usersMap.get(item.delivery_person_id),
        order: ordersMap.get(item.order_id)
      }));

      setPendingCash(enrichedData);

      // Agrupar por repartidor
      const byPerson: Record<string, DeliveryPersonPendingCash> = {};
      
      for (const item of enrichedData) {
        const personId = item.delivery_person_id;
        const personName = item.delivery_person?.full_name || item.delivery_person?.username || 'Desconocido';
        
        if (!byPerson[personId]) {
          byPerson[personId] = {
            delivery_person_id: personId,
            delivery_person_name: personName,
            total_pending: 0,
            pending_count: 0,
            pending_items: []
          };
        }
        
        byPerson[personId].total_pending += item.amount;
        byPerson[personId].pending_count += 1;
        byPerson[personId].pending_items.push(item);
      }

      setPendingByPerson(Object.values(byPerson));
    } catch (error) {
      console.error('Error fetching pending cash:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Crear registro de efectivo pendiente cuando se entrega un pedido
  const createPendingCash = async (
    orderId: string,
    deliveryPersonId: string,
    amount: number
  ): Promise<boolean> => {
    if (!user?.id) return false;

    return withStaffContext(user.id, async () => {
      try {
        const { error } = await supabase
          .from('delivery_cash_pending')
          .insert({
            order_id: orderId,
            delivery_person_id: deliveryPersonId,
            amount,
            status: 'pendiente',
            collected_at: new Date().toISOString()
          });

        if (error) throw error;
        
        await fetchPendingCash();
        return true;
      } catch (error) {
        console.error('Error creating pending cash:', error);
        return false;
      }
    });
  };

  // Marcar efectivo como depositado
  const depositCash = async (
    pendingIds: string[],
    sessionId: string,
    notes?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    return withStaffContext(user.id, async () => {
      try {
        const { error } = await supabase
          .from('delivery_cash_pending')
          .update({
            status: 'depositado',
            deposited_at: new Date().toISOString(),
            deposited_to_session_id: sessionId,
            notes: notes || null
          })
          .in('id', pendingIds);

        if (error) throw error;

        toast.success('Efectivo depositado correctamente');
        await fetchPendingCash();
        // Notify all other hook instances to refetch
        window.dispatchEvent(new Event('delivery-cash-updated'));
        return true;
      } catch (error) {
        console.error('Error depositing cash:', error);
        toast.error('Error al depositar efectivo');
        return false;
      }
    });
  };

  // Obtener total pendiente de un repartidor específico
  const getPendingByDeliveryPerson = async (deliveryPersonId: string): Promise<DeliveryCashPending[]> => {
    if (!user?.id) return [];

    try {
      await setStaffContext(user.id);

      const { data: pendingData, error } = await supabase
        .from('delivery_cash_pending')
        .select('*')
        .eq('delivery_person_id', deliveryPersonId)
        .eq('status', 'pendiente')
        .order('collected_at', { ascending: false });

      if (error) throw error;

      // Fetch orders for these pending items
      const orderIds = [...new Set((pendingData || []).map(p => p.order_id))];
      const { data: ordersData } = orderIds.length > 0
        ? await supabase.from('orders').select('id, order_number, customer_id').in('id', orderIds)
        : { data: [] };

      const ordersMap = new Map((ordersData || []).map(o => [o.id, o]));

      return (pendingData || []).map(item => ({
        ...item,
        status: item.status as 'pendiente' | 'depositado' | 'ajustado',
        order: ordersMap.get(item.order_id)
      }));
    } catch (error) {
      console.error('Error fetching pending cash by person:', error);
      return [];
    }
  };

  // Obtener resumen de efectivo para el dashboard
  const getCashSummary = useCallback(() => {
    const totalPending = pendingCash.reduce((sum, item) => sum + item.amount, 0);
    const totalByPerson = pendingByPerson.length;
    
    return {
      totalPending,
      totalByPerson,
      pendingByPerson
    };
  }, [pendingCash, pendingByPerson]);

  useEffect(() => {
    if (user?.id) {
      fetchPendingCash();
    }
  }, [user?.id, fetchPendingCash]);

  return {
    pendingCash,
    pendingByPerson,
    loading,
    createPendingCash,
    depositCash,
    getPendingByDeliveryPerson,
    getCashSummary,
    refetch: fetchPendingCash
  };
}
