import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { setStaffContext } from '@/lib/dbContext';
import { getNonRealSaleMethods, getOrderRealRevenue } from '@/lib/paymentMethodUtils';

interface ActiveShift {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  openedAt: string;
  openingCash: number;
  acceptAppOrders: boolean;
  totalSales: number;
  salesCount: number;
}

export function useAllActiveShifts() {
  const [shifts, setShifts] = useState<ActiveShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  const loadAllActiveShifts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      
      // Set staff context for RLS
      await setStaffContext(user.id);

      // Get all active cash sessions (where closed_at is null)
      const { data: sessions, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .is('closed_at', null)
        .order('opened_at', { ascending: false });

      if (sessionError) {
        console.error('Error loading active sessions:', sessionError);
        throw sessionError;
      }

      if (!sessions || sessions.length === 0) {
        setShifts([]);
        setLoading(false);
        return;
      }

      // Get user info for each session
      const userIds = [...new Set(sessions.map(s => s.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, username, full_name, role')
        .in('id', userIds);

      if (usersError) {
        console.error('Error loading users:', usersError);
      }

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Get non-real payment methods
      const nonRealMethods = await getNonRealSaleMethods();

      // Get orders for each session - prioritize by cash_session_id, fallback to created_by_user_id
      const shiftsWithStats = await Promise.all(
        sessions.map(async (session) => {
          // Query 1: orders explicitly linked to this cash session (no time filter needed)
          const { data: linkedOrders } = await supabase
            .from('orders')
            .select('id, total, status, payment_method, payment_runas')
            .eq('cash_session_id', session.id)
            .eq('status', 'Entregado');

          // Query 2: orders without cash_session_id, created by the same user during the session
          const { data: fallbackOrders } = await supabase
            .from('orders')
            .select('id, total, status, payment_method, payment_runas')
            .is('cash_session_id', null)
            .eq('created_by_user_id', session.user_id)
            .gte('created_at', session.opened_at)
            .eq('status', 'Entregado');

          // Merge and deduplicate
          const allOrders = [...(linkedOrders || []), ...(fallbackOrders || [])];
          const seen = new Set<string>();
          const completedOrders = allOrders.filter(o => {
            if (seen.has(o.id)) return false;
            seen.add(o.id);
            return true;
          });

          const user = userMap.get(session.user_id);
          
          // Only count real revenue (exclude non-real payment methods)
          const realOrders = completedOrders.filter(o => getOrderRealRevenue(o, nonRealMethods) > 0);
          const totalSales = realOrders.reduce((sum, o) => sum + getOrderRealRevenue(o, nonRealMethods), 0);

          return {
            id: session.id,
            userId: session.user_id,
            userName: user?.full_name || user?.username || 'Usuario desconocido',
            userRole: user?.role || 'Sin rol',
            openedAt: session.opened_at || '',
            openingCash: session.opening_cash,
            acceptAppOrders: session.accept_app_orders || false,
            totalSales,
            salesCount: realOrders.length,
          };
        })
      );

      setShifts(shiftsWithStats);
    } catch (err) {
      console.error('Error loading all active shifts:', err);
      setError('No se pudieron cargar los turnos activos');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadAllActiveShifts();
  }, [loadAllActiveShifts]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllActiveShifts();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadAllActiveShifts]);

  return {
    shifts,
    loading,
    error,
    refresh: loadAllActiveShifts,
    hasActiveShifts: shifts.length > 0,
  };
}
