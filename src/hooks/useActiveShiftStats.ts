import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { OrderStatus } from '@/types';
import { getNonRealSaleMethods, getOrderRealRevenue } from '@/lib/paymentMethodUtils';

interface ActiveShiftStats {
  totalSales: number;
  salesCount: number;
  deliveryCount: number;
  sessionStart: string | null;
  sessionId: string | null;
}

// Estados que representan ventas reales (orden entregada)
const COMPLETED_STATUSES: OrderStatus[] = ['Entregado'];

export function useActiveShiftStats() {
  const [stats, setStats] = useState<ActiveShiftStats>({
    totalSales: 0,
    salesCount: 0,
    deliveryCount: 0,
    sessionStart: null,
    sessionId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  const loadActiveShiftStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);

      // Get active cash session
      const { data: sessions, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1);

      if (sessionError) {
        console.error('Error loading cash session:', sessionError);
        setStats({
          totalSales: 0,
          salesCount: 0,
          deliveryCount: 0,
          sessionStart: null,
          sessionId: null,
        });
        setLoading(false);
        return;
      }

      const activeSession = sessions?.[0];

      if (!activeSession) {
        setStats({
          totalSales: 0,
          salesCount: 0,
          deliveryCount: 0,
          sessionStart: null,
          sessionId: null,
        });
        setLoading(false);
        return;
      }

      // Get non-real payment methods
      const nonRealMethods = await getNonRealSaleMethods();

      // Get orders for this session
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, fulfillment, status, payment_runas, payment_method')
        .or(`cash_session_id.eq.${activeSession.id},and(cash_session_id.is.null,created_by_user_id.eq.${user.id})`)
        .gte('created_at', activeSession.opened_at)
        .in('status', COMPLETED_STATUSES);

      if (ordersError) {
        throw ordersError;
      }

      // Filtrar órdenes: excluir las pagadas 100% con métodos no reales
      const realSalesOrders = (orders || []).filter(order => {
        return getOrderRealRevenue(order, nonRealMethods) > 0;
      });

      // El total de ventas es el monto real pagado (sin métodos no reales)
      const totalSales = realSalesOrders.reduce((sum, order) => {
        return sum + getOrderRealRevenue(order, nonRealMethods);
      }, 0);
      
      const salesCount = realSalesOrders.length;
      const deliveryCount = realSalesOrders.filter(order => order.fulfillment === 'delivery').length;

      setStats({
        totalSales,
        salesCount,
        deliveryCount,
        sessionStart: activeSession.opened_at,
        sessionId: activeSession.id,
      });
    } catch (err) {
      console.error('Error loading active shift stats:', err);
      setError('No se pudieron cargar los datos del turno');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadActiveShiftStats();
  }, [loadActiveShiftStats]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveShiftStats();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadActiveShiftStats]);

  return {
    stats,
    loading,
    error,
    refresh: loadActiveShiftStats,
    hasActiveSession: !!stats.sessionId,
  };
}