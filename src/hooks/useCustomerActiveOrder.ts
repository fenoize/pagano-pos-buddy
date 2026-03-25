import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

const ACTIVE_STATUSES = ['Pendiente', 'En preparación', 'En pausa', 'Listo', 'En camino', 'PendienteAceptacion', 'PendientePago'] as const;

interface ActiveOrder {
  id: string;
  order_number: number;
  status: string;
  fulfillment: string;
}

export function useCustomerActiveOrder() {
  const { customer } = useCustomerAuth();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveOrder = useCallback(async () => {
    if (!customer?.id) {
      setActiveOrder(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, fulfillment')
        .eq('customer_id', customer.id)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active order:', error);
      }
      setActiveOrder(data as ActiveOrder | null);
    } catch (err) {
      console.error('Error fetching active order:', err);
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchActiveOrder();
  }, [fetchActiveOrder]);

  // Realtime subscription on orders table
  useEffect(() => {
    if (!customer?.id) return;

    const channel = supabase
      .channel(`active-order-${customer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          fetchActiveOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer?.id, fetchActiveOrder]);

  return { activeOrder, loading };
}
