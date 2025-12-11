import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DeliveryPersonCashItem {
  id: string;
  order_id: string;
  amount: number;
  collected_at: string;
  status: string;
  order_number?: number;
}

export function useDeliveryPersonCash() {
  const { user } = useAuth();
  const [pendingCash, setPendingCash] = useState<DeliveryPersonCashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);
  const [hasPendingFromPreviousDays, setHasPendingFromPreviousDays] = useState(false);

  const fetchMyPendingCash = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_cash_pending')
        .select('id, order_id, amount, collected_at, status')
        .eq('delivery_person_id', user.id)
        .eq('status', 'pendiente')
        .order('collected_at', { ascending: false });

      if (error) throw error;

      // Enrich with order numbers
      const enrichedData: DeliveryPersonCashItem[] = [];
      
      if (data && data.length > 0) {
        const orderIds = data.map(item => item.order_id);
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, order_number')
          .in('id', orderIds);

        const ordersMap = new Map(ordersData?.map(o => [o.id, o.order_number]) || []);

        for (const item of data) {
          enrichedData.push({
            ...item,
            order_number: ordersMap.get(item.order_id) || undefined
          });
        }
      }

      setPendingCash(enrichedData);
      
      // Calculate total
      const total = enrichedData.reduce((sum, item) => sum + item.amount, 0);
      setTotalPending(total);

      // Check if any item is from a previous day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const hasPrevious = enrichedData.some(item => {
        const collectedDate = new Date(item.collected_at);
        collectedDate.setHours(0, 0, 0, 0);
        return collectedDate < today;
      });
      setHasPendingFromPreviousDays(hasPrevious);

    } catch (error) {
      console.error('Error fetching delivery person cash:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMyPendingCash();
  }, [fetchMyPendingCash]);

  const isFromPreviousDay = (collectedAt: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const collectedDate = new Date(collectedAt);
    collectedDate.setHours(0, 0, 0, 0);
    return collectedDate < today;
  };

  return {
    pendingCash,
    totalPending,
    hasPendingFromPreviousDays,
    loading,
    refetch: fetchMyPendingCash,
    isFromPreviousDay
  };
}
