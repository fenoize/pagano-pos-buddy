import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderItem } from '@/types';

export function useReadyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReadyOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*)')
      .eq('status', 'Listo')
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
  }, []);

  useEffect(() => {
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
  }, [fetchReadyOrders]);

  return { readyOrders: orders, loading, refetch: fetchReadyOrders };
}
