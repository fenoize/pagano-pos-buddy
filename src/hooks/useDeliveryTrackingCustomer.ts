import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TrackingData {
  riderLat: number | null;
  riderLng: number | null;
  heading: number | null;
  lastUpdated: string | null;
  isActive: boolean;
  isNear: boolean;
  isStale: boolean;
  loading: boolean;
}

const STALE_THRESHOLD_MS = 60000; // 60 seconds

export const useDeliveryTrackingCustomer = (orderId: string | undefined) => {
  const [data, setData] = useState<TrackingData>({
    riderLat: null,
    riderLng: null,
    heading: null,
    lastUpdated: null,
    isActive: false,
    isNear: false,
    isStale: false,
    loading: true,
  });

  const updateStaleStatus = useCallback((lastUpdated: string | null) => {
    if (!lastUpdated) return false;
    return Date.now() - new Date(lastUpdated).getTime() > STALE_THRESHOLD_MS;
  }, []);

  // Initial fetch via RPC (bypasses RLS for custom auth customers)
  useEffect(() => {
    if (!orderId) {
      setData(d => ({ ...d, loading: false }));
      return;
    }

    const fetchTracking = async () => {
      const { data: tracking, error } = await supabase
        .rpc('get_delivery_tracking_for_order', { p_order_id: orderId });

      if (error) {
        console.error('[CustomerTracking] Fetch error:', error);
        setData(d => ({ ...d, loading: false }));
        return;
      }

      if (tracking) {
        const t = tracking as any;
        setData({
          riderLat: t.latitude,
          riderLng: t.longitude,
          heading: t.heading,
          lastUpdated: t.updated_at,
          isActive: t.tracking_active ?? false,
          isNear: t.near_destination_notified ?? false,
          isStale: updateStaleStatus(t.updated_at),
          loading: false,
        });
      } else {
        setData(d => ({ ...d, loading: false }));
      }
    };

    fetchTracking();
  }, [orderId, updateStaleStatus]);

  // Realtime subscription (works without RLS on filtered channels)
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`delivery-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_tracking',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            setData({
              riderLat: row.latitude,
              riderLng: row.longitude,
              heading: row.heading,
              lastUpdated: row.updated_at,
              isActive: row.tracking_active ?? false,
              isNear: row.near_destination_notified ?? false,
              isStale: false,
              loading: false,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Periodically check staleness
  useEffect(() => {
    if (!data.isActive || !data.lastUpdated) return;

    const interval = setInterval(() => {
      setData(d => ({
        ...d,
        isStale: updateStaleStatus(d.lastUpdated),
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, [data.isActive, data.lastUpdated, updateStaleStatus]);

  return data;
};
