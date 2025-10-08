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
    if (!sessionToQuery) {
      console.log('No session ID provided');
      return null;
    }

    console.log('Getting session summary for ID:', sessionToQuery);

    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('id', sessionToQuery)
        .single();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      console.log('Session found:', session);

      // Get cash movements
      const { data: movements, error: movementsError } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', sessionToQuery)
        .order('created_at');

      if (movementsError) {
        console.error('Movements error:', movementsError);
        throw movementsError;
      }

      console.log('Movements found:', movements?.length || 0);

      // Get orders from this session - Remove user filter and status filter for now
      const sessionStart = session.opened_at;
      const sessionEnd = session.closed_at || new Date().toISOString();

      console.log('Looking for orders between:', sessionStart, 'and', sessionEnd);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            name,
            nombres,
            apellidos
          )
        `)
        .gte('created_at', sessionStart)
        .lte('created_at', sessionEnd)
        .order('created_at');

      if (ordersError) {
        console.error('Orders error:', ordersError);
        throw ordersError;
      }

      console.log('Orders found:', orders?.length || 0);

      // Get runas transactions for this session
      const { data: runasTransactions, error: runasError } = await supabase
        .from('runas_transactions')
        .select('*')
        .gte('created_at', sessionStart)
        .lte('created_at', sessionEnd)
        .order('created_at');

      if (runasError) {
        console.error('Runas error:', runasError);
        throw runasError;
      }

      console.log('Runas transactions found:', runasTransactions?.length || 0);

      // Get runa value from config
      const { data: runaConfig } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'runa_value')
        .maybeSingle();
      
      const runaValue = runaConfig?.value || 1000;

      // Calculate totals
      const totalSales = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
      const totalCash = orders?.reduce((sum, order) => sum + (order.payment_efectivo || 0), 0) || 0;
      const totalMP = orders?.reduce((sum, order) => sum + (order.payment_mp || 0), 0) || 0;
      const totalPOS = orders?.reduce((sum, order) => sum + (order.payment_pos || 0), 0) || 0;
      const totalAplicacion = orders?.reduce((sum, order) => sum + (order.payment_aplicacion || 0), 0) || 0;

      // Calculate runas from orders
      const totalRunasQuantity = orders?.reduce((sum, order) => sum + (order.payment_runas || 0), 0) || 0;
      const runaValueNumber = Number(runaConfig?.value || 1000);
      const totalRunasAmount = totalRunasQuantity * runaValueNumber;
      const ventasConRunas = orders?.filter(order => (order.payment_runas || 0) > 0).length || 0;

      // Adjust total sales to exclude runas value (real money sales only)
      const totalSalesReal = totalSales - totalRunasAmount;

      const ingresos = movements?.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0) || 0;
      const egresos = movements?.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0) || 0;

      const expectedCash = (session.opening_cash || 0) + totalCash + ingresos - egresos;

      // Calculate runas totals from transactions (for reference)
      const totalRunasCanjeadas = runasTransactions?.filter(t => t.type === 'canje').reduce((sum, t) => sum + t.runas, 0) || 0;
      const totalRunasAcumuladas = runasTransactions?.filter(t => t.type === 'acumulacion').reduce((sum, t) => sum + t.runas, 0) || 0;

      const result = {
        session,
        movements: movements || [],
        orders: orders || [],
        runasTransactions: runasTransactions || [],
        summary: {
          totalSales,
          totalSalesReal,
          totalCash,
          totalMP,
          totalPOS,
          totalAplicacion,
          totalRunasQuantity,
          totalRunasAmount,
          ventasConRunas,
          ingresos,
          egresos,
          expectedCash,
          difference: session.closing_cash ? session.closing_cash - expectedCash : 0,
          totalRunasCanjeadas,
          totalRunasAcumuladas
        }
      };

      console.log('Session summary result:', result);
      return result;
    } catch (error) {
      console.error('Error getting session summary:', error);
      return null;
    }
  };

  const updateSessionObservaciones = async (sessionId: string, observaciones: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({ observaciones })
        .eq('id', sessionId);

      if (error) throw error;

      // Update current session if it's the same
      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...currentSession, observaciones });
      }
    } catch (error) {
      console.error('Error updating session observaciones:', error);
      throw error;
    }
  };

  const updateClosingCash = async (sessionId: string, closingCash: number): Promise<void> => {
    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({ closing_cash: closingCash })
        .eq('id', sessionId);

      if (error) throw error;

      // Update current session if it's the same
      if (currentSession?.id === sessionId) {
        setCurrentSession({ ...currentSession, closing_cash: closingCash });
      }
    } catch (error) {
      console.error('Error updating closing cash:', error);
      throw error;
    }
  };

  const hasActiveSession = (): boolean => {
    return !!currentSession;
  };

  const recalculateClosedSession = async (sessionId: string) => {
    try {
      const summary = await getSessionSummary(sessionId);
      return summary;
    } catch (error) {
      console.error('Error recalculating closed session:', error);
      return null;
    }
  };

  const logSessionAudit = async (params: {
    sessionId: string;
    orderId: string;
    changedByUserId: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
    reason: string;
    oldTotals: any;
    newTotals: any;
  }) => {
    try {
      const { error } = await supabase
        .from('cash_session_audits')
        .insert({
          cash_session_id: params.sessionId,
          order_id: params.orderId,
          changed_by_user_id: params.changedByUserId,
          field_name: params.fieldName,
          old_value: params.oldValue,
          new_value: params.newValue,
          reason: params.reason,
          old_totals: params.oldTotals,
          new_totals: params.newTotals
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging session audit:', error);
      throw error;
    }
  };

  return {
    currentSession,
    loading,
    hasActiveSession,
    checkActiveSession,
    openSession,
    closeSession,
    addCashMovement,
    getSessionSummary,
    updateSessionObservaciones,
    updateClosingCash,
    recalculateClosedSession,
    logSessionAudit
  };
}