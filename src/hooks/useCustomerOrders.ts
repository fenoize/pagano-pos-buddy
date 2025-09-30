import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, FulfillmentType, PaymentMethod } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface CustomerOrderFilters {
  status?: OrderStatus;
  fulfillment?: FulfillmentType;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomerOrderStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
}

export function useCustomerOrders() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const canViewOrders = user?.role === 'Administrador' || user?.role === 'Cajero' || user?.role === 'Reparto';

  // Obtener historial de pedidos de un cliente
  const getCustomerOrders = async (
    customerId: string,
    filters: CustomerOrderFilters = {},
    page = 0,
    limit = 20
  ): Promise<{ orders: Order[], totalCount: number }> => {
    if (!canViewOrders) {
      return { orders: [], totalCount: 0 };
    }

    try {
      setLoading(true);

      let query = supabase
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
            email,
            created_at,
            updated_at
          )
        `, { count: 'exact' })
        .eq('customer_id', customerId);

      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.fulfillment) {
        query = query.eq('fulfillment', filters.fulfillment);
      }

      if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
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
        orders: data?.map(order => ({
          ...order,
          items: order.items as any
        })) as Order[] || [],
        totalCount: count || 0
      };
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      toast({
        title: "Error",
        description: "Error al cargar el historial de pedidos",
        variant: "destructive"
      });
      return { orders: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Obtener estadísticas de pedidos del cliente
  const getCustomerOrderStats = async (customerId: string): Promise<CustomerOrderStats> => {
    if (!canViewOrders) {
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
      };
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('customer_id', customerId)
        .eq('status', 'Entregado'); // Solo contar pedidos completados

      if (error) throw error;

      const orders = data || [];
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = orders.length > 0 ? 
        Math.max(...orders.map(order => new Date(order.created_at).getTime())) : undefined;

      return {
        totalOrders,
        totalSpent,
        averageOrderValue,
        lastOrderDate: lastOrderDate ? new Date(lastOrderDate).toISOString() : undefined
      };
    } catch (error) {
      console.error('Error fetching customer order stats:', error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
      };
    }
  };

  // Obtener un pedido específico con todos los detalles
  const getOrderById = async (orderId: string): Promise<Order | null> => {
    if (!canViewOrders) return null;

    try {
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
            email,
            created_at,
            updated_at,
            addresses (
              id,
              customer_id,
              alias,
              calle,
              numero,
              depto,
              comuna,
              ciudad,
              is_default,
              created_at,
              updated_at
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return {
        ...data,
        items: data.items as any
      };
    } catch (error) {
      console.error('Error fetching order by id:', error);
      return null;
    }
  };

  // Duplicar un pedido para "Reordenar"
  const reorderCustomerOrder = async (orderId: string): Promise<Order | null> => {
    if (user?.role !== 'Administrador' && user?.role !== 'Cajero') {
      toast({
        title: "Error",
        description: "No tienes permisos para reordenar",
        variant: "destructive"
      });
      return null;
    }

    try {
      const originalOrder = await getOrderById(orderId);
      if (!originalOrder) {
        toast({
          title: "Error",
          description: "No se pudo encontrar el pedido original",
          variant: "destructive"
        });
        return null;
      }

      const insertData = {
        customer_id: originalOrder.customer_id,
        fulfillment: originalOrder.fulfillment,
        delivery_address: originalOrder.delivery_address,
        delivery_number: originalOrder.delivery_number,
        delivery_comuna: originalOrder.delivery_comuna,
        delivery_distance: originalOrder.delivery_distance,
        items: originalOrder.items as any,
        subtotal: originalOrder.subtotal,
        delivery_fee: originalOrder.delivery_fee || 0,
        discount: 0,
        total: originalOrder.subtotal + (originalOrder.delivery_fee || 0),
        payment_efectivo: 0,
        payment_mp: 0,
        payment_pos: 0,
        payment_method: 'efectivo' as PaymentMethod,
        status: 'Pendiente' as OrderStatus,
        notes: `Reorden basado en pedido #${originalOrder.order_number}`,
        created_by_user_id: user?.id
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Pedido duplicado como #${data.order_number}`,
      });

      return {
        ...data,
        items: data.items as any
      } as Order;
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: "Error",
        description: "Error al duplicar el pedido",
        variant: "destructive"
      });
      return null;
    }
  };

  // Obtener pedidos recientes para sugerencias
  const getRecentCustomerOrders = async (customerId: string, limit = 5): Promise<Order[]> => {
    if (!canViewOrders) return [];

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          items,
          total,
          fulfillment,
          status,
          created_at,
          subtotal,
          delivery_fee,
          discount,
          payment_efectivo,
          payment_mp,
          payment_pos,
          payment_method,
          delivery_address,
          delivery_number,
          delivery_comuna,
          delivery_distance,
          notes,
          customer_id,
          created_by_user_id,
          updated_at
        `)
        .eq('customer_id', customerId)
        .eq('status', 'Entregado')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(order => ({
        ...order,
        items: order.items as any
      })) || [];
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  };

  return {
    loading,
    canViewOrders,
    getCustomerOrders,
    getCustomerOrderStats,
    getOrderById,
    reorderCustomerOrder,
    getRecentCustomerOrders
  };
}