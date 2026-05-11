import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CashSession, CashMovement } from '@/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { getNonRealSaleMethods, getOrderRealRevenue } from '@/lib/paymentMethodUtils';
import { usePermissions } from './usePermissions';
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
      // RLS policies are now permissive - no context needed
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

  const openSession = async (
    openingCash: number,
    acceptAppOrders: boolean = false,
    branchId?: string
  ): Promise<CashSession> => {
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

      // Resolver branch_id: parámetro > localStorage > local por defecto en BD
      let resolvedBranchId = branchId
        || (typeof window !== 'undefined' ? localStorage.getItem('paganos_active_branch_id') : null);

      if (!resolvedBranchId) {
        const { data: defaultBranch } = await supabase
          .from('branches')
          .select('id')
          .eq('is_default', true)
          .maybeSingle();
        resolvedBranchId = defaultBranch?.id || null;
      }

      if (!resolvedBranchId) {
        throw new Error('No hay un local configurado. Crea un local en Configuración > Locales.');
      }

      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          user_id: user.id,
          opening_cash: openingCash,
          accept_app_orders: acceptAppOrders,
          branch_id: resolvedBranchId,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);

      // Notificar a administradores sobre apertura de turno
      triggerCashSessionOpenNotification(
        user.id,
        user.full_name || user.username || 'Usuario',
        openingCash,
        data.id
      ).catch(err => console.error('[CashSession] Notification error:', err));

      return data;
    } catch (error) {
      console.error('Error opening session:', error);
      throw error;
    }
  };

  const closeSession = async (closingCash: number, observaciones?: string): Promise<void> => {
    if (!currentSession) throw new Error('No active session to close');
    if (!user?.id) throw new Error('User not authenticated');

    try {
      console.log('🔒 Cerrando sesión:', {
        sessionId: currentSession.id,
        closingCash,
        userId: user.id,
        hasObservaciones: !!observaciones?.trim(),
      });
      
      const updatePayload: Record<string, any> = {
        closed_at: new Date().toISOString(),
        closing_cash: closingCash,
      };
      if (observaciones && observaciones.trim()) {
        // Concatenar con observaciones previas si existen
        const prev = (currentSession as any).observaciones?.trim();
        updatePayload.observaciones = prev
          ? `${prev}\n\n${observaciones.trim()}`
          : observaciones.trim();
      }

      const { data, error } = await supabase
        .from('cash_sessions')
        .update(updatePayload)
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
      const orderCount = summary?.orders?.length || 0;

      // Notificar a administradores sobre cierre de turno
      triggerCashSessionCloseNotification(
        user.id,
        user.full_name || user.username || 'Usuario',
        closingCash,
        totalSales,
        currentSession.id,
        orderCount
      ).catch(err => console.error('[CashSession] Notification error:', err));

      setCurrentSession(null);
    } catch (error) {
      console.error('❌ Error closing session:', error);
      throw error;
    }
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
      // Direct insert - RLS policies are now permissive
      const { data, error } = await supabase
        .from('cash_movements')
        .insert({
          session_id: currentSession.id,
          type,
          amount,
          note: note || null,
          category: category || null,
          account_id: accountId || null,
          synced_to_finance: type === 'egreso' && syncToFinance
        })
        .select()
        .single();

      if (error) throw error;

      // Si es un egreso, sincronizar con finance_expenses usando RPC (bypass RLS)
      if (type === 'egreso' && syncToFinance) {
        const { data: financeResult, error: financeError } = await supabase
          .rpc('sync_cash_movement_to_finance', {
            p_cash_movement_id: data.id,
            p_session_id: currentSession.id,
            p_expense_date: new Date().toISOString().split('T')[0],
            p_account_id: accountId || null,
            p_amount: amount,
            p_category: category || 'Caja - Movimiento de Turno',
            p_notes: note || null
          });

        if (financeError) {
          console.error('Error syncing to finance_expenses:', financeError);
          // No lanzar error, el movimiento de caja ya se registró
        } else {
          console.log('✅ Egreso sincronizado a finanzas:', financeResult);
        }
      }

      // Notificar a administradores sobre movimiento de caja
      triggerCashMovementNotification(
        user.id,
        user.full_name || user.username || 'Usuario',
        type,
        amount,
        note
      ).catch(err => console.error('[CashSession] Notification error:', err));

      return data;
    } catch (error) {
      console.error('Error adding cash movement:', error);
      throw error;
    }
  };

  const registerAccountTransfer = async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    note?: string
  ): Promise<string> => {
    if (!currentSession) throw new Error('No active session');
    if (!user?.id) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('register_account_transfer', {
      p_session_id: currentSession.id,
      p_from_account_id: fromAccountId,
      p_to_account_id: toAccountId,
      p_amount: amount,
      p_note: note || null,
    });

    if (error) {
      console.error('Error registering account transfer:', error);
      throw error;
    }

    triggerCashMovementNotification(
      user.id,
      user.full_name || user.username || 'Usuario',
      'egreso',
      amount,
      `Transferencia entre cuentas${note ? ': ' + note : ''}`
    ).catch(err => console.error('[CashSession] Notification error:', err));

    return data as string;
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

      // Get cash movements (incluye join con cuentas para resolver transferencias)
      const { data: movements, error: movementsError } = await supabase
        .from('cash_movements')
        .select(`
          *,
          from_account:account_id (id, type),
          to_account:account_to_id (id, type)
        `)
        .eq('session_id', sessionToQuery)
        .order('created_at');

      // Resolver la cuenta de efectivo de la sucursal del turno (caja del local)
      let registerCashAccountId: string | null = null;
      if (session.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('cash_account_id')
          .eq('id', session.branch_id)
          .maybeSingle();
        registerCashAccountId = branchData?.cash_account_id || null;
      }

      if (movementsError) {
        console.error('Movements error:', movementsError);
        throw movementsError;
      }

      console.log('Movements found:', movements?.length || 0);

      // Get orders from this session
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

      // Get non-real payment methods
      const nonRealMethods = await getNonRealSaleMethods();

      // Calculate totals - use standard utility for real revenue
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
        const runasRedeemed = runasTransactions
          .filter(t => t.type === 'canje')
          .reduce((sum, t) => sum + Math.abs(t.runas), 0);

        totalRunasAmount = runasRedeemed * runaRewardValue;
        ventasConRunas = orders?.filter(order => (order.payment_runas || 0) > 0).length || 0;
      }

      // Calculate real sales using standard utility (excludes runas, colación, canje, etc.)
      const totalSalesReal = (orders || []).reduce((sum, order) => sum + getOrderRealRevenue(order, nonRealMethods), 0);

      const ingresos = movements?.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + m.amount, 0) || 0;
      const egresos = movements?.filter(m => m.type === 'egreso').reduce((sum, m) => sum + m.amount, 0) || 0;

      // Transferencias entre cuentas: solo afectan el efectivo de la caja del local (cash_account_id del branch).
      // Si no hay branch asignado, fallback: cualquier cuenta tipo 'Efectivo'.
      const isRegisterAccount = (acc: any) =>
        registerCashAccountId
          ? acc?.id === registerCashAccountId
          : acc?.type === 'Efectivo';

      const transferenciasIn = movements
        ?.filter((m: any) => m.type === 'transferencia' && isRegisterAccount(m.to_account))
        .reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
      const transferenciasOut = movements
        ?.filter((m: any) => m.type === 'transferencia' && isRegisterAccount(m.from_account))
        .reduce((sum: number, m: any) => sum + m.amount, 0) || 0;

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

      // Calculate how much deposited cash came from other shifts
      const sessionOpenedAt = new Date(session.opened_at);
      sessionOpenedAt.setHours(0, 0, 0, 0);
      
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

      // Calculate cash from delivery orders (collected by drivers, not directly in register)
      const deliveryCashFromOrders = (orders || [])
        .filter(o => o.fulfillment === 'delivery' && (o.payment_efectivo || 0) > 0)
        .reduce((sum, o) => sum + (o.payment_efectivo || 0), 0);

      // expectedCash: totalCash includes ALL cash (retiro + delivery), but delivery cash
      // goes to the driver first, not the register. We subtract it and add back only what
      // was actually deposited (which appears as 'ingreso' movements).
      // We also subtract the delivery deposit ingresos to avoid double-counting, since
      // the deposit movements are already included in 'ingresos'.
      const cashInRegister = totalCash - deliveryCashFromOrders; // only retiro/in-store cash
      const expectedCash = (session.opening_cash || 0) + cashInRegister + ingresos - egresos + transferenciasIn - transferenciasOut;

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
    if (!user?.id) throw new Error('User not authenticated');

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

  const updateCashMovement = async (
    movementId: string,
    type: 'ingreso' | 'egreso',
    amount: number,
    note?: string
  ): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

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
  };

  const deleteCashMovement = async (movementId: string): Promise<void> => {
    if (!user?.id) throw new Error('User not authenticated');

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
  };

  const addCashMovementToClosedSession = async (
    sessionId: string,
    type: 'ingreso' | 'egreso',
    amount: number,
    note?: string
  ): Promise<CashMovement> => {
    if (!user?.id) throw new Error('User not authenticated');

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
    registerAccountTransfer,
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
