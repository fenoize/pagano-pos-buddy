import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';

const HISTORY_KEY = 'kds_delivered_orders';
const HISTORY_TTL = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

interface HistoryEntry {
  orderId: string;
  timestamp: number;
}

/**
 * Hook para manejar el historial de órdenes entregadas/canceladas
 * Usa localStorage para persistir entre recargas de página
 */
export function useKDSHistory() {
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /**
   * Obtiene el historial del localStorage
   */
  const getHistory = (): HistoryEntry[] => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('[KDS History] Error reading history:', error);
      return [];
    }
  };

  /**
   * Guarda el historial en localStorage
   */
  const saveHistory = (history: HistoryEntry[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('[KDS History] Error saving history:', error);
    }
  };

  /**
   * Limpia entradas antiguas (>24h)
   */
  const cleanOldHistory = () => {
    const history = getHistory();
    const now = Date.now();
    const cleaned = history.filter(entry => now - entry.timestamp < HISTORY_TTL);
    
    if (cleaned.length !== history.length) {
      console.log(`[KDS History] Cleaned ${history.length - cleaned.length} old entries`);
      saveHistory(cleaned);
    }
    
    return cleaned;
  };

  /**
   * Agrega una orden al historial
   */
  const addToHistory = (orderId: string) => {
    const history = cleanOldHistory();
    
    // No duplicar
    if (history.some(entry => entry.orderId === orderId)) {
      return;
    }
    
    const newEntry: HistoryEntry = {
      orderId,
      timestamp: Date.now()
    };
    
    history.push(newEntry);
    saveHistory(history);
    console.log(`[KDS History] Added order ${orderId} to history`);
  };

  /**
   * Verifica si una orden está en el historial
   */
  const isInHistory = (orderId: string): boolean => {
    const history = getHistory();
    return history.some(entry => entry.orderId === orderId);
  };

  /**
   * Obtiene las órdenes completas del historial desde la BD
   */
  const fetchHistoryOrders = async (hours: number = 24) => {
    setLoadingHistory(true);
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (
            id,
            nombres,
            apellidos,
            name,
            apellido,
            phone,
            rut,
            email
          )
        `)
        .in('status', ['Entregado', 'Cancelado'])
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithItems = (data || []).map(order => ({
        ...order,
        items: order.items as any,
        customer: order.customer ? {
          ...order.customer,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } : undefined
      })) as Order[];

      setHistoryOrders(ordersWithItems);
      return ordersWithItems;
    } catch (error) {
      console.error('[KDS History] Error fetching history orders:', error);
      return [];
    } finally {
      setLoadingHistory(false);
    }
  };

  /**
   * Re-abre una orden (cambia estado a Pendiente)
   */
  const reopenOrder = async (orderId: string) => {
    try {
      // Obtener usuario actual para contexto
      const storedUser = localStorage.getItem('paganos_staff_user');
      if (!storedUser) {
        throw new Error('No hay usuario autenticado');
      }
      
      const currentUser = JSON.parse(storedUser);
      if (!currentUser?.id) {
        throw new Error('Usuario sin ID válido');
      }
      
      // Establecer contexto de staff
      const { error: contextError } = await supabase.rpc('set_staff_context', {
        p_user_id: currentUser.id
      });
      
      if (contextError) throw contextError;
      
      // Actualizar estado
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'Pendiente',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Remover del historial local
      const history = getHistory();
      const updated = history.filter(entry => entry.orderId !== orderId);
      saveHistory(updated);

      console.log(`[KDS History] Order ${orderId} reopened`);
      return true;
    } catch (error) {
      console.error('[KDS History] Error reopening order:', error);
      return false;
    }
  };

  /**
   * Limpia el historial completo
   */
  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistoryOrders([]);
    console.log('[KDS History] History cleared');
  };

  // Auto-limpiar al montar
  useEffect(() => {
    cleanOldHistory();
  }, []);

  return {
    addToHistory,
    isInHistory,
    fetchHistoryOrders,
    reopenOrder,
    clearHistory,
    historyOrders,
    loadingHistory,
    cleanOldHistory
  };
}
