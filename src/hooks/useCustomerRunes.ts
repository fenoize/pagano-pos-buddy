import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RunasTransaction, RunaMovementType, OrigenMovimiento } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  const [runaValue, setRunaValue] = useState(2000); // Valor por defecto
  const { toast } = useToast();
  const { user } = useAuth();

  const canAdjustRunes = user?.role === 'Administrador';
  const canViewRunes = user?.role === 'Administrador' || user?.role === 'Cajero';

  // Obtener valor actual de las runas desde config
  const fetchRunaValue = async (): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'runa_value')
        .single();

      if (error) throw error;

      const value = data.value as number;
      setRunaValue(value);
      return value;
    } catch (error) {
      console.error('Error fetching runa value:', error);
      return 2000; // Valor por defecto
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

  // Obtener historial de transacciones de runas
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
      let query = supabase
        .from('runas_transactions')
        .select('*', { count: 'exact' })
        .eq('customer_id', customerId);

      // Aplicar filtros
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      if (filters.origen) {
        query = query.eq('origen', filters.origen);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Paginación y orden
      query = query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        transactions: data || [],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('Error fetching runas history:', error);
      return { transactions: [], totalCount: 0 };
    }
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

      const { data, error } = await supabase
        .from('runas_transactions')
        .insert({
          customer_id: customerId,
          type: 'acumulacion' as RunaMovementType,
          runas: runasEarned,
          amount: totalAmount,
          origen: 'POS' as OrigenMovimiento,
          referencia: orderId,
          responsable_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar cantidad_runas en customers
      const newSaldo = await calculateRunasSaldo(customerId);
      await supabase
        .from('customers')
        .update({ cantidad_runas: newSaldo })
        .eq('id', customerId);

      return data;
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

      const { data, error } = await supabase
        .from('runas_transactions')
        .insert({
          customer_id: customerId,
          type: 'canje' as RunaMovementType,
          runas: -runasUsed, // Negativo para canje
          amount: discountAmount,
          origen: 'POS' as OrigenMovimiento,
          referencia: orderId,
          responsable_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar cantidad_runas en customers
      const newSaldo = await calculateRunasSaldo(customerId);
      await supabase
        .from('customers')
        .update({ cantidad_runas: newSaldo })
        .eq('id', customerId);

      return data;
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

      // Actualizar cantidad_runas en customers
      const newSaldo = await calculateRunasSaldo(customerId);
      await supabase
        .from('customers')
        .update({ cantidad_runas: newSaldo })
        .eq('id', customerId);

      toast({
        title: "Éxito",
        description: "Ajuste de runas realizado correctamente",
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

  // Calcular runas canjeables según tabla de conversión
  const calculateRedeemableAmount = (runas: number): number => {
    // Por ahora usamos la regla inversa del valor de runas
    // 1 runa = runa_value en pesos chilenos para acumulación
    // Para canje, podríamos usar la misma regla o una diferente
    return Math.floor(runas * (runaValue / 3)); // Ejemplo: 3 runas = valor de 1 runa en acumulación
  };

  // Calcular runas que se ganarían por una compra
  const calculateEarnableRunes = (purchaseAmount: number): number => {
    return Math.floor(purchaseAmount / runaValue);
  };

  return {
    loading,
    runaValue,
    canAdjustRunes,
    canViewRunes,
    fetchRunaValue,
    calculateRunasSaldo,
    getRunasHistory,
    createAccumulationTransaction,
    createRedemptionTransaction,
    createManualAdjustment,
    calculateRedeemableAmount,
    calculateEarnableRunes
  };
}