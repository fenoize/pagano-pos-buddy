import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CashSession, CashMovement } from '@/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePermissions } from './usePermissions';
import { setStaffContext, withStaffContext } from '@/lib/dbContext';
import { 
  triggerCashSessionOpenNotification, 
  triggerCashSessionCloseNotification,
  triggerCashMovementNotification 
} from '@/lib/staffNotificationTriggers';

export function useCashSession() {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();

  // Usar hook de permisos centralizado
  const { canManageOwnCashSession, canManageCashSessions } = usePermissions();
  const canManageCashSession = canManageOwnCashSession || canManageCashSessions;

  useEffect(() => {
    if (user?.id) {
      checkActiveSession();
    }
  }, [user?.id]);

  const checkActiveSession = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Establecer contexto antes de la query
      await setStaffContext(user.id);
      
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

  const openSession = async (openingCash: number, acceptAppOrders: boolean = false): Promise<CashSession> => {
    if (!user?.id) throw new Error('User not authenticated');

    return withStaffContext(user.id, async () => {
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
            opening_cash: openingCash,
            accept_app_orders: acceptAppOrders
          })
          .select()
          .single();

        if (error) throw error;

        setCurrentSession(data);

        // Notificar a administradores sobre apertura de turno
        triggerCashSessionOpenNotification(
          user.full_name || user.username || 'Usuario',
          openingCash,
          data.id
        ).catch(err => console.error('[CashSession] Notification error:', err));

        return data;
      } catch (error) {
        console.error('Error opening session:', error);
        throw error;
      }
    });
  };

  const closeSession = async (closingCash: number): Promise<void> => {
    if (!currentSession) throw new Error('No active session to close');
    if (!user?.id) throw new Error('User not authenticated');

    return withStaffContext(user.id, async () => {
      try {
        console.log('🔒 Cerrando sesión:', {
          sessionId: currentSession.id,
          closingCash,
          userId: user.id
        });
        
        const { data, error } = await supabase
          .from('cash_sessions')
          .update({
            closed_at: new Date().toISOString(),
            closing_cash: closingCash
          })
          .eq('id', currentSession.id)
          .select();

        if (error) {
          console.error('❌ Error de Supabase al cerrar sesión:', error);
          throw new Error(`Error al cerrar sesión: ${error.message}`);
        }

        // Verificar que se actualizó la sesión
        if (!data || data.length === 0) {
          console.error('❌ No se encontró la sesión para actualizar');
          throw new Error('No se pudo actualizar la sesión. Verifica que exista y tengas permisos.');
        }

        console.log('✅ Sesión cerrada exitosamente:', data[0]);

        // Get session summary for notification
        const summary = await getSessionSummary(currentSession.id);
        const totalSales = summary?.summary?.totalSales || 0;

        // Notificar a administradores sobre cierre de turno
        triggerCashSessionCloseNotification(
          user.full_name || user.username || 'Usuario',
          closingCash,
          totalSales,
          currentSession.id
        ).catch(err => console.error('[CashSession] Notification error:', err));

        setCurrentSession(null);
      } catch (error) {
        console.error('❌ Error closing session:', error);
        throw error;
      }
    });
  };

  const addCashMovement = async (
    type: 'ingreso' | 'egreso',
    amount: number,
    note?: string,
    category?: string,
    accountId?: string,
    syncToFinance: boolean = true
  ): Promise<CashMovement> => {
    if (!currentSession) throw new Error('No active session');
    if (!user?.id) throw new Error('User not authenticated');

    try {
      // Usar RPC que establece contexto y hace insert en la misma transacción
      const { data, error } = await supabase.rpc('insert_cash_movement_with_context', {
        p_user_id: user.id,
        p_session_id: currentSession.id,
        p_type: type,
        p_amount: amount,
        p_note: note || null,
        p_category: category || null,
        p_account_id: accountId || null,
        p_synced_to_finance: type === 'egreso' && syncToFinance
      });

      if (error) throw error;

      const movementData = data as unknown as CashMovement;

      // Si es un egreso y tiene cuenta asignada, sincronizar con finance_expenses
      if (type === 'egreso' && syncToFinance && accountId) {
        const { error: financeError } = await supabase
          .from('finance_expenses')
          .insert({
            expense_date: new Date().toISOString().split('T')[0],
            account_id: accountId,
            amount: amount,
            expense_type: 'Variable',
            category: category || 'Caja - Movimiento de Turno',
            notes: note || null,
            payment_method: 'Efectivo',
            cash_movement_id: movementData.id,
            cash_session_id: currentSession.id
          });

        if (financeError) {
          console.error('Error syncing to finance_expenses:', financeError);
          // No lanzar error, el movimiento de caja ya se registró
        }
      }

      // Notificar a administradores sobre movimiento de caja
      triggerCashMovementNotification(
        user.full_name || user.username || 'Usuario',
        type,
        amount,
        note
      ).catch(err => console.error('[CashSession] Notification error:', err));

      return movementData;
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
      // Establecer contexto antes de las queries
      if (user?.id) {
        await setStaffContext(user.id);
      }
      
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
      .eq('status', 'Entregado')
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

      // Calculate runas amount using redemption value
      let totalRunasAmount = 0;
      let ventasConRunas = 0;

      if (runasTransactions && runasTransactions.length > 0) {
        // Get runa reward value (valor de canje) from config
        const { data: rewardConfig } = await supabase
          .from('config')
          .select('value')
          .eq('key', 'runa_reward_value')
          .maybeSingle();
        
        const runaRewardValue = rewardConfig?.value ? Number(rewardConfig.value) : 600;

        // Sum redemptions (negative impact on revenue)
        // Usar el valor de CANJE para calcular el monto monetario
        const runasRedeemed = runasTransactions
          .filter(t => t.type === 'canje')
          .reduce((sum, t) => sum + Math.abs(t.runas), 0);

        totalRunasAmount = runasRedeemed * runaRewardValue;
        ventasConRunas = orders?.filter(order => (order.payment_runas || 0) > 0).length || 0;
      }

      // Adjust total sales to exclude runas value (real money sales only)
      const totalSalesReal = totalSales - totalRunasAmount;

      const ingresos = movements?.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0) || 0;
      const egresos = movements?.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0) || 0;

      // Get pending cash from delivery drivers
      const { data: pendingCashData } = await supabase
        .from('delivery_cash_pending')
        .select('amount, delivery_person_id, collected_at')
        .eq('status', 'pendiente');

      const totalCashDeliveryPending = pendingCashData?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const deliveryPersonsWithPending = new Set(pendingCashData?.map(p => p.delivery_person_id) || []).size;

      // Get deposited cash during this session with details
      const { data: depositedCashData } = await supabase
        .from('delivery_cash_pending')
        .select('amount, collected_at, deposited_at')
        .eq('status', 'depositado')
        .eq('deposited_to_session_id', sessionToQuery);

      const totalCashDeliveryDeposited = depositedCashData?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Calculate how much deposited cash came from other shifts (collected before session opened)
      const sessionOpenedAt = new Date(session.opened_at);
      sessionOpenedAt.setHours(0, 0, 0, 0); // Start of day when session opened
      
      let deliveryCashFromOtherShifts = 0;
      let deliveryCashFromThisShift = 0;
      
      depositedCashData?.forEach(item => {
        const collectedAt = new Date(item.collected_at);
        collectedAt.setHours(0, 0, 0, 0);
        
        if (collectedAt < sessionOpenedAt) {
          deliveryCashFromOtherShifts += item.amount;
        } else {
          deliveryCashFromThisShift += item.amount;
        }
      });

      // expectedCash now excludes delivery cash that hasn't been deposited
      const expectedCash = (session.opening_cash || 0) + totalCash + ingresos - egresos - totalCashDeliveryPending;

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
          totalRunasAmount,
          totalRunasQuantity: Math.abs(totalRunasCanjeadas),
          ventasConRunas,
          ingresos,
          egresos,
          expectedCash,
          difference: session.closing_cash ? session.closing_cash - expectedCash : 0,
          totalRunasCanjeadas,
          totalRunasAcumuladas,
          totalCashDeliveryPending,
          totalCashDeliveryDeposited,
          deliveryPersonsWithPending,
          deliveryCashFromOtherShifts,
          deliveryCashFromThisShift
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
    if (!user?.id) throw new Error('User not authenticated');

    return withStaffContext(user.id, async () => {
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
    });
  };

  const updateClosingCash = async (sessionId: string, closingCash: number): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    return withStaffContext(user.id, async () => {
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
    });
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

  const updateCashMovement = async (
    movementId: string,
    type: 'ingreso' | 'egreso',
    amount: number,
    note?: string
  ): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    return withStaffContext(user.id, async () => {
      try {
        const { error } = await supabase
          .from('cash_movements')
          .update({
            type,
            amount,
            note
          })
          .eq('id', movementId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating cash movement:', error);
        throw error;
      }
    });
  };

  const deleteCashMovement = async (movementId: string): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

    return withStaffContext(user.id, async () => {
      try {
        const { error } = await supabase
          .from('cash_movements')
          .delete()
          .eq('id', movementId);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting cash movement:', error);
        throw error;
      }
    });
  };

  const addCashMovementToClosedSession = async (
    sessionId: string,
    type: 'ingreso' | 'egreso',
    amount: number,
    note?: string
  ): Promise<CashMovement> => {
    if (!user?.id) throw new Error('User not authenticated');

    return withStaffContext(user.id, async () => {
      try {
        const { data, error } = await supabase
          .from('cash_movements')
          .insert({
            session_id: sessionId,
            type,
            amount,
            note
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error adding cash movement to closed session:', error);
        throw error;
      }
    });
  };

  const updateCurrentSessionLocally = (updates: Partial<CashSession>) => {
    if (currentSession) {
      setCurrentSession({ ...currentSession, ...updates });
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
    logSessionAudit,
    updateCashMovement,
    deleteCashMovement,
    addCashMovementToClosedSession,
    updateCurrentSessionLocally
  };
}