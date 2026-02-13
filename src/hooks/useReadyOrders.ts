import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderItem, OrderStatus } from '@/types';

interface UseReadyOrdersOptions {
  visibleStatuses?: string[];
  enabled?: boolean;
}

const DEFAULT_STATUSES: OrderStatus[] = ['En preparación', 'Listo', 'Entregado'];

export function useReadyOrders(options: UseReadyOrdersOptions = {}) {
  const { visibleStatuses = DEFAULT_STATUSES, enabled = true } = options;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReadyOrders = useCallback(async () => {
    // Filtrar solo estados válidos
    const statusesToFetch = visibleStatuses.length > 0 ? visibleStatuses : DEFAULT_STATUSES;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .in('status', statusesToFetch as OrderStatus[])
      .eq('fulfillment', 'retiro') // Solo pedidos de retiro, NO delivery
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching ready orders:', error);
      return;
    }

    if (data) {
      const mappedOrders: Order[] = data.map(order => ({
        ...order,
        items: (order.items || []) as unknown as OrderItem[],
        customer: order.customer || undefined,
      }));
      setOrders(mappedOrders);
    }
    setLoading(false);
  }, [visibleStatuses]);

  useEffect(() => {
    if (!enabled) return;

    fetchReadyOrders();
    
    // Real-time subscription
    const channel = supabase
      .channel('ready-orders-tv')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchReadyOrders()
      )
      .subscribe();
    
    // Fallback polling every 30 seconds
    const interval = setInterval(fetchReadyOrders, 30000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchReadyOrders, enabled]);

  return { readyOrders: orders, loading, refetch: fetchReadyOrders };
}
