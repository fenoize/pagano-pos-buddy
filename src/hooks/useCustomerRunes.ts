import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RunasTransaction, RunaMovementType, OrigenMovimiento } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from './usePermissions';
import { triggerRunasEarnedNotification } from '@/lib/notificationTriggers';

export interface RunasAdjustmentData {
  runas: number;
  motivo: string;
}

export interface RunasTransactionFilters {
  type?: RunaMovementType;
  origen?: OrigenMovimiento;
  dateFrom?: string;
  dateTo?: string;
}

export function useCustomerRunes() {
  const [loading, setLoading] = useState(false);
  const [runaValue, setRunaValue] = useState(10000); // Monto para GANAR 1 runa
  const [runaRewardValue, setRunaRewardValue] = useState(600); // Valor de CANJE de 1 runa
  const { toast } = useToast();
  const { user } = useAuth();

  // Usar hook de permisos centralizado
  const { canAdjustRunes, canViewRunes } = usePermissions();

  // Obtener ambos valores de configuración
  const fetchRunaValue = async (): Promise<number> => {
    try {
      // Valor para acumular runas
      const { data: accumulationData, error: accError } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'runa_value')
        .single();

      if (accError) throw accError;
      const accValue = accumulationData.value as number;
      setRunaValue(accValue);

      // Valor de canje de runas
      const { data: rewardData, error: rewError } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'runa_reward_value')
        .single();

      if (rewError) throw rewError;
      const rewValue = rewardData.value as number;
      setRunaRewardValue(rewValue);

      return accValue;
    } catch (error) {
      console.error('Error fetching runa values:', error);
      return 10000; // Valor por defecto
    }
  };

  // Calcular saldo actual de runas de un cliente
  const calculateRunasSaldo = async (customerId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('runas_transactions')
        .select('runas')
        .eq('customer_id', customerId);

      if (error) throw error;

      return data?.reduce((total, transaction) => total + transaction.runas, 0) || 0;
    } catch (error) {
      console.error('Error calculating runas saldo:', error);
      return 0;
    }
  };

  // Obtener historial de transacciones de runas usando RPC para evitar problemas de RLS
  const getRunasHistory = async (
    customerId: string, 
    filters: RunasTransactionFilters = {},
    page = 0,
    limit = 50
  ): Promise<{ transactions: RunasTransaction[], totalCount: number }> => {
    if (!canViewRunes) {
      return { transactions: [], totalCount: 0 };
    }

    try {
      const { data: rpcResult, error } = await supabase.rpc('get_runas_history_with_context', {
        p_user_id: user?.id || null,
        p_customer_id: customerId,
        p_type: filters.type || null,
        p_origen: filters.origen || null,
        p_date_from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : null,
        p_date_to: filters.dateTo ? new Date(filters.dateTo).toISOString() : null,
        p_page: page,
        p_limit: limit
      });

      if (error) throw error;

      const result = rpcResult as unknown as { success: boolean; transactions?: RunasTransaction[]; total_count?: number; error?: string } | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Error desconocido');
      }

      return {
        transactions: result.transactions || [],
        totalCount: result.total_count || 0
      };
    } catch (error) {
      console.error('Error fetching runas history:', error);
      return { transactions: [], totalCount: 0 };
    }
  };

  // Helper para actualizar runas en customers con fallback
  const updateCustomerRunasBalance = async (customerId: string, newSaldo: number): Promise<boolean> => {
    // Intentar primero con RPC (más seguro para RLS)
    const { error: rpcError } = await supabase.rpc('update_customer_runas', {
      p_customer_id: customerId,
      p_cantidad_runas: newSaldo
    });

    if (rpcError) {
      console.warn('RPC update failed, trying direct update:', rpcError.message);
      // Fallback: update directo
      const { error: directError } = await supabase
        .from('customers')
        .update({ 
          cantidad_runas: newSaldo,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
      
      if (directError) {
        console.error('Direct update also failed:', directError);
        return false;
      }
    }
    return true;
  };

  // Crear movimiento de runas por acumulación (compra)
  const createAccumulationTransaction = async (
    customerId: string,
    totalAmount: number,
    orderId?: string
  ): Promise<RunasTransaction | null> => {
    try {
      const currentRunaValue = await fetchRunaValue();
      const runasEarned = Math.floor(totalAmount / currentRunaValue);

      if (runasEarned <= 0) return null;

      // Usar RPC para evitar problemas de RLS
      const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_runas_transaction_with_context', {
        p_user_id: user?.id || null,
        p_customer_id: customerId,
        p_order_id: orderId || null,
        p_type: 'acumulacion',
        p_runas: runasEarned,
        p_amount: totalAmount,
        p_origen: 'POS',
        p_motivo: null
      });

      if (rpcError) {
        console.error('RPC error creating accumulation:', rpcError);
        throw rpcError;
      }

      const result = rpcResult as { success: boolean; transaction_id?: string; new_balance?: number; error?: string } | null;
      
      if (!result?.success) {
        throw new Error(result?.error || 'Error desconocido');
      }

      // Disparar notificación push de runas ganadas (fire and forget)
      triggerRunasEarnedNotification(customerId, runasEarned)
        .catch(err => console.error('[Runas] Push notification error:', err));

      return {
        id: result.transaction_id,
        customer_id: customerId,
        type: 'acumulacion' as RunaMovementType,
        runas: runasEarned,
        amount: totalAmount
      } as RunasTransaction;
    } catch (error) {
      console.error('Error creating accumulation transaction:', error);
      return null;
    }
  };

  // Crear movimiento de canje (usar runas)
  const createRedemptionTransaction = async (
    customerId: string,
    runasUsed: number,
    discountAmount: number,
    orderId?: string
  ): Promise<RunasTransaction | null> => {
    try {
      // Verificar saldo disponible
      const currentSaldo = await calculateRunasSaldo(customerId);
      
      if (currentSaldo < runasUsed) {
        toast({
          title: "Error",
          description: "Saldo de runas insuficiente",
          variant: "destructive"
        });
        return null;
      }

      // Usar RPC para evitar problemas de RLS
      const { data: rpcResult, error: rpcError } = await supabase.rpc('insert_runas_transaction_with_context', {
        p_user_id: user?.id || null,
        p_customer_id: customerId,
        p_order_id: orderId || null,
        p_type: 'canje',
        p_runas: -runasUsed, // Negativo para canje
        p_amount: discountAmount,
        p_origen: 'POS',
        p_motivo: null
      });

      if (rpcError) {
        console.error('RPC error creating redemption:', rpcError);
        throw rpcError;
      }

      const result = rpcResult as { success: boolean; transaction_id?: string; new_balance?: number; error?: string } | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Error desconocido');
      }

      return {
        id: result.transaction_id,
        customer_id: customerId,
        type: 'canje' as RunaMovementType,
        runas: -runasUsed,
        amount: discountAmount
      } as RunasTransaction;
    } catch (error) {
      console.error('Error creating redemption transaction:', error);
      return null;
    }
  };

  // Ajuste manual de runas (solo administrador)
  const createManualAdjustment = async (
    customerId: string,
    adjustmentData: RunasAdjustmentData
  ): Promise<RunasTransaction | null> => {
    if (!canAdjustRunes) {
      toast({
        title: "Error",
        description: "Solo los administradores pueden hacer ajustes manuales",
        variant: "destructive"
      });
      return null;
    }

    if (!adjustmentData.motivo.trim()) {
      toast({
        title: "Error",
        description: "El motivo es obligatorio para ajustes manuales",
        variant: "destructive"
      });
      return null;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('runas_transactions')
        .insert({
          customer_id: customerId,
          type: 'ajuste' as RunaMovementType,
          runas: adjustmentData.runas,
          amount: 0, // Los ajustes no tienen valor monetario directo
          origen: 'Manual' as OrigenMovimiento,
          motivo: adjustmentData.motivo,
          responsable_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Recalcular y actualizar cantidad_runas en customers
      const newSaldo = await calculateRunasSaldo(customerId);
      
      // Intentar primero con RPC (más seguro para RLS)
      const { error: rpcError } = await supabase.rpc('update_customer_runas', {
        p_customer_id: customerId,
        p_cantidad_runas: newSaldo
      });

      if (rpcError) {
        console.warn('RPC update failed, trying direct update:', rpcError.message);
        // Fallback: update directo
        const { error: directError } = await supabase
          .from('customers')
          .update({ 
            cantidad_runas: newSaldo,
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId);
        
        if (directError) {
          console.error('Direct update also failed:', directError);
          // Aún así mostramos éxito porque la transacción se registró
          // El saldo se puede recalcular dinámicamente
        }
      }

      toast({
        title: "Éxito",
        description: `Ajuste de ${adjustmentData.runas > 0 ? '+' : ''}${adjustmentData.runas} runas realizado. Nuevo saldo: ${newSaldo}`,
      });

      return data;
    } catch (error) {
      console.error('Error creating manual adjustment:', error);
      toast({
        title: "Error",
        description: "Error al realizar el ajuste de runas",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Crear transacción de ajuste por edición de pedido
  const createEditAdjustmentTransaction = async (
    customerId: string,
    deltaRunas: number,
    orderId: string,
    reason: string
  ): Promise<RunasTransaction | null> => {
    try {
      const currentRunaValue = await fetchRunaValue();
      
      const { data, error } = await supabase
        .from('runas_transactions')
        .insert({
          customer_id: customerId,
          type: deltaRunas > 0 ? 'acumulacion' : 'canje',
          runas: deltaRunas,
          amount: Math.abs(deltaRunas * currentRunaValue),
          origen: 'Edición' as OrigenMovimiento,
          order_id: orderId,
          responsable_id: user?.id,
          motivo: reason
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar saldo del cliente
      const newSaldo = await calculateRunasSaldo(customerId);
      await updateCustomerRunasBalance(customerId, newSaldo);

      return data;
    } catch (error) {
      console.error('Error creating edit adjustment transaction:', error);
      return null;
    }
  };

  // Obtener saldo actual sin recalcular
  const getCustomerRunasBalance = async (customerId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('cantidad_runas')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data?.cantidad_runas || 0;
    } catch (error) {
      console.error('Error getting customer runas balance:', error);
      return 0;
    }
  };

  /**
   * Calcular el monto canjeable de runas
   * Multiplica las runas por el valor de canje (runa_reward_value)
   */
  const calculateRedeemableAmount = (runas: number): number => {
    return Math.floor(runas * runaRewardValue);
  };

  // Calcular runas que se ganarían por una compra
  const calculateEarnableRunes = (purchaseAmount: number): number => {
    return Math.floor(purchaseAmount / runaValue);
  };

  return {
    loading,
    runaValue, // Para calcular runas ganadas
    runaRewardValue, // Para calcular descuentos y mostrar valor
    canAdjustRunes,
    canViewRunes,
    fetchRunaValue,
    calculateRunasSaldo,
    getRunasHistory,
    createAccumulationTransaction,
    createRedemptionTransaction,
    createManualAdjustment,
    createEditAdjustmentTransaction,
    getCustomerRunasBalance,
    calculateRedeemableAmount,
    calculateEarnableRunes
  };
}