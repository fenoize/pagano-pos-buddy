import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order, OrderStatus } from '@/types';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

export interface DeliveryHistoryFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: OrderStatus;
  courierId?: string; // Solo para admin
}

export interface DeliveryHistoryOrder extends Omit<Order, 'customer'> {
  customer_name?: string;
  customer?: { name: string };
}

export const useDeliveryHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<DeliveryHistoryOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<DeliveryHistoryFilters>({
    dateFrom: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Última semana por defecto
    dateTo: format(new Date(), 'yyyy-MM-dd')
  });

  const isAdmin = user?.role === 'Administrador';

  const fetchHistory = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name)
        `)
        .eq('fulfillment', 'delivery');

      // Filtrar por repartidor si no es admin
      if (!isAdmin) {
        query = query.eq('delivery_person_id', user.id);
      } else if (filters.courierId) {
        query = query.eq('delivery_person_id', filters.courierId);
      }

      // Filtros de fecha
      if (filters.dateFrom) {
        query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
      }

      // Filtro de estado
      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
        // Por defecto mostrar todos los estados relevantes de delivery
        query = query.in('status', ['Listo', 'En camino', 'Entregado']);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const ordersWithNames: DeliveryHistoryOrder[] = (data || []).map(order => ({
        ...order,
        items: order.items as any,
        customer_name: order.customer?.name,
        payment_runas: order.payment_runas || 0
      }));

      setOrders(ordersWithNames);
    } catch (error: any) {
      console.error('Error fetching delivery history:', error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, filters]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const totals = {
    count: orders.length,
    totalDeliveryFees: orders.reduce((sum, order) => sum + (order.delivery_fee || 0), 0)
  };

  return {
    orders,
    loading,
    filters,
    setFilters,
    totals,
    isAdmin,
    refetch: fetchHistory
  };
};
