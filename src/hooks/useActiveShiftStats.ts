import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { OrderStatus } from '@/types';

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
        // No active session
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

      // Get orders for this session - prioritize by cash_session_id, fallback to created_by_user_id
      // This ensures each shift only sees its own sales
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, fulfillment, status, payment_runas')
        .or(`cash_session_id.eq.${activeSession.id},and(cash_session_id.is.null,created_by_user_id.eq.${user.id})`)
        .gte('created_at', activeSession.opened_at)
        .in('status', COMPLETED_STATUSES);

      if (ordersError) {
        throw ordersError;
      }

      // Filtrar órdenes: excluir las que fueron pagadas 100% con runas
      const realSalesOrders = (orders || []).filter(order => {
        // Calcular el monto real de la venta (excluyendo runas)
        const runasAmount = order.payment_runas || 0;
        const realPayment = order.total - runasAmount;
        // Solo contar como venta si hay pago real (no solo runas)
        return realPayment > 0;
      });

      // El total de ventas es el monto real pagado (sin runas)
      const totalSales = realSalesOrders.reduce((sum, order) => {
        const runasAmount = order.payment_runas || 0;
        return sum + (order.total - runasAmount);
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