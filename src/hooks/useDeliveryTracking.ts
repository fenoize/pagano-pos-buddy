import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TrackingState {
  isTracking: boolean;
  permissionState: 'checking' | 'granted' | 'prompt' | 'denied' | 'unknown';
  lastError: string | null;
  lastPosition: { lat: number; lng: number } | null;
}

const MIN_DISPLACEMENT_M = 20;
const MIN_INTERVAL_MS = 15000;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const useDeliveryTracking = () => {
  const { user } = useAuth();
  const [state, setState] = useState<TrackingState>({
    isTracking: false,
    permissionState: 'checking',
    lastError: null,
    lastPosition: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const activeOrderIdRef = useRef<string | null>(null);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = useCallback(async () => {
    setState(s => ({ ...s, permissionState: 'checking' }));
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setState(s => ({ ...s, permissionState: result.state as any }));
        result.onchange = () => {
          setState(s => ({ ...s, permissionState: result.state as any }));
        };
      } else {
        // Fallback: try getCurrentPosition with short timeout
        navigator.geolocation.getCurrentPosition(
          () => setState(s => ({ ...s, permissionState: 'granted' })),
          (err) => {
            if (err.code === 1) setState(s => ({ ...s, permissionState: 'denied' }));
            else setState(s => ({ ...s, permissionState: 'unknown' }));
          },
          { timeout: 3000 }
        );
      }
    } catch {
      setState(s => ({ ...s, permissionState: 'unknown' }));
    }
  }, []);

  const requestPermission = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setState(s => ({ ...s, permissionState: 'granted' }));
          resolve(true);
        },
        () => {
          setState(s => ({ ...s, permissionState: 'denied' }));
          resolve(false);
        },
        { timeout: 10000 }
      );
    });
  }, []);

  const sendPosition = useCallback(async (
    orderId: string,
    lat: number,
    lng: number,
    heading: number | null,
    accuracy: number | null
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('upsert_delivery_tracking', {
        p_order_id: orderId,
        p_driver_id: user.id,
        p_lat: lat,
        p_lng: lng,
        p_heading: heading,
        p_accuracy: accuracy,
      });

      if (error) {
        console.error('[Tracking] RPC error:', error);
        return;
      }

      const result = data as any;

      // If near destination, trigger push notification
      if (result?.should_notify_near) {
        triggerNearNotification(orderId);
      }

      setState(s => ({ ...s, lastPosition: { lat, lng }, lastError: null }));
    } catch (err: any) {
      console.error('[Tracking] sendPosition error:', err);
    }
  }, [user]);

  const triggerNearNotification = useCallback(async (orderId: string) => {
    try {
      // Get customer_id and order_number from the order
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id, order_number')
        .eq('id', orderId)
        .single();

      if (!order?.customer_id) return;

      await supabase.functions.invoke('send-push-notification', {
        body: {
          customer_id: order.customer_id,
          type: 'delivery_near',
          title: '¡Tu pedido está muy cerca! 📍',
          body: `Prepárate, tu repartidor llegará en minutos. Orden #${order.order_number}`,
          payload: { order_id: orderId, order_number: order.order_number }
        }
      });

      console.log('[Tracking] Near-destination notification sent');
    } catch (err) {
      console.error('[Tracking] Error sending near notification:', err);
    }
  }, []);

  const startTracking = useCallback(async (orderId: string) => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, lastError: 'Geolocalización no disponible en este navegador' }));
      return false;
    }

    // Check/request permission
    if (state.permissionState !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        setState(s => ({ ...s, lastError: 'Permiso de ubicación denegado' }));
        return false;
      }
    }

    // Stop any previous tracking
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    activeOrderIdRef.current = orderId;
    lastSentRef.current = null;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, accuracy } = position.coords;
        const now = Date.now();
        const last = lastSentRef.current;

        // Throttle: only send if moved >= 20m or >= 15s elapsed
        if (last) {
          const dist = haversineDistance(last.lat, last.lng, latitude, longitude);
          const elapsed = now - last.time;
          if (dist < MIN_DISPLACEMENT_M && elapsed < MIN_INTERVAL_MS) return;
        }

        lastSentRef.current = { lat: latitude, lng: longitude, time: now };
        sendPosition(orderId, latitude, longitude, heading, accuracy);
      },
      (error) => {
        console.error('[Tracking] watchPosition error:', error);
        let msg = 'Error de ubicación';
        if (error.code === 1) msg = 'Permiso de ubicación denegado';
        else if (error.code === 2) msg = 'No se pudo obtener la ubicación';
        else if (error.code === 3) msg = 'Tiempo de espera agotado';
        setState(s => ({ ...s, lastError: msg }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 30000,
      }
    );

    watchIdRef.current = watchId;
    setState(s => ({ ...s, isTracking: true, lastError: null }));
    return true;
  }, [state.permissionState, requestPermission, sendPosition]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (activeOrderIdRef.current) {
      try {
        await supabase.rpc('stop_delivery_tracking', {
          p_order_id: activeOrderIdRef.current,
        });
      } catch (err) {
        console.error('[Tracking] Error stopping tracking:', err);
      }
      activeOrderIdRef.current = null;
    }

    setState(s => ({ ...s, isTracking: false, lastPosition: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    checkPermission,
    requestPermission,
  };
};
