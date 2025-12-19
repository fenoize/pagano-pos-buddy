import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { setStaffContext } from '@/lib/dbContext';

export interface DeliveryCashHistoryItem {
  id: string;
  delivery_person_id: string;
  order_id: string;
  amount: number;
  status: 'pendiente' | 'depositado' | 'ajustado';
  collected_at: string;
  deposited_at: string | null;
  deposited_to_session_id: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  delivery_person_name?: string;
  order_number?: number;
  session_user_name?: string;
}

export interface DeliveryCashHistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  deliveryPersonId?: string;
  status?: 'pendiente' | 'depositado' | 'ajustado' | 'all';
  sessionId?: string;
}

interface DeliveryCashRecord {
  id: string;
  delivery_person_id: string;
  order_id: string;
  amount: number;
  status: string;
  collected_at: string;
  deposited_at: string | null;
  deposited_to_session_id: string | null;
  notes: string | null;
  created_at: string | null;
}

interface UserRecord {
  id: string;
  full_name: string | null;
  username: string;
}

interface OrderRecord {
  id: string;
  order_number: number;
}

interface SessionRecord {
  id: string;
  user_id: string;
}

export function useDeliveryCashHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<DeliveryCashHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryPersons, setDeliveryPersons] = useState<{ id: string; name: string }[]>([]);

  const fetchHistory = useCallback(async (filterParams?: DeliveryCashHistoryFilters) => {
    if (!user?.id) return;

    const filters = filterParams || {};

    try {
      setLoading(true);
      await setStaffContext(user.id);

      // Build match object for simple equality filters
      const matchObj: Record<string, string> = {};
      
      if (filters.status && filters.status !== 'all') {
        matchObj['status'] = filters.status;
      }
      
      if (filters.deliveryPersonId) {
        matchObj['delivery_person_id'] = filters.deliveryPersonId;
      }
      
      if (filters.sessionId) {
        matchObj['deposited_to_session_id'] = filters.sessionId;
      }

      // Execute query with match for equality filters
      const query = supabase
        .from('delivery_cash_pending')
        .select('*')
        .match(matchObj)
        .order('collected_at', { ascending: false });

      // Cast to avoid deep type instantiation
      const result = await query as unknown as { data: DeliveryCashRecord[] | null; error: Error | null };
      
      if (result.error) throw result.error;

      let historyData = result.data || [];

      // Apply date filters in JS (simpler than chained queries)
      if (filters.dateFrom) {
        const fromDate = new Date(`${filters.dateFrom}T00:00:00`);
        historyData = historyData.filter(h => new Date(h.collected_at) >= fromDate);
      }
      
      if (filters.dateTo) {
        const toDate = new Date(`${filters.dateTo}T23:59:59`);
        historyData = historyData.filter(h => new Date(h.collected_at) <= toDate);
      }

      // Get unique IDs for joins
      const deliveryPersonIds = [...new Set(historyData.map(h => h.delivery_person_id))];
      const orderIds = [...new Set(historyData.map(h => h.order_id))];
      const sessionIds = [...new Set(historyData.filter(h => h.deposited_to_session_id).map(h => h.deposited_to_session_id!))];

      // Fetch related data
      const usersPromise = deliveryPersonIds.length > 0
        ? supabase.from('users').select('id, full_name, username').in('id', deliveryPersonIds)
        : Promise.resolve({ data: [] as UserRecord[] });
        
      const ordersPromise = orderIds.length > 0
        ? supabase.from('orders').select('id, order_number').in('id', orderIds)
        : Promise.resolve({ data: [] as OrderRecord[] });
        
      const sessionsPromise = sessionIds.length > 0
        ? supabase.from('cash_sessions').select('id, user_id').in('id', sessionIds)
        : Promise.resolve({ data: [] as SessionRecord[] });

      const [usersResult, ordersResult, sessionsResult] = await Promise.all([
        usersPromise,
        ordersPromise,
        sessionsPromise
      ]);

      // Create lookup maps
      const usersData = (usersResult.data || []) as UserRecord[];
      const ordersData = (ordersResult.data || []) as OrderRecord[];
      const sessionsData = (sessionsResult.data || []) as SessionRecord[];
      
      const usersMap = new Map(usersData.map(u => [u.id, u.full_name || u.username]));
      const ordersMap = new Map(ordersData.map(o => [o.id, o.order_number]));
      
      // Get session user names
      const sessionUserIds = [...new Set(sessionsData.map(s => s.user_id))];
      
      let sessionUsersMap = new Map<string, string>();
      if (sessionUserIds.length > 0) {
        const sessionUsersResult = await supabase.from('users').select('id, full_name, username').in('id', sessionUserIds);
        const sessionUsers = (sessionUsersResult.data || []) as UserRecord[];
        sessionUsersMap = new Map(sessionUsers.map(u => [u.id, u.full_name || u.username]));
      }
      
      const sessionsMap = new Map(sessionsData.map(s => [s.id, sessionUsersMap.get(s.user_id) || 'Desconocido']));

      // Enrich history data
      const enrichedHistory: DeliveryCashHistoryItem[] = historyData.map(item => ({
        id: item.id,
        delivery_person_id: item.delivery_person_id,
        order_id: item.order_id,
        amount: item.amount,
        status: item.status as 'pendiente' | 'depositado' | 'ajustado',
        collected_at: item.collected_at,
        deposited_at: item.deposited_at,
        deposited_to_session_id: item.deposited_to_session_id,
        notes: item.notes,
        created_at: item.created_at || item.collected_at,
        delivery_person_name: usersMap.get(item.delivery_person_id) || 'Desconocido',
        order_number: ordersMap.get(item.order_id),
        session_user_name: item.deposited_to_session_id ? sessionsMap.get(item.deposited_to_session_id) : undefined
      }));

      setHistory(enrichedHistory);
    } catch (error) {
      console.error('Error fetching delivery cash history:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchDeliveryPersons = useCallback(async () => {
    if (!user?.id) return;

    try {
      await setStaffContext(user.id);
      
      const result = await supabase
        .from('users')
        .select('id, full_name, username')
        .match({ role: 'Reparto', is_active: true })
        .order('full_name') as unknown as { data: UserRecord[] | null; error: Error | null };
      
      // Cast to avoid deep type instantiation
      const data = (result.data || []) as UserRecord[];

      setDeliveryPersons(data.map(u => ({
        id: u.id,
        name: u.full_name || u.username
      })));
    } catch (error) {
      console.error('Error fetching delivery persons:', error);
    }
  }, [user?.id]);

  const exportToCSV = useCallback(() => {
    if (history.length === 0) return;

    const headers = ['Fecha Cobro', 'Repartidor', 'Pedido', 'Monto', 'Estado', 'Fecha Depósito', 'Recibido por', 'Notas'];
    const rows = history.map(item => [
      new Date(item.collected_at).toLocaleString('es-CL'),
      item.delivery_person_name || '',
      item.order_number ? `#${item.order_number}` : '',
      item.amount.toString(),
      item.status === 'pendiente' ? 'Pendiente' : item.status === 'depositado' ? 'Depositado' : 'Ajustado',
      item.deposited_at ? new Date(item.deposited_at).toLocaleString('es-CL') : '',
      item.session_user_name || '',
      item.notes || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `efectivo-delivery-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [history]);

  const getStats = useCallback(() => {
    const totalPending = history.filter(h => h.status === 'pendiente').reduce((sum, h) => sum + h.amount, 0);
    const totalDeposited = history.filter(h => h.status === 'depositado').reduce((sum, h) => sum + h.amount, 0);
    const pendingCount = history.filter(h => h.status === 'pendiente').length;
    const depositedCount = history.filter(h => h.status === 'depositado').length;

    return { totalPending, totalDeposited, pendingCount, depositedCount };
  }, [history]);

  return {
    history,
    loading,
    deliveryPersons,
    fetchHistory,
    fetchDeliveryPersons,
    exportToCSV,
    getStats
  };
}
