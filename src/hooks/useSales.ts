import { useState } from 'react';
import { Order } from '@/types';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { clearStaffStorage } from '@/lib/storageKeys';

interface SalesFilters {
  date?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useSales() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchOrders = async (filters: SalesFilters = {}) => {
    setLoading(true);
    try {
      // 1. Obtener token de sesión
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // 2. Construir query params
      const params = new URLSearchParams({
        limit: (filters.limit || 100).toString(),
        offset: (filters.offset || 0).toString(),
      });

      if (filters.date) {
        params.append('date', filters.date);
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }

      // 3. Llamar Edge Function
      const response = await fetch(
        `https://lxxfhayifyiioglfbsyj.supabase.co/functions/v1/staff-list-orders?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido/expirado - forzar logout
          clearStaffStorage();
          window.location.href = '/pos/login';
          return;
        }
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      setOrders(result.data || []);
      setTotalCount(result.count || 0);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    orders,
    loading,
    totalCount,
    fetchOrders,
  };
}
