import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CashSession, CashMovement } from '@/types';
import { useAuthContext } from '@/contexts/AuthContext';

export function useCashSession() {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();

  useEffect(() => {
    if (user?.id) {
      checkActiveSession();
    }
  }, [user?.id]);

  const checkActiveSession = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('closed_at', null)
        .order('opened_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      setCurrentSession(data || null);
    } catch (error) {
      console.error('Error checking active session:', error);
    } finally {
      setLoading(false);
    }
  };

  const openSession = async (openingCash: number): Promise<CashSession> => {
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Check if there's already an active session
      const { data: existingSession } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('closed_at', null)
        .single();

      if (existingSession) {
        throw new Error('Ya existe una sesión de caja abierta');
      }

      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          user_id: user.id,
          opening_cash: openingCash
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      return data;
    } catch (error) {
      console.error('Error opening session:', error);
      throw error;
    }
  };

  const closeSession = async (closingCash: number): Promise<void> => {
    if (!currentSession) throw new Error('No active session to close');

    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_cash: closingCash
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
    } catch (error) {
      console.error('Error closing session:', error);
      throw error;
    }
  };

  const addCashMovement = async (
    type: 'ingreso' | 'egreso',
    amount: number,
    note?: string
  ): Promise<CashMovement> => {
    if (!currentSession) throw new Error('No active session');

    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .insert({
          session_id: currentSession.id,
          type,
          amount,
          note
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding cash movement:', error);
      throw error;
    }
  };

  const getSessionSummary = async (sessionId?: string) => {
    const sessionToQuery = sessionId || currentSession?.id;
    if (!sessionToQuery) return null;

    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('id', sessionToQuery)
        .single();

      if (sessionError) throw sessionError;

      // Get cash movements
      const { data: movements, error: movementsError } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', sessionToQuery)
        .order('created_at');

      if (movementsError) throw movementsError;

      // Get orders from this session
      const sessionStart = session.opened_at;
      const sessionEnd = session.closed_at || new Date().toISOString();

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('created_by_user_id', user?.id)
        .gte('created_at', sessionStart)
        .lte('created_at', sessionEnd)
        .eq('status', 'Entregado');

      if (ordersError) throw ordersError;

      // Calculate totals
      const totalSales = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const totalCash = orders?.reduce((sum, order) => sum + order.payment_efectivo, 0) || 0;
      const totalMP = orders?.reduce((sum, order) => sum + order.payment_mp, 0) || 0;
      const totalPOS = orders?.reduce((sum, order) => sum + order.payment_pos, 0) || 0;

      const ingresos = movements?.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0) || 0;
      const egresos = movements?.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0) || 0;

      const expectedCash = session.opening_cash + totalCash + ingresos - egresos;

      return {
        session,
        movements: movements || [],
        orders: orders || [],
        summary: {
          totalSales,
          totalCash,
          totalMP,
          totalPOS,
          ingresos,
          egresos,
          expectedCash,
          difference: session.closing_cash ? session.closing_cash - expectedCash : 0
        }
      };
    } catch (error) {
      console.error('Error getting session summary:', error);
      throw error;
    }
  };

  const hasActiveSession = (): boolean => {
    return !!currentSession;
  };

  return {
    currentSession,
    loading,
    hasActiveSession,
    checkActiveSession,
    openSession,
    closeSession,
    addCashMovement,
    getSessionSummary
  };
}